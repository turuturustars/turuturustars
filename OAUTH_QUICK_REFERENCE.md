# 🚀 GOOGLE OAUTH - QUICK REFERENCE

## Credentials Summary

```
Client ID: 786650137701-cioo5s5a1osfvrtqd3s97ucp1d4d2acp.apps.googleusercontent.com
Client Secret: [STORED SECURELY - RETRIEVE FROM TEAM]
Status: ✅ Active
Created: Jan 27, 2026
```

## Next Steps (In Order)

### 1️⃣ Configure Supabase (DO THIS NOW)
- Go to: https://app.supabase.com/
- Project: turuturustars
- Navigation: Auth → Providers → Google
- Enable Google
- Paste Client ID + Secret
- Save

### 2️⃣ Test Locally
```bash
npm run dev
# Go to http://localhost:8080/auth
# Click "Continue with Google"
```

### 3️⃣ Deploy to Production
```bash
npm run build
# Deploy via Cloudflare Pages
```

### 4️⃣ Test in Production
- Visit: https://turuturustars.co.ke/auth
- Click "Continue with Google"
- Verify redirect to dashboard

## Environment Variables

**Already set in `.env.production.local`:**
```
VITE_GOOGLE_CLIENT_ID=786650137701-cioo5s5a1osfvrtqd3s97ucp1d4d2acp.apps.googleusercontent.com
```

**For Cloudflare Pages:**
Add same variable to Cloudflare Environment Variables

## OAuth Flow

```
User clicks "Continue with Google"
           ↓
Redirects to Google Login
           ↓
User authenticates
           ↓
Google redirects to Supabase callback
           ↓
Supabase creates/updates user
           ↓
Redirects to https://turuturustars.co.ke/dashboard
           ↓
User sees dashboard ✅
```

## Important URIs

| Type | URI |
|------|-----|
| JavaScript Origin | https://turuturustars.co.ke |
| Redirect URI 1 | https://turuturustars.co.ke/auth |
| Redirect URI 2 | https://turuturustars.co.ke/dashboard |
| Supabase Callback | https://mkcgkfzltohxagqvsbqk.supabase.co/auth/v1/callback |

## Security Notes

✅ Client ID: Safe to expose (in frontend code)
🔒 Client Secret: NEVER expose (keep in Supabase only)
🔐 All data: Transmitted over HTTPS only

## Support

If something doesn't work:
1. Check Supabase console for errors
2. Verify environment variables loaded
3. Wait 5-15 min for Google to sync
4. Test in incognito/private mode
5. Check browser console for errors (F12)

