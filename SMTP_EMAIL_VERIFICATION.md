# ✅ SMTP Configuration Verification

## Your Current Setup
✅ **SMTP Provider**: Brevo (smtp-relay.brevo.com)
✅ **Port**: 587
✅ **Sender Email**: noreply@turuturustars.co.ke
✅ **Sender Name**: Turuturu Stars
✅ **Rate Limit**: 60 seconds per user

---

## ⚠️ If Emails Still Not Arriving - Check These:

### 1. **Email Confirmation Must Be Enabled**
Go to Supabase Dashboard:
1. **Authentication** → **Providers**
2. Look for **Email** provider
3. Make sure **"Confirm email"** is toggled **ON**
4. Screenshot: You should see a toggle switch that's enabled

**Why**: Even with SMTP configured, email confirmation won't send if this isn't enabled.

---

### 2. **Verify Email Templates Are Configured**
Go to: **Authentication** → **Email Templates**

You should see:
- ✅ **Confirm signup** - Should show template with `{{ confirmation_url }}`
- ✅ **Invite user** - Template for invitations
- ✅ **Magic link** - For passwordless login
- ✅ **Change email** - For email changes
- ✅ **Reset password** - For password recovery

**If templates are grayed out**: SMTP provider needs to be verified.

---

### 3. **Check the Redirect URL**
In your Auth.tsx, the signup calls:
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

**Verify**: After user clicks email link, they should redirect to:
- ✅ `https://turuturustars.co.ke/register?mode=complete-profile` (Production)
- ✅ `http://localhost:5173/register?mode=complete-profile` (Development)

**To fix for development:**
- In `supabase/config.toml`, the `site_url` should match your dev URL
- Currently set to: `https://turuturustars.co.ke`
- Might need to allow `http://localhost:5173` for dev testing

---

### 4. **Test Email Sending Directly**
Run this in browser console (F12):

```javascript
// Test 1: Check if SMTP is working
const { supabase } = window.__SUPABASE__;

// Create a test account
const testEmail = 'test-' + Date.now() + '@gmail.com';
const { data, error } = await supabase.auth.signUp({
  email: testEmail,
  password: 'TestPassword123!',
  options: {
    emailRedirectTo: `${window.location.origin}/register?mode=complete-profile`
  }
});

console.log('SignUp Result:', { data, error });

// Wait 5 minutes and check the email
```

**Expected**: Email should arrive within 2-5 minutes

---

### 5. **Check Email Delivery Logs in Brevo**
1. Go to https://app.brevo.com/
2. Log in with your Brevo account
3. Go to **Dashboard** → **Email**
4. Look for your test emails
5. Check if they were:
   - ✅ Sent successfully
   - ⚠️ Bounced (invalid recipient)
   - ❌ Blocked (spam filter)
   - ⏳ Pending (not delivered yet)

---

### 6. **Check Supabase Email Logs**
Supabase also tracks email sends:
1. Go to Supabase Dashboard
2. **Project Settings** → **Logs** (if available)
3. Or check **Edge Function Logs** for any email errors

---

## 🔧 Common Issues & Fixes

### Issue: "Email sent but not arriving"
**Solutions:**
- [ ] Check spam/promotions folder
- [ ] Wait 5+ minutes (Brevo might have queue)
- [ ] Try different email address
- [ ] Verify email isn't on bounce list in Brevo

### Issue: "Getting SMTP authentication error"
**Solution:**
- [ ] Go to Brevo (app.brevo.com)
- [ ] Check if SMTP user is active
- [ ] Regenerate SMTP credentials if needed
- [ ] Update Supabase SMTP settings

### Issue: "Emails worked before, stopped working"
**Solutions:**
- [ ] Check Brevo account - might be suspended/quota exceeded
- [ ] Verify SMTP credentials are still valid
- [ ] Check email sender reputation in Brevo dashboard
- [ ] Look for any account alerts in Brevo

### Issue: "Email confirmation link doesn't work"
**Solutions:**
- [ ] Verify `site_url` in Supabase matches your domain
- [ ] Check the `redirectTo` parameter is correct
- [ ] Ensure route `/register?mode=complete-profile` exists
- [ ] Check browser console for errors when clicking link

---

## 📋 Testing Checklist

- [ ] **Step 1**: Verify email confirmation is enabled in Auth → Providers
- [ ] **Step 2**: Check email templates exist in Auth → Email Templates
- [ ] **Step 3**: Run test signup from browser console
- [ ] **Step 4**: Wait 2-5 minutes
- [ ] **Step 5**: Check inbox (including spam)
- [ ] **Step 6**: If not received, check Brevo logs
- [ ] **Step 7**: Verify redirectTo URL is correct
- [ ] **Step 8**: Click link and verify it works

---

## 🚀 Next Steps

1. **Immediately**:
   - [ ] Go to Supabase Dashboard → Authentication → Providers
   - [ ] Verify Email provider has "Confirm email" toggle **ON**
   - [ ] Take screenshot and share result

2. **Then**:
   - [ ] Test signup via browser console (see Step 4 above)
   - [ ] Wait 5 minutes
   - [ ] Check email inbox

3. **If still not working**:
   - [ ] Check Brevo dashboard for delivery logs
   - [ ] Share any error messages you see
   - [ ] We'll adjust SMTP settings if needed

---

## 📞 Support Info

**Brevo SMTP Help**: https://help.brevo.com/hc/en-us/articles/360000946260-SMTP-credentials
**Supabase Email Docs**: https://supabase.com/docs/guides/auth/auth-email
**Supabase SMTP Setup**: https://supabase.com/docs/guides/auth/auth-smtp

---

**Last Updated**: January 31, 2026
**Status**: SMTP Configured ✅ | Awaiting Email Confirmation Verification
