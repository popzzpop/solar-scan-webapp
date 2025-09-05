# Solar Scan - Google Solar API Demo

A modern web application showcasing the capabilities of Google's Solar API, deployed on Railway.

## 🌟 Features

- **Interactive Solar Analysis**: Click anywhere on the map or enter an address to analyze solar potential
- **Building Insights**: Get detailed information about roof dimensions, solar panel capacity, and energy generation potential
- **Financial Projections**: View estimated savings and payback periods for solar installations
- **Real-time Visualization**: Interactive charts showing projected savings over time
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🔧 Google Solar API Features Demonstrated

- **Building Insights API**: Analyzes roof structure and solar potential
- **Data Layers API**: Provides raw solar datasets for advanced analysis
- **Energy Modeling**: Calculates potential energy production and financial benefits
- **Geographic Coverage**: Works with hundreds of millions of buildings worldwide

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Google Cloud Platform account with Solar API enabled
- Railway account for deployment

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Add your Google Solar API key to `.env`:
   ```
   GOOGLE_SOLAR_API_KEY=your_api_key_here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:5173 in your browser

### Production Build

```bash
npm run build
npm start
```

## 🚂 Railway Deployment

1. Connect your GitHub repository to Railway
2. Add environment variable `GOOGLE_SOLAR_API_KEY` in Railway dashboard
3. Deploy automatically on push to main branch

The app will be available at your Railway-generated URL.

## 🔑 Getting a Google Solar API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Solar API
4. Create credentials (API key)
5. Optionally restrict the API key to Solar API only

## 🌍 API Coverage

The Google Solar API provides data for:
- United States (High quality)
- European Union (Medium/High quality)  
- Japan (Medium/High quality)
- Additional countries (Base quality)

## 💡 How It Works

1. **Location Input**: Users can click on the map or enter an address
2. **Geocoding**: Addresses are converted to coordinates using OpenStreetMap
3. **Solar Analysis**: The Google Solar API analyzes building structure and solar potential
4. **Visualization**: Results are displayed with interactive charts and metrics
5. **Financial Modeling**: Potential savings are calculated and projected over time

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, Tailwind CSS, Leaflet Maps, Chart.js
- **Backend**: Node.js, Express
- **Build Tool**: Vite
- **Deployment**: Railway
- **APIs**: Google Solar API, OpenStreetMap Nominatim

## 📊 Key Metrics Displayed

- Maximum number of solar panels that can be installed
- Annual energy generation potential (kWh)
- Total roof area available for solar
- Data quality rating (High/Medium/Base)
- 20-year financial projections
- Payback period calculations

## 🔒 Privacy & Security

- No user data is stored on our servers
- All analysis requests are processed in real-time
- API keys are securely stored as environment variables
- HTTPS encryption for all communications

## 📱 Mobile Responsive

The application is fully responsive and optimized for:
- Desktop browsers
- Tablets  
- Mobile phones
- Touch interactions on maps

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

For issues related to:
- **Google Solar API**: Check the [official documentation](https://developers.google.com/maps/documentation/solar)
- **Railway Deployment**: Visit [Railway documentation](https://docs.railway.app/)
- **This Application**: Open an issue in this repository

## 🔄 Recent Updates

- ✅ Integration with Google Solar API v1
- ✅ Support for Building Insights and Data Layers endpoints  
- ✅ Real-time financial analysis
- ✅ Mobile-responsive design
- ✅ Railway deployment configuration
- ✅ Interactive mapping with Leaflet
- ✅ Chart.js integration for data visualization

---

Built with ❤️ to showcase the potential of Google's Solar API in accelerating renewable energy adoption.