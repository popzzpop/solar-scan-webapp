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
app.use(express.static('dist'));

app.get('/api/solar/building/:lat/:lng', async (req, res) => {
  const { lat, lng } = req.params;
  const apiKey = process.env.GOOGLE_SOLAR_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Solar API key not configured' });
  }

  try {
    const response = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`
    );

    if (!response.ok) {
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
      `https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=${radiusMeters}&view=${view}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Solar API error:', error);
    res.status(500).json({ error: 'Failed to fetch solar data layers' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});