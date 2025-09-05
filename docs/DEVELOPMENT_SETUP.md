# 🛠️ Development Setup Guide

This guide will help you set up the Solar Scan development environment on your local machine.

## 📋 Prerequisites

### Required Software
- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **VS Code** (recommended) - [Download](https://code.visualstudio.com/)

### Google Cloud Platform Setup
1. Create a [Google Cloud Platform](https://console.cloud.google.com/) account
2. Create a new project or select an existing one
3. Enable the **Google Solar API**
4. Create an API key with Solar API permissions
5. (Optional) Restrict API key to specific domains for security

### Railway Account (for deployment)
1. Create a [Railway](https://railway.app/) account
2. Connect your GitHub account
3. Familiarize yourself with Railway's dashboard

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/solar-scan-webapp.git
cd solar-scan-webapp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your API keys
# Required:
GOOGLE_SOLAR_API_KEY=your_google_solar_api_key_here

# Optional:
PORT=3000
```

### 4. Start Development Server
```bash
# Start both frontend and backend in development mode
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

### 5. Build for Production
```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🏗️ Project Structure

```
solar-scan-webapp/
├── .github/                 # GitHub templates and workflows
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   ├── workflows/          # GitHub Actions
│   └── pull_request_template.md
├── docs/                   # Documentation
│   └── DEVELOPMENT_SETUP.md
├── dist/                   # Built application (generated)
├── public/                 # Static assets
├── src/                    # Source code (future structure)
│   ├── components/        # Reusable UI components
│   ├── services/          # API services and utilities
│   ├── styles/            # CSS and styling
│   └── utils/             # Helper functions
├── tests/                  # Test files
├── index.html             # Main HTML file
├── script.js              # Main JavaScript file
├── server.js              # Express server
├── package.json           # Node.js dependencies
├── vite.config.js         # Vite configuration
├── railway.json           # Railway deployment config
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── README.md              # Project overview
├── CONTRIBUTING.md        # Contribution guidelines
├── PROJECT_ROADMAP.md     # Project roadmap
└── MILESTONES.md          # Development milestones
```

## 🔧 Development Commands

### Package Management
```bash
npm install                 # Install all dependencies
npm install <package>       # Install a new package
npm install -D <package>    # Install development dependency
npm update                  # Update all packages
npm audit                   # Check for security vulnerabilities
npm audit fix              # Fix security vulnerabilities
```

### Development
```bash
npm run dev                 # Start development server with hot reload
npm run build              # Build for production
npm run preview            # Preview production build locally
npm start                  # Start production server
npm run lint               # Run linting (when configured)
npm test                   # Run tests (when configured)
```

### Git Workflow
```bash
git checkout develop       # Switch to develop branch
git pull origin develop    # Get latest changes
git checkout -b feature/your-feature  # Create feature branch
# ... make your changes ...
git add .                  # Stage changes
git commit -m "feat: your feature description"  # Commit
git push origin feature/your-feature  # Push to remote
# ... create pull request on GitHub ...
```

## 🌐 API Development

### Testing Google Solar API
The application integrates with Google's Solar API. You can test the endpoints:

```bash
# Test Building Insights endpoint
curl "http://localhost:3000/api/solar/building/37.7749/-122.4194"

# Test Data Layers endpoint  
curl "http://localhost:3000/api/solar/data-layers/37.7749/-122.4194?radius=100"
```

### API Response Examples

#### Building Insights Response
```json
{
  "name": "buildings/ChIJVVVVVVVVVVVVVVVVVVVVVVVV",
  "center": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "solarPotential": {
    "maxArrayPanelsCount": 20,
    "maxArrayAreaMeters2": 48.5,
    "wholeRoofStats": {
      "areaMeters2": 85.2
    }
  },
  "imageQuality": "HIGH"
}
```

## 🎨 Frontend Development

### Styling Guidelines
- **Tailwind CSS** for utility-first styling
- **Responsive design** for mobile/tablet/desktop
- **Semantic HTML5** elements
- **Accessibility** considerations (ARIA labels, alt text)

### JavaScript Best Practices
- **ES6+ features** (async/await, destructuring, etc.)
- **Modular code** organization
- **Error handling** with try/catch
- **JSDoc comments** for functions

### UI Components
Current components include:
- Interactive map with Leaflet.js
- Solar analysis forms
- Results visualization with Chart.js
- Responsive navigation and layout

## 🖥️ Backend Development

### Server Architecture
- **Express.js** web server
- **RESTful API** endpoints
- **Environment-based configuration**
- **Error handling middleware**
- **CORS enabled** for cross-origin requests

### Adding New Endpoints
1. Define route in `server.js`
2. Implement handler function
3. Add input validation
4. Handle errors gracefully
5. Test with sample data
6. Update documentation

Example:
```javascript
app.get('/api/solar/new-endpoint/:param', async (req, res) => {
  try {
    const { param } = req.params;
    // Implementation here
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 🧪 Testing

### Manual Testing
1. **Cross-browser testing** (Chrome, Firefox, Safari, Edge)
2. **Mobile responsive testing** (iOS, Android)
3. **API endpoint testing** with different parameters
4. **Error scenario testing** (invalid inputs, API failures)

### Automated Testing (Future)
```bash
npm test                   # Run unit tests
npm run test:integration   # Run integration tests  
npm run test:e2e          # Run end-to-end tests
npm run test:coverage     # Generate coverage report
```

## 🚀 Deployment

### Local Production Build
```bash
npm run build             # Build optimized assets
npm start                 # Start production server
```

### Railway Deployment
1. **Connect Repository:** Link GitHub repo to Railway
2. **Environment Variables:** Add `GOOGLE_SOLAR_API_KEY`
3. **Deploy:** Automatic deployment on push to main
4. **Monitor:** Check Railway dashboard for logs and metrics

### Environment Variables
```bash
# Production environment variables
GOOGLE_SOLAR_API_KEY=your_production_api_key
PORT=3000
NODE_ENV=production
```

## 🔍 Debugging

### Common Issues

#### "API key not configured" Error
- Check `.env` file exists and has correct API key
- Restart development server after changing `.env`
- Verify API key has Solar API permissions

#### "Failed to fetch solar data" Error
- Check internet connection
- Verify Google Solar API is enabled
- Test with known working coordinates
- Check browser console for detailed errors

#### Map not loading
- Check Leaflet.js CDN availability
- Verify map container has height in CSS
- Check browser console for JavaScript errors

#### Build failures
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Verify all dependencies are installed

### Development Tools

#### Browser DevTools
- **Console:** View JavaScript errors and logs
- **Network:** Monitor API requests and responses
- **Elements:** Inspect and modify HTML/CSS
- **Performance:** Analyze page load performance

#### VS Code Extensions (Recommended)
- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **GitLens**
- **Thunder Client** (API testing)
- **Live Server**

## 📚 Learning Resources

### Google Solar API
- [Official Documentation](https://developers.google.com/maps/documentation/solar)
- [API Reference](https://developers.google.com/maps/documentation/solar/reference/rest)
- [Coverage Areas](https://developers.google.com/maps/documentation/solar/coverage)

### Frontend Technologies
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Leaflet.js Documentation](https://leafletjs.com/reference.html)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Vite Documentation](https://vitejs.dev/guide/)

### Backend Technologies
- [Express.js Documentation](https://expressjs.com/en/4x/api.html)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)

## 🤝 Getting Help

### Internal Resources
- **GitHub Issues:** Report bugs and request features
- **GitHub Discussions:** Ask questions and discuss ideas
- **Documentation:** Check existing docs first

### External Resources
- **Stack Overflow:** Technical questions
- **Google Cloud Support:** API-related issues
- **Railway Discord:** Deployment questions

## 📈 Performance Optimization

### Frontend Optimization
- **Image optimization:** Compress and resize images
- **Bundle analysis:** Use `npm run build` and analyze output
- **Lazy loading:** Load components and images on demand
- **Caching:** Implement service worker for offline functionality

### Backend Optimization
- **Response caching:** Cache API responses to reduce external calls
- **Compression:** Enable gzip compression
- **Rate limiting:** Implement rate limiting for API endpoints
- **Monitoring:** Add performance monitoring and logging

---

## 🎉 You're Ready!

You should now have a fully functional development environment. Start by:

1. **Exploring the codebase** to understand the current implementation
2. **Making a small change** to verify your setup works
3. **Checking out the issues** to find your first contribution
4. **Reading the roadmap** to understand project direction

Happy coding! 🚀

---

*This guide is updated regularly. If you find any issues or have suggestions for improvement, please open an issue or submit a pull request.*

**Last Updated:** January 2025