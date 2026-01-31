# 📧 Email Configuration Guide - Supabase

## Problem
No confirmation emails are being sent to users when they sign up.

## Root Cause
Supabase email provider (SMTP) is **not configured** in your project settings.

---

## ✅ Solution: Configure Supabase Email Provider

### Option A: Use Supabase's Built-in Email Service (Recommended for Development)

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `mkcgkfzltohxagqvsbqk`

2. **Configure Email Settings:**
   - Go to: **Authentication** → **Email Templates** (left sidebar)
   - You should see templates for:
     - Confirm signup
     - Invite user
     - Magic link
     - Change email
     - Reset password

3. **Enable Email Provider:**
   - Go to: **Project Settings** → **Auth** → **Email Templates**
   - Check if "Custom SMTP" is configured
   - If not, you need to either:
     - ✅ **Use Supabase's free email service** (limited to development)
     - 📬 **Configure custom SMTP** (for production)

### Option B: Configure Custom SMTP (Production Ready)

If you want production-grade email:

1. **Get SMTP Credentials** from one of:
   - **SendGrid** (recommended)
   - **Mailgun**
   - **AWS SES**
   - **Gmail/Google Workspace**
   - **Any SMTP provider**

2. **Add to Supabase:**
   - Go to: **Project Settings** → **Auth** → **Email Configuration**
   - Fill in:
     - **SMTP Host**: `smtp.sendgrid.net` (example for SendGrid)
     - **SMTP Port**: `587`
     - **SMTP Username**: `apikey`
     - **SMTP Password**: `your-sendgrid-api-key`
     - **From Email**: `noreply@turuturustars.co.ke`

---

## 🔍 Quick Diagnostic: Check Current Status

### 1. Check Supabase Dashboard
```
1. Go to https://supabase.com/dashboard
2. Click on your project
3. Go to "Authentication" → "Providers"
4. Look for "Email" provider status
5. Check if it shows "Enabled" or "Requires Configuration"
```

### 2. Check Email Templates
```
1. Go to "Authentication" → "Email Templates"
2. You should see email templates ready
3. If they're grayed out, SMTP is not configured
```

### 3. Test Email Sending (Browser Console)
```javascript
// Open browser DevTools (F12) → Console
// Then run:
const { supabase } = window.__SUPABASE__;
await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'TestPassword123!'
});
// Check browser console for errors
// This will trigger an email send attempt
```

---

## 🚀 Quick Fix Steps (Next 5 Minutes)

### Step 1: Check Email Provider Status
- [ ] Go to https://supabase.com/dashboard/project/mkcgkfzltohxagqvsbqk/auth/providers
- [ ] Look for "Email" provider
- [ ] Is it showing as "Configured" or "Needs Configuration"?

### Step 2: If Not Configured
**Option A - Development (Free, Built-in):**
- Supabase should have automatic email service for development
- If emails still not arriving, this means the service tier might not include it

**Option B - Production (Recommended):**
1. Sign up for **SendGrid** (free tier: 100 emails/day)
   - https://sendgrid.com/
2. Get API Key from SendGrid
3. Add to Supabase settings (see Option B above)

### Step 3: Test After Configuration
```javascript
// In browser console
const { supabase } = window.__SUPABASE__;
const { data, error } = await supabase.auth.signUp({
  email: 'test-' + Date.now() + '@gmail.com',
  password: 'TestPassword123!'
});
console.log('SignUp Result:', { data, error });
```

### Step 4: Check Email
- Wait 30 seconds
- Check your email (including spam folder)
- Verify confirmation link arrives

---

## 📋 Detailed Configuration for SendGrid (Recommended)

### Create SendGrid Account:
1. Go to https://sendgrid.com/
2. Sign up (free tier available)
3. Verify sender email (your email)
4. Go to: Settings → API Keys
5. Create new API Key with "Mail Send" permission
6. Copy the key

### Add to Supabase:
1. Dashboard → Project Settings → Auth
2. Look for "SMTP Configuration"
3. Enter:
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587`
   - **Username**: `apikey`
   - **Password**: `SG.your-api-key-here`
   - **From Address**: `noreply@turuturustars.co.ke`

### Test:
```javascript
// After configuration, test in console
const result = await supabase.auth.signUp({
  email: 'youremail@gmail.com',
  password: 'TestPassword123!'
});
```

---

## 🔗 Email Confirmation Flow in Code

### Current Implementation (Auth.tsx):
```typescript
const { data, error } = await supabase.auth.signUp(
  {
    email: signupData.email,
    password: signupData.password,
  },
  {
    redirectTo: `${globalThis.location.origin}/register?mode=complete-profile`,
  }
);
```

**What happens:**
1. ✅ Supabase creates user account
2. ⏳ **Email sent** (if SMTP configured)
3. User sees "Check Email" page at `/register`
4. User clicks link in email
5. Redirects to `/register?mode=complete-profile`
6. Profile form displayed

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Email not received for 10+ minutes"
**Solution:**
- [ ] Check spam/promotions folder
- [ ] Verify email address is correct
- [ ] Try different email provider (Gmail, Outlook, etc.)
- [ ] Check Supabase email logs for errors

### Issue 2: "Emails send but links don't work"
**Solution:**
- [ ] Verify `site_url` in `supabase/config.toml`:
  ```toml
  [auth]
  site_url = "https://turuturustars.co.ke"
  ```
- [ ] Make sure domain is correct for production
- [ ] For local dev, use `http://localhost:5173`

### Issue 3: "Getting 'email service not configured' error"
**Solution:**
- [ ] Go to Supabase dashboard
- [ ] Verify email provider is enabled
- [ ] Check email templates exist
- [ ] Configure SMTP if not using free tier

---

## 📞 Support Resources

- **Supabase Email Docs**: https://supabase.com/docs/guides/auth/auth-email
- **SendGrid API Docs**: https://docs.sendgrid.com/
- **Mailgun Alternative**: https://www.mailgun.com/
- **AWS SES**: https://aws.amazon.com/ses/

---

## ✨ Next Steps

1. **Immediately**: Check Supabase dashboard for email provider status
2. **If not configured**: Set up SendGrid (5 min) + add to Supabase (2 min)
3. **Test**: Use browser console to trigger test signup
4. **Verify**: Check email inbox for confirmation link
5. **Done**: Users should now receive emails!

---

## 📊 Current Status Check

Run this in browser console to see what's happening:

```javascript
// Check Supabase configuration
console.log('Supabase URL:', process.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', process.env.VITE_SUPABASE_ANON_KEY ? '✓ Configured' : '✗ Missing');

// Try to get current auth provider status
const { data, error } = await fetch('https://mkcgkfzltohxagqvsbqk.supabase.co/auth/v1/factors');
console.log('Auth API Status:', error ? '✗ Failed' : '✓ Working');
```

---

**Last Updated**: January 31, 2026
**Status**: Email configuration required for signup flow to work
