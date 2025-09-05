#!/bin/bash

# Railway Deployment Script for Solar Scan
# Your Railway API Key: 3a379831-9b2f-49d0-bfcd-641bc4388d5e

echo "🚀 Deploying Solar Scan to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    
    # Install Railway CLI (requires sudo)
    curl -fsSL https://railway.app/install.sh | sh
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Railway CLI. Please install manually:"
        echo "   Visit: https://docs.railway.app/develop/cli#installing-the-cli"
        exit 1
    fi
fi

# Set Railway API token
export RAILWAY_TOKEN="3a379831-9b2f-49d0-bfcd-641bc4388d5e"

# Login to Railway (using API token)
echo "🔑 Authenticating with Railway..."
railway login

# Initialize and deploy
echo "📦 Initializing Railway project..."
railway init

echo "🔧 Setting environment variables..."
railway variables set GOOGLE_SOLAR_API_KEY="AIzaSyB0kDcpY2spi-xXkWTvPdWFImAnu9aDDYc"
railway variables set NODE_ENV="production"

echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Your Solar Scan webapp should be live at:"
railway status --json | jq -r '.deployments[0].url'

echo ""
echo "📋 Next steps:"
echo "1. Check Railway dashboard for deployment status"
echo "2. Test the application with some addresses"
echo "3. Monitor logs: railway logs"
echo "4. Custom domain: railway domain"