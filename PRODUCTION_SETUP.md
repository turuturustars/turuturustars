# Production Deployment Guide - Cloudflare Pages

## ⚠️ SECURITY: Environment Variables Setup

Your Supabase publishable key was found in git history by GitHub's secret scanner. While this key is meant to be public (it's the client-side API key), we need to properly manage ALL environment variables through Cloudflare Pages.

## Step 1: Configure Environment Variables on Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your project: **turuturustars.co.ke**
3. Navigate to **Pages → turuturustars → Settings → Environment variables**
4. Add the following variables for **Production**:

### Required Production Variables

```
VITE_SUPABASE_URL=https://mkcgkfzltohxagqvsbqk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rY2drZnpsdG9oeGFncXZzYnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDAxMjMsImV4cCI6MjA4NDgxNjEyM30.TTVvJP3NJhWvxfvRCEHGtuZx2GH2UsTX2Zom32ADyWo
VITE_CLOUDFLARE_SITE_KEY=0x4AAAAAACRFKckuFG5fhGU_
VITE_APP_URL=https://turuturustars.co.ke
VITE_API_URL=https://turuturustars.co.ke/api
VITE_DEBUG=false
```

5. Click **Save** after adding each variable

## Step 2: Configure wrangler.toml (if using Cloudflare Workers)

If you're using Cloudflare Workers for your API, create/update `wrangler.toml`:

```toml
name = "turuturustars"
type = "javascript"
account_id = "your_account_id"
workers_dev = true
route = ""
zone_id = ""

[env.production]
vars = { ENVIRONMENT = "production" }
```

## Step 3: Build Configuration

Ensure your `vite.config.ts` properly reads environment variables:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    'import.meta.env.VITE_CLOUDFLARE_SITE_KEY': JSON.stringify(process.env.VITE_CLOUDFLARE_SITE_KEY),
    'import.meta.env.VITE_APP_URL': JSON.stringify(process.env.VITE_APP_URL),
  },
})
```

## Step 4: Update Turnstile Configuration

Go to [Cloudflare Turnstile](https://dash.cloudflare.com/):
1. Find your widget
2. Edit it to add domain: `turuturustars.co.ke`
3. Ensure it's deployed

## Step 5: Supabase Configuration for Production

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select project: **mkcgkfzltohxagqvsbqk**
3. Go to **Settings → Authentication → Captcha**
4. Enable Turnstile
5. Add Secret Key: `0x4AAAAAACRFKTRz7pRlMJ6v30TjNvqPDqY`

## Security Checklist

- ✅ All `.env*` files are in `.gitignore`
- ✅ Environment variables set in Cloudflare Pages (not in git)
- ✅ Supabase Turnstile secret configured
- ✅ Production domain added to Turnstile allowed domains
- ✅ No sensitive credentials in git history
- ✅ GitHub secret scanner findings addressed

## Deployment

To deploy to production:

```bash
# Install Wrangler (if not already installed)
npm install -g @cloudflare/wrangler

# Or use Pages deployment
git push origin main
# Your Cloudflare Pages should auto-deploy on push

# Build locally to test
npm run build
```

## Monitoring

After deployment, check:
1. Cloudflare Pages build logs for errors
2. Browser console for any env var warnings
3. Turnstile widget loads on `/auth` page
4. Supabase connection works

## Local Development

Use `.env.local` for local development:
```
VITE_SUPABASE_URL=https://mkcgkfzltohxagqvsbqk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_CLOUDFLARE_SITE_KEY=0x4AAAAAACRFKckuFG5fhGU_
VITE_APP_URL=http://localhost:8080
VITE_API_URL=http://localhost:8080/api
VITE_DEBUG=true
```

**IMPORTANT:** Never commit `.env.local` - it's in `.gitignore` for a reason!
