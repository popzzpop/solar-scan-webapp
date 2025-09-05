# 🚀 Railway Deployment Guide

## Quick Deploy (Automated Script)

Run the deployment script I've created:

```bash
./deploy-to-railway.sh
```

This script will:
1. Install Railway CLI (if needed)
2. Authenticate with your API key
3. Initialize the project
4. Set environment variables
5. Deploy to Railway

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Install Railway CLI
```bash
# Option A: Using curl
curl -fsSL https://railway.app/install.sh | sh

# Option B: Using npm (if you have permissions)
npm install -g @railway/cli

# Option C: Using brew (macOS)
brew install railway
```

### 2. Authenticate
```bash
export RAILWAY_TOKEN="3a379831-9b2f-49d0-bfcd-641bc4388d5e"
railway login
```

### 3. Initialize Project
```bash
cd "/Users/maciejpopiel/Solar Scan - Claude"
railway init
```

### 4. Set Environment Variables
```bash
railway variables set GOOGLE_SOLAR_API_KEY="AIzaSyB0kDcpY2spi-xXkWTvPdWFImAnu9aDDYc"
railway variables set NODE_ENV="production"
```

### 5. Deploy
```bash
railway up
```

### 6. Get Deployment URL
```bash
railway status
```

## 🔧 Post-Deployment

After deployment:

1. **Test the app** with some addresses
2. **Check logs**: `railway logs`
3. **Monitor metrics** in Railway dashboard
4. **Set custom domain** (optional): `railway domain`

## ✅ Your Solar Scan App Will Have

- **Live Solar Analysis** powered by Google Solar API
- **Interactive Maps** for location selection
- **Real-time Financial Projections**
- **Mobile-responsive Design**
- **Professional UI** ready for users

The app will be live at your Railway-generated URL within minutes!

## 🆘 Troubleshooting

- **CLI not found**: Install using one of the methods above
- **Permission denied**: Use `sudo` or brew installation method
- **API key issues**: Double-check the environment variables
- **Build failures**: Check Railway logs for detailed errors

Your Solar Scan webapp is ready to go live! 🌞