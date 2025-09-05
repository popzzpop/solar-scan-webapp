import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

app.get('/api/solar/image-proxy', async (req, res) => {
  const { url, type } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    console.log(`Fetching ${type} image from:`, url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type');
    console.log(`${type} image content type:`, contentType);

    // Pass through the image data
    const imageBuffer = await response.buffer();
    
    // Set appropriate headers
    res.set('Content-Type', contentType || 'image/png');
    res.set('Content-Length', imageBuffer.length);
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    res.send(imageBuffer);
    
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