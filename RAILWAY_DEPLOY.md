# 🚀 Railway Deployment Guide

## Current Railway Project
- **Project ID:** 42a0fb07-6c26-400d-bfd2-81fbbf03a5fc
- **Service ID:** 9a5c62f2-b03b-4809-b02d-0c94ffa01622
- **Environment ID:** 6b3e05b6-f7f5-452a-9966-eba2ee133953
- **Live URL:** https://shimmering-cooperation-production.up.railway.app
- **Railway Token:** abd21df9-52c9-4cf4-af04-716cba381ec5
- **Project Dashboard:** https://railway.com/project/42a0fb07-6c26-400d-bfd2-81fbbf03a5fc

## Quick Deploy Methods

### 1. 🚀 Production Deploy (Main Branch)
Deploy production version using Railway CLI:

```bash
# Ensure you're on main branch
git checkout main
railway up --service 9a5c62f2-b03b-4809-b02d-0c94ffa01622
```

### 2. 🧪 Development Deploy (Feature Branch)
Deploy development version for testing:

```bash
# Deploy current feature branch to production service (for testing)
railway up --service 9a5c62f2-b03b-4809-b02d-0c94ffa01622
```

**⚠️ Note:** This will temporarily replace production. For proper development environment, see setup below.

### 3. 🖱️ Manual Deploy (Alternative)
Deploy via Railway Dashboard:

1. Visit [Your Project Dashboard](https://railway.com/project/42a0fb07-6c26-400d-bfd2-81fbbf03a5fc)
2. Go to your service deployment page
3. Click **"Deploy"** or **"Redeploy"** button
4. Railway will automatically pull the latest code from GitHub
5. Monitor deployment logs for any issues

### 3. 🤖 Automated Script Deploy (Legacy)
Run the deployment script:

```bash
./deploy-to-railway.sh
```

**Note:** The script is outdated. Use CLI deploy method instead.

### 4. 📋 CLI Setup (If Needed)
If Railway CLI needs to be set up from scratch:

```bash
# Install Railway CLI (if not installed)
curl -fsSL https://railway.app/install.sh | sh

# Login to Railway (requires browser)
railway login

# Link to your specific project
railway link --project 42a0fb07-6c26-400d-bfd2-81fbbf03a5fc

# Deploy with service ID
railway up --service 9a5c62f2-b03b-4809-b02d-0c94ffa01622
```

**Note:** This system is already configured. Use method 1 instead.

## 🧪 Development Environment Setup

### Option 1: Create Railway Development Environment (Recommended)

1. **Go to Railway Dashboard:**
   - Visit: https://railway.com/project/42a0fb07-6c26-400d-bfd2-81fbbf03a5fc
   - Click **"New Environment"** or **"Environments"** tab

2. **Create Development Environment:**
   - Name: `development` or `staging`
   - Branch: `feature/new-development` (or your feature branch)
   - This creates a separate deployment URL

3. **Configure Branch Auto-Deploy:**
   - Set source branch to your feature branch
   - Enable auto-deploy on push
   - Configure environment variables (copy from production)

4. **Get Development URL:**
   - Will be something like: `https://development-shimmering-cooperation.up.railway.app`
   - Or: `https://staging-shimmering-cooperation.up.railway.app`

### Option 2: Quick Development Testing

For quick feature testing without separate environment:

```bash
# Switch to your feature branch
git checkout feature/new-development

# Deploy to production service temporarily
railway up --service 9a5c62f2-b03b-4809-b02d-0c94ffa01622

# ⚠️ This replaces production temporarily
# Switch back to main and redeploy when done:
# git checkout main
# railway up --service 9a5c62f2-b03b-4809-b02d-0c94ffa01622
```

### Option 3: Preview Deployments

Enable automatic preview deployments:
1. In Railway dashboard, go to Settings
2. Enable "Preview Deployments"  
3. Every PR will get its own temporary URL
4. Automatically deploys feature branches

## Environment Variables
Your Railway project should have these environment variables set:

```bash
GOOGLE_SOLAR_API_KEY=AIzaSyB0kDcpY2spi-xXkWTvPdWFImAnu9aDDYc
NODE_ENV=production
```

To check/set them:
```bash
railway variables
railway variables set VARIABLE_NAME="value"
```

## Deployment Configuration

### railway.json
The project uses this Railway configuration:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start"
  }
}
```

### Key Points:
- **No build step** - Uses vanilla JS (no Vite build)
- **Start command:** `npm start` runs server.js
- **Auto-deploys** from GitHub main branch
- **Port:** Railway automatically assigns PORT environment variable

## Troubleshooting

### Common Issues:

**1. Map/Search not working:**
- Check if script.js is loading properly
- Verify server.js serves static files correctly
- Look for console errors in browser

**2. API errors:**
- Verify GOOGLE_SOLAR_API_KEY is set
- Check Railway logs: `railway logs`

**3. Deployment fails:**
- Check GitHub Actions are passing
- Verify railway.json configuration
- Review Railway build logs

**4. CLI authentication fails:**
- Use manual dashboard deployment instead
- Ensure you're logged in: `railway login`
- Check project linking: `railway status`

### Commands for Debugging:

```bash
# Check project status
railway status

# View deployment logs
railway logs

# Check environment variables
railway variables

# Get project URL
railway domain
```

## Post-Deployment Checklist

After successful deployment:

1. ✅ **Test the live URL:** https://shimmering-cooperation-production.up.railway.app
2. ✅ **Verify map loads** - Check Leaflet map appears
3. ✅ **Test search functionality** - Try searching for an address
4. ✅ **Check console** - No JavaScript errors
5. ✅ **Test API endpoints** - Solar data requests work
6. ✅ **Mobile responsive** - Test on different screen sizes

## Support

- **Railway Docs:** https://docs.railway.app/
- **Project Dashboard:** https://railway.com/project/42a0fb07-6c26-400d-bfd2-81fbbf03a5fc
- **GitHub Repository:** https://github.com/popzzpop/solar-scan-webapp

---

💡 **Pro Tip:** Railway auto-deploys from GitHub, so simply pushing to main branch should trigger a deployment. Use the manual dashboard method if CLI fails.