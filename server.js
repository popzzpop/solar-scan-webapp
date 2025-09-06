import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { fromUrl, fromArrayBuffer } from 'geotiff';
import sharp from 'sharp';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/solar/building/:lat/:lng', async (req, res) => {
  const { lat, lng } = req.params;
  const apiKey = process.env.GOOGLE_SOLAR_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Solar API key not configured' });
  }

  try {
    const response = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=LOW&key=${apiKey}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        const errorDetails = await response.text();
        console.error('Solar API 404 - Location not covered:', errorDetails);
        return res.status(404).json({ 
          error: 'Solar data not available for this location',
          details: 'This location may not be covered by Google Solar API or the building may not be recognized. Try a different address or coordinates in a major city.'
        });
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Solar API error:', error);
    res.status(500).json({ error: 'Failed to fetch solar data' });
  }
});

app.get('/api/solar/data-layers/:lat/:lng', async (req, res) => {
  const { lat, lng } = req.params;
  const apiKey = process.env.GOOGLE_SOLAR_API_KEY;
  
  const radiusMeters = req.query.radius || 100;
  const view = req.query.view || 'FULL_LAYERS';

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Solar API key not configured' });
  }

  try {
    const response = await fetch(
      `https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=${radiusMeters}&view=${view}&requiredQuality=LOW&key=${apiKey}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.error('Solar API 404 - Data layers not available for location');
        return res.status(404).json({ 
          error: 'Solar data layers not available for this location',
          details: 'This location may not be covered by Google Solar API data layers.'
        });
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Solar API error:', error);
    res.status(500).json({ error: 'Failed to fetch solar data layers' });
  }
});

app.get('/api/config', (req, res) => {
  res.json({
    googleApiKey: process.env.GOOGLE_SOLAR_API_KEY
  });
});

app.get('/api/geocode', async (req, res) => {
  const { address } = req.query;
  const apiKey = process.env.GOOGLE_SOLAR_API_KEY;

  if (!address) {
    return res.status(400).json({ error: 'Address parameter required' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Google API key not configured' });
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      res.json({
        lat: location.lat,
        lng: location.lng,
        formatted_address: data.results[0].formatted_address
      });
    } else {
      res.status(404).json({ error: 'Address not found' });
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to geocode address' });
  }
});

app.get('/api/solar/image-proxy', async (req, res) => {
  const { url, type } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    console.log(`Fetching ${type} image from:`, url);

    // Add API key to GeoTIFF URLs if not already present
    const apiKey = process.env.GOOGLE_SOLAR_API_KEY;
    let finalUrl = url;

    // Handle different types of Google Solar API URLs
    if (url.includes('solar.googleapis.com') && !url.includes('key=')) {
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}key=${apiKey}`;
      console.log(`Added API key to Google Solar API URL`);
    }

    const response = await fetch(finalUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type');
    console.log(`${type} image content type:`, contentType);

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Handle GeoTIFF files by converting them to PNG
    if (contentType === 'image/tiff' || url.includes('.tif') || type === 'flux') {
      console.log('Converting GeoTIFF to PNG...');
      try {
        const tiff = await fromArrayBuffer(imageBuffer);
        const image = await tiff.getImage();
        const width = image.getWidth();
        const height = image.getHeight();
        const samples = await image.readRasters();

        console.log(`GeoTIFF dimensions: ${width}x${height}, samples: ${image.getSamplesPerPixel()}`);

        let rgbaBuffer;
        const samplesPerPixel = image.getSamplesPerPixel();

        if (samplesPerPixel === 1) {
          // Grayscale or single-band (flux data)
          const data = samples[0];
          rgbaBuffer = Buffer.alloc(width * height * 4);
          
          // Find min and max values for better scaling
          let minVal = Math.min(...data);
          let maxVal = Math.max(...data);
          
          // Handle edge cases
          if (minVal === maxVal) {
            maxVal = minVal + 1;
          }

          for (let i = 0; i < data.length; i++) {
            const rawValue = data[i];
            const pixelIndex = i * 4;

            if (type === 'flux') {
              // For solar flux data, create a sophisticated heatmap
              const normalizedValue = (rawValue - minVal) / (maxVal - minVal);
              const intensity = Math.pow(normalizedValue, 0.5); // Gamma correction for better visibility
              
              // Create blue->green->yellow->red heatmap
              let r, g, b;
              if (intensity < 0.25) {
                // Blue to cyan
                const t = intensity * 4;
                r = 0;
                g = Math.floor(t * 255);
                b = 255;
              } else if (intensity < 0.5) {
                // Cyan to green
                const t = (intensity - 0.25) * 4;
                r = 0;
                g = 255;
                b = Math.floor((1 - t) * 255);
              } else if (intensity < 0.75) {
                // Green to yellow
                const t = (intensity - 0.5) * 4;
                r = Math.floor(t * 255);
                g = 255;
                b = 0;
              } else {
                // Yellow to red
                const t = (intensity - 0.75) * 4;
                r = 255;
                g = Math.floor((1 - t) * 255);
                b = 0;
              }
              
              rgbaBuffer[pixelIndex] = r;
              rgbaBuffer[pixelIndex + 1] = g;
              rgbaBuffer[pixelIndex + 2] = b;
              rgbaBuffer[pixelIndex + 3] = Math.floor(intensity * 200 + 55); // Variable transparency
            } else if (type === 'mask') {
              // For roof mask, create a clear boundary
              const normalizedValue = (rawValue - minVal) / (maxVal - minVal);
              const isRoof = normalizedValue > 0.5;
              
              if (isRoof) {
                rgbaBuffer[pixelIndex] = 255;     // White for roof area
                rgbaBuffer[pixelIndex + 1] = 255;
                rgbaBuffer[pixelIndex + 2] = 255;
                rgbaBuffer[pixelIndex + 3] = 180; // Semi-transparent white
              } else {
                rgbaBuffer[pixelIndex] = 0;       // Transparent for non-roof
                rgbaBuffer[pixelIndex + 1] = 0;
                rgbaBuffer[pixelIndex + 2] = 0;
                rgbaBuffer[pixelIndex + 3] = 0;
              }
            } else {
              // For other grayscale data
              const normalizedValue = (rawValue - minVal) / (maxVal - minVal);
              const value = Math.floor(normalizedValue * 255);
              rgbaBuffer[pixelIndex] = value;
              rgbaBuffer[pixelIndex + 1] = value;
              rgbaBuffer[pixelIndex + 2] = value;
              rgbaBuffer[pixelIndex + 3] = 255;
            }
          }
        } else if (samplesPerPixel === 3) {
          // RGB
          rgbaBuffer = Buffer.alloc(width * height * 4);
          for (let i = 0; i < width * height; i++) {
            rgbaBuffer[i * 4] = samples[0][i];     // Red
            rgbaBuffer[i * 4 + 1] = samples[1][i]; // Green
            rgbaBuffer[i * 4 + 2] = samples[2][i]; // Blue
            rgbaBuffer[i * 4 + 3] = 255;           // Alpha
          }
        } else {
          throw new Error(`Unsupported samples per pixel: ${samplesPerPixel}`);
        }

        // Convert RGBA buffer to PNG using Sharp
        const pngBuffer = await sharp(rgbaBuffer, {
          raw: {
            width: width,
            height: height,
            channels: 4
          }
        })
        .png()
        .toBuffer();

        res.set('Content-Type', 'image/png');
        res.set('Content-Length', pngBuffer.length);
        res.set('Cache-Control', 'public, max-age=3600');
        return res.send(pngBuffer);

      } catch (tiffError) {
        console.error('GeoTIFF processing error:', tiffError);
        // Fallback: try to convert with Sharp anyway
        try {
          const pngBuffer = await sharp(imageBuffer).png().toBuffer();
          res.set('Content-Type', 'image/png');
          res.set('Content-Length', pngBuffer.length);
          res.set('Cache-Control', 'public, max-age=3600');
          return res.send(pngBuffer);
        } catch (sharpError) {
          console.error('Sharp conversion fallback failed:', sharpError);
          throw new Error('Failed to convert GeoTIFF file');
        }
      }
    } else {
      // For non-GeoTIFF files, pass through as-is
      res.set('Content-Type', contentType || 'image/png');
      res.set('Content-Length', imageBuffer.length);
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(imageBuffer);
    }

  } catch (error) {
    console.error(`Error proxying ${type} image:`, error);
    res.status(500).json({ error: `Failed to fetch ${type} image` });
  }
});

app.get('*', (req, res) => {
  // Only serve index.html for routes that don't have file extensions
  // This prevents static files (.js, .css, .png, etc.) from being served as HTML
  if (path.extname(req.path) === '') {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).send('File not found');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
