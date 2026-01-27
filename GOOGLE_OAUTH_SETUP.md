# 🔐 Google OAuth Production Setup Guide

## ✅ OAuth Credentials Created

**Status:** Google OAuth Client ID successfully created on January 27, 2026

### Client Information
- **Client ID:** `786650137701-cioo5s5a1osfvrtqd3s97ucp1d4d2acp.apps.googleusercontent.com`
- **Creation Date:** January 27, 2026, 7:32:03 AM GMT+3
- **Status:** Enabled
- **Application Type:** Web application
- **Name:** turuturustars client

**⚠️ IMPORTANT:** Client Secret is stored securely in Supabase only. Never commit secrets to Git!

---

## 📋 Production Configuration Checklist

### 1. ✅ Environment Variables

**File:** `.env.production.local`

```env
VITE_GOOGLE_CLIENT_ID=786650137701-cioo5s5a1osfvrtqd3s97ucp1d4d2acp.apps.googleusercontent.com
```

**Status:** ✅ Already configured

### 2. 🔄 Supabase Configuration Required

You must configure Google OAuth in your Supabase project:

1. **Go to:** [Supabase Dashboard](https://app.supabase.com/)
2. **Project:** turuturustars
3. **Navigate to:** Authentication → Providers → Google

#### Enter the following:

**Google Client ID:**
```
786650137701-cioo5s5a1osfvrtqd3s97ucp1d4d2acp.apps.googleusercontent.com
```

**Google Client Secret:**
```
[STORED SECURELY IN PASSWORD MANAGER - NEVER COMMIT TO GIT]
Contact the development team to retrieve this value.
```

**Redirect URLs to add in Supabase:**
```
https://mkcgkfzltohxagqvsbqk.supabase.co/auth/v1/callback
https://turuturustars.co.ke/auth/callback
https://turuturustars.co.ke/dashboard
```

**Note:** Supabase will provide its own callback URL. Use that one as primary.

### 3. 🌐 Google Cloud Console - Authorized URIs

**Already Configured:**
- **Authorized JavaScript Origins:** `https://turuturustars.co.ke`
- **Authorized Redirect URIs:** (from above)

### 4. 📱 Cloudflare Pages Environment Variables

When deploying to production, add to Cloudflare Pages:

```
VITE_GOOGLE_CLIENT_ID=786650137701-cioo5s5a1osfvrtqd3s97ucp1d4d2acp.apps.googleusercontent.com
```

**Do NOT add the Client Secret to Cloudflare** - it's handled by Supabase on the backend.

---

## 🚀 Deployment Steps

### Step 1: Configure Supabase (Immediate)

1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to: **Authentication** → **Providers**
4. Find **Google** provider
5. Enable it and enter:
   - Client ID (above)
   - Client Secret (from Google Cloud Console)
6. Add redirect URLs
7. Click **Save**

**Wait 2-5 minutes** for changes to propagate.

### Step 2: Deploy to Production

```bash
# Build for production
npm run build

# Deploy to Cloudflare Pages
# (Follow your deployment process)
```

### Step 3: Test in Production

1. Navigate to `https://turuturustars.co.ke/auth`
2. Click "Continue with Google"
3. Complete Google login
4. Should redirect to `/dashboard`

---

## 🧪 Testing Checklist

- [ ] Google sign-in button visible on `/auth` page
- [ ] Clicking "Continue with Google" redirects to Google login
- [ ] After Google authentication, redirects to dashboard
- [ ] User profile created in Supabase with Google data
- [ ] Can access protected routes after OAuth login
- [ ] Logout works correctly
- [ ] Can go through full registration flow
- [ ] Mobile authentication works

---

## 🔒 Security Notes

1. **Client Secret Storage:**
   - Never commit to Git
   - Only stored in Supabase (backend)
   - Already secured in password manager

2. **Environment Variables:**
   - Client ID can be public (it's in frontend code anyway)
   - Never expose Client Secret in frontend

3. **HTTPS Required:**
   - Google OAuth requires HTTPS
   - `turuturustars.co.ke` has valid SSL certificate ✅

4. **Redirect URI Validation:**
   - Only listed URIs are allowed
   - Prevents phishing attacks

---

## 🆘 Troubleshooting

### Issue: "Invalid origin" error

**Cause:** JavaScript origin contains path
**Solution:** Use only domain: `https://turuturustars.co.ke`

### Issue: "Redirect URI mismatch"

**Cause:** Redirect URL not in Google Cloud Console
**Solution:** Add the URL to Authorized Redirect URIs

### Issue: OAuth button not appearing

**Cause:** Environment variables not loaded
**Solution:** 
```bash
# Rebuild and restart
npm run build
npm run dev
```

### Issue: Login redirects back to `/auth` instead of `/dashboard`

**Cause:** Supabase Google provider not configured
**Solution:** Complete Step 1 above (Supabase setup)

### Issue: Changes not taking effect

**Solution:** Wait 5-15 minutes for Google to propagate changes, then:
1. Clear browser cache
2. Test in incognito/private window
3. Restart development server

---

## 📞 Support Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [OAuth 2.0 Redirect URI Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

## ✅ Completion Status

- [x] Google OAuth Client ID created
- [x] Client credentials obtained
- [x] Environment variables configured
- [ ] Supabase provider configured (NEXT STEP)
- [ ] Production deployment
- [ ] Testing in production
- [ ] User documentation updated

