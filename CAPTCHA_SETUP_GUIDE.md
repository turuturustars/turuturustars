# Cloudflare Turnstile + Supabase Auth Integration Guide

## Overview
The 500 error on authentication was caused by the Captcha token not being properly passed to Supabase's auth endpoints. This guide shows how to properly configure and use Cloudflare Turnstile with Supabase authentication.

## What Was Changed

### 1. **Added Cloudflare Turnstile Script** (`index.html`)
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

### 2. **Created `useCaptcha` Hook** (`src/hooks/useCaptcha.ts`)
- Manages Turnstile widget lifecycle
- Handles token callbacks
- Provides reset/remove functions

### 3. **Updated Auth Component** (`src/pages/Auth.tsx`)
- Integrates captcha hook
- Renders captcha widget on login form
- Passes `captchaToken` to `signInWithPassword()` 
- Passes `captchaToken` to `signUp()` options
- Added error handling for captcha validation failures

### 4. **Updated Supabase Config** (`supabase/config.toml`)
```toml
[auth]
site_url = "https://turuturustars.co.ke"
disable_signup = false
enable_signup_captcha = true
captcha_provider = "turnstile"
```

## Setup Instructions

### Step 1: Get Cloudflare Turnstile Credentials
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain or create a site
3. Go to **Security → Turnstile**
4. Click **Create Site**
5. Fill in:
   - **Site name**: Turuturu Stars Auth
   - **Domains**: `turuturustars.co.ke`, `localhost:5173` (for dev)
   - **Mode**: Managed (recommended)
6. Copy your **Site Key** (public) and **Secret Key** (private)

### Step 2: Configure Environment Variables

**Create `.env.local`** (Never commit this to git):
```env
VITE_CLOUDFLARE_SITE_KEY=your_site_key_here
```

**For Supabase backend configuration:**
You need to set the Turnstile secret in your Supabase Dashboard:
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: `mkcgkfzltohxagqvsbqk`
3. Go to **Settings → Auth → Captcha**
4. Enable Captcha
5. Select Provider: **Turnstile**
6. Paste your **Secret Key** from Cloudflare
7. Save

### Step 3: Update Supabase Configuration
The `supabase/config.toml` has been updated with:
```toml
[auth]
site_url = "https://turuturustars.co.ke"
enable_signup_captcha = true
captcha_provider = "turnstile"
```

If you haven't run `supabase push`, do it now:
```bash
supabase push
```

### Step 4: Test the Integration

**Login Flow:**
1. Go to `/auth` page
2. Switch to **Sign In** tab
3. You should see Turnstile widget
4. Complete the captcha
5. Enter email and password
6. Click "Sign In"

**What Happens Behind the Scenes:**
1. Turnstile generates a token (`captchaToken`)
2. Token is sent to Supabase: `signInWithPassword({ email, password, options: { captchaToken } })`
3. Supabase validates token with Cloudflare servers
4. If valid, login proceeds; if invalid, 500 error

## Why You Got the 500 Error

The 500 error occurred because:
1. ❌ Captcha token was **NOT** being passed to Supabase auth endpoints
2. ❌ Supabase expected a `captchaToken` in the auth request but got `null`
3. ❌ Without token validation, Supabase rejected the auth attempt with a 500 error

## How It's Fixed Now

1. ✅ Captcha widget renders on the login form
2. ✅ Token is captured when user completes captcha
3. ✅ Token is passed in auth options: `{ captchaToken }`
4. ✅ Supabase validates token and allows login
5. ✅ Error handling for failed captcha validation

## Troubleshooting

### Captcha Not Showing
- Check browser console for errors
- Verify `VITE_CLOUDFLARE_SITE_KEY` in `.env.local`
- Ensure Turnstile script loaded: check Network tab in DevTools

### Still Getting 500 Error
1. Check Supabase logs for auth errors
2. Verify Turnstile Secret is set in Supabase Dashboard
3. Check if captcha provider is set to "turnstile" in Supabase
4. Try resetting captcha: page reload

### Token Expired
- Turnstile tokens expire after 5 minutes
- User will see "Captcha expired" message
- Page automatically clears the widget to re-render

## Security Notes

- **Public Key** (VITE_CLOUDFLARE_SITE_KEY): Safe to expose, used for client-side widget
- **Secret Key**: NEVER commit to git, only set in Supabase Dashboard
- Tokens are validated server-side by Supabase + Cloudflare
- Always validate captcha on backend (already handled by Supabase)

## Files Modified

1. `index.html` - Added Turnstile script
2. `src/hooks/useCaptcha.ts` - New captcha management hook
3. `src/pages/Auth.tsx` - Integrated captcha into auth flow
4. `supabase/config.toml` - Configured captcha provider
5. `.env.example` - Added Cloudflare site key placeholder

## Next Steps

- [ ] Get Cloudflare Turnstile credentials
- [ ] Create `.env.local` with site key
- [ ] Configure Supabase Dashboard with Turnstile secret
- [ ] Run `supabase push` to update config
- [ ] Test login with captcha
- [ ] Monitor Supabase auth logs for any issues
