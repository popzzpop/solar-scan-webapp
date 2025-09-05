# Claude Instructions

## Language Policy
Always think, write, and answer in English, regardless of the user's input language.

## Railway Deployment Process

### Before Deploying - Always Check:
1. **Check Railway config exists:**
   ```bash
   ls -la ~/.railway/config.json
   ```

2. **Verify project is linked:**
   ```bash
   railway status
   ```

3. **Check for existing authentication:**
   - Railway CLI is already configured on this system
   - User is authenticated and project is linked
   - DO NOT override with RAILWAY_TOKEN env vars

### Deployment Commands:

**Production (main branch):**
```bash
git checkout main
railway up --service 9a5c62f2-b03b-4809-b02d-0c94ffa01622
```

**Development (feature branch):**
```bash
git checkout feature/new-development
railway up --service 9a5c62f2-b03b-4809-b02d-0c94ffa01622
```

**⚠️ Note:** Both deploy to same service. For separate dev environment, create new Railway environment.

### Key Project Details:
- **Project ID:** 42a0fb07-6c26-400d-bfd2-81fbbf03a5fc
- **Service ID:** 9a5c62f2-b03b-4809-b02d-0c94ffa01622  
- **Environment ID:** 6b3e05b6-f7f5-452a-9966-eba2ee133953
- **Live URL:** https://shimmering-cooperation-production.up.railway.app

### Common Mistakes to Avoid:
1. ❌ Don't use `RAILWAY_TOKEN="..."` env var override
2. ❌ Don't try `railway login` (already authenticated)
3. ❌ Don't use `railway init` or `railway link` (already linked)
4. ❌ Don't use `railway up` without service flag (multiple services exist)

### Development Workflow:
1. Work on `feature/new-development` branch
2. Deploy to test changes: `railway up --service 9a5c62f2-b03b-4809-b02d-0c94ffa01622`
3. When ready, merge to main and deploy production
4. **Better:** Create separate Railway development environment

### If Deployment Fails:
1. Check `railway status` shows correct project
2. Use the exact service ID in the command
3. Verify all code changes are committed first
4. Check current branch matches intended deployment

## Deployment
For detailed Railway deployment instructions, see RAILWAY_DEPLOY.md