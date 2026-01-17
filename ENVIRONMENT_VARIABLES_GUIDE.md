# Environment Variables Setup Guide

## For Local Development

Create a `.env.local` file in the project root (already in .gitignore):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here

# App Configuration (optional for local, required for production)
VITE_APP_URL=http://localhost:8080
```

## For Production

Use `.env.production` file (also in .gitignore):

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here

# App Configuration (REQUIRED)
VITE_APP_URL=https://turuturustars.co.ke
VITE_API_URL=https://turuturustars.co.ke/api
```

## Getting Your Supabase Credentials

### Step 1: Go to Supabase Dashboard
1. Log in to [app.supabase.com](https://app.supabase.com)
2. Select your project "turuturustars"

### Step 2: Navigate to API Settings
1. Click **Settings** in left sidebar
2. Click **API** under Configuration
3. You'll see:
   - **Project URL** - copy this as VITE_SUPABASE_URL
   - **Anon/Public key** - copy this as VITE_SUPABASE_PUBLISHABLE_KEY

### Step 3: Set in Hosting Platform

**For Vercel:**
1. Go to project Settings
2. Click Environment Variables
3. Add each variable:
   - Name: `VITE_SUPABASE_URL` → Value: `https://xxx.supabase.co`
   - Name: `VITE_SUPABASE_PUBLISHABLE_KEY` → Value: `eyJxxx...`
   - Name: `VITE_APP_URL` → Value: `https://turuturustars.co.ke`

**For Netlify:**
1. Go to Site settings
2. Click Environment
3. Click Edit variables
4. Add the same variables

**For Self-Hosted:**
Add to your deployment script or server environment

## Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Supabase backend URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public authentication key | `eyJhbGciOi...` |
| `VITE_APP_URL` | Frontend app URL | `https://turuturustars.co.ke` |
| `VITE_API_URL` | API endpoint (optional) | `https://turuturustars.co.ke/api` |

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env.local` or `.env.production` to Git
- Both are already in `.gitignore` 
- The "publishable key" is safe to expose (it's public)
- Never expose the "service role key" (keep that secret)
- Each environment should have its own set of variables

## Testing Environment Variables

After deployment, verify variables are loaded:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Check these work:
   ```javascript
   // These should exist
   console.log(import.meta.env.VITE_SUPABASE_URL)
   console.log(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
   ```

## Supabase Functions Environment Variables

The Supabase Functions (deno) use separate environment variables:

```bash
# In supabase/functions/.env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MPESA_CONSUMER_KEY=your_mpesa_key
MPESA_CONSUMER_SECRET=your_mpesa_secret
MPESA_PASSKEY=your_mpesa_passkey
```

These are managed separately in Supabase dashboard → Settings → Functions.

---

**Remember**: Test in development first, then deploy to production!
