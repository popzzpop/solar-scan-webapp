# 🚀 Solar Scan - Deployment Instructions

## Quick Deployment to Railway

### Step 1: Prepare Repository
1. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/solar-scan-webapp.git
   git push -u origin main
   git push origin develop
   ```

### Step 2: Railway Setup
1. **Login to Railway:** Visit [railway.app](https://railway.app) and login
2. **New Project:** Click "New Project" → "Deploy from GitHub repo"
3. **Select Repository:** Choose your `solar-scan-webapp` repository
4. **Environment Variables:** Add the following in Railway dashboard:
   ```
   GOOGLE_SOLAR_API_KEY=your_google_solar_api_key_here
   ```

### Step 3: Get Google Solar API Key
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project → Enable "Solar API"
3. Go to "Credentials" → "Create Credentials" → "API Key"
4. Copy the API key to Railway environment variables

### Step 4: Deploy
- Railway will automatically deploy from `main` branch
- Your app will be available at: `https://your-app-name.railway.app`

## 🔧 Manual Setup Alternative

If you prefer manual setup:

```bash
# Clone and setup locally first
git clone https://github.com/YOUR_USERNAME/solar-scan-webapp.git
cd solar-scan-webapp
npm install
cp .env.example .env
# Add your Google Solar API key to .env
npm run build
npm start
```

## 🌟 What You'll Have

- **Interactive Solar Analysis:** Click anywhere on the map to analyze solar potential
- **Google Solar API Integration:** Real solar data for millions of buildings
- **Financial Modeling:** See 20-year savings projections
- **Responsive Design:** Works on desktop, tablet, and mobile
- **Professional UI:** Modern interface with Tailwind CSS

## 📋 Post-Deployment Checklist

- [ ] Test the application with a few addresses
- [ ] Verify Google Solar API is working
- [ ] Check mobile responsiveness  
- [ ] Test error handling with invalid addresses
- [ ] Monitor Railway logs for any issues

## 🎯 Next Steps for Development

1. **Create Issues:** Use GitHub Issues to track features and bugs
2. **Follow Milestones:** Check `MILESTONES.md` for development roadmap
3. **Contribute:** Read `CONTRIBUTING.md` for contribution guidelines
4. **Scale:** Follow the roadmap to add enterprise features

Your Solar Scan webapp is now ready to showcase the power of Google's Solar API! 🌞