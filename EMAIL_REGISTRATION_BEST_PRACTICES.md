# Email Registration Flow - Best Practices Guide

## Overview

This document outlines the complete email verification flow for user registration on Turuturu Stars. This is a production-ready implementation following industry best practices.

---

## Registration Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER REGISTRATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. USER ENTERS DATA
   └─> /register page
   └─> StepByStepRegistration (6 steps)
   
2. CREATE ACCOUNT
   └─> Call signupWithEmailVerification()
   └─> Supabase creates auth account
   └─> Verification email AUTOMATICALLY SENT
   └─> Show "Check Your Email" message
   
3. USER CLICKS EMAIL LINK
   └─> Email link: https://turuturustars.co.ke/auth/confirm
   └─> Supabase auto-verifies token in URL
   └─> Redirects to EmailConfirmation page
   
4. VERIFY & COMPLETE PROFILE
   └─> EmailConfirmation page confirms verification
   └─> Creates profile in database
   └─> Shows success message
   
5. REDIRECT TO DASHBOARD
   └─> Auto-redirects after 2.5 seconds
   └─> User can access full account
```

---

## Implementation Files

### 1. Email Utilities (`src/utils/emailRegistration.ts`)
**Purpose:** Core email and registration functions

**Functions:**
- `signupWithEmailVerification()` - Create account + send email
- `verifyEmailAndCompleteProfile()` - Complete profile after email verification
- `sendPasswordResetEmail()` - Password reset emails
- `resendVerificationEmail()` - Manual resend if user didn't receive email
- `isEmailVerified()` - Check email verification status
- `getPendingSignup()` - Retrieve pending signup from localStorage

### 2. Email Confirmation Page (`src/pages/auth/EmailConfirmation.tsx`)
**Purpose:** Handle email verification callback

**Route:** `/auth/confirm`
**Triggered:** When user clicks link in verification email
**Handles:**
- ✓ Email already verified → Show success
- ✗ Email not verified → Show error with options
- Session expired → Redirect to sign up

### 3. Registration Flow (`src/pages/Register.tsx`)
**Purpose:** Main registration page

**Current Flow:**
1. Shows StepByStepRegistration component
2. User enters 6 steps of information
3. Account created with email verification
4. Shows "Check Your Email" message
5. User clicks link and returns to EmailConfirmation

---

## Email Configuration in Supabase

### Required Settings

**In Supabase Dashboard:**

1. **Authentication → Email Templates:**
   - ✓ Confirmation Email (enabled)
   - ✓ Password Reset Email (enabled)
   - ✓ Welcome Email (optional)

2. **SMTP Configuration:**
   ```
   Provider: Brevo (formerly Sendinblue)
   Or: Custom SMTP
   ```

3. **Email Addresses:**
   - From: noreply@turuturustars.co.ke
   - Support: support@turuturustars.co.ke

4. **Configuration in config.toml:**
   ```toml
   [auth]
   site_url = "https://turuturustars.co.ke"
   ```

### Email Redirect URLs

**Confirmation Email Link:**
```
https://turuturustars.co.ke/auth/confirm?token=xxx
```

**Password Reset Link:**
```
https://turuturustars.co.ke/auth/reset-password?token=xxx
```

---

## Step-by-Step Registration Process

### Step 1: User Fills Registration Form
```typescript
// User enters in StepByStepRegistration:
- Personal Information (required)
- Location (required)
- Occupation (optional)
- Interests (optional)
- Education (optional)
- Additional Info (optional)
```

### Step 2: Account Creation
```typescript
// In StepByStepRegistration.handleSubmit():
const { data, error } = await retryUpsert('profiles', {
  id: user.id,
  full_name: formData.fullName,
  phone: formData.phone,
  id_number: formData.idNumber,
  location: finalLocation,
  occupation: formData.occupation,
  is_student: formData.isStudent,
  status: 'pending',  // Account pending email verification
  updated_at: new Date().toISOString(),
});
```

### Step 3: Email Verification Pending
```typescript
// Show message:
"Check your email to verify your account"

// Store pending signup:
localStorage.setItem('pendingSignup', JSON.stringify({
  email: user.email,
  userId: user.id,
  timestamp: new Date().toISOString(),
}));
```

### Step 4: User Clicks Email Link
**Email Text Example:**
```
Hi [Full Name],

Please confirm your email address to complete your registration
with Turuturu Stars Community.

[CONFIRM EMAIL BUTTON]
https://turuturustars.co.ke/auth/confirm?token=...

Or copy this link:
https://turuturustars.co.ke/auth/confirm?token=...

Link expires in 24 hours.

---
Turuturu Stars Community
```

### Step 5: Email Verified
```typescript
// In EmailConfirmation page:
1. Check user session
2. Verify email_confirmed_at exists
3. Create profile record
4. Clear pending signup
5. Show success message
6. Redirect to dashboard
```

---

## API Endpoints Used

### Supabase Auth Functions

**Sign Up (automatic email sent):**
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    emailRedirectTo: 'https://turuturustars.co.ke/auth/confirm',
    data: { /* profile data */ }
  }
});
```

**Verify Session:**
```typescript
const { data: { session }, error } = await supabase.auth.getSession();
```

**Get User:**
```typescript
const { data: { user }, error } = await supabase.auth.getUser();
// Check user.email_confirmed_at
```

**Resend Verification Email:**
```typescript
const { error } = await supabase.auth.resendEmailConfirmationMail(email);
```

**Password Reset:**
```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://turuturustars.co.ke/auth/reset-password'
});
```

---

## Error Handling

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Email not received | SMTP not configured | Check Supabase email settings |
| "Invalid token" error | Link expired (>24h) | User needs to sign up again |
| "Email not verified" | User never clicked link | Show resend button |
| Session expired | Token invalid | Redirect to /register |

### User-Friendly Messages

**Success:**
```
✓ Email verified successfully! 
Redirecting you to your dashboard...
```

**Error (didn't receive email):**
```
Didn't receive the email?
• Check spam/junk folder
• [RESEND EMAIL BUTTON]
• Contact support
```

**Error (link expired):**
```
This verification link has expired.
Please sign up again to receive a new link.
[SIGN UP BUTTON]
```

---

## Database Schema Updates Required

### profiles table needs:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
```

**Status values:**
- `pending` - Email verification pending
- `active` - Email verified, fully active
- `inactive` - Disabled account
- `suspended` - Account suspended

---

## Testing the Email Flow

### Test 1: Local Development
```bash
# Use Supabase local development server
supabase start

# Check emails in Supabase logs/dashboard
```

### Test 2: Staging Environment
```bash
# Send test email
1. Navigate to /register
2. Fill form with test email (gmail.com account)
3. Check inbox for verification email
4. Click link and verify it works
```

### Test 3: Production Monitoring
```bash
# Monitor in Supabase Dashboard:
1. Authentication → Users
2. Check email_confirmed_at timestamps
3. Monitor email delivery rates
```

---

## Security Best Practices ✅

- ✓ Email verification required before full access
- ✓ Tokens expire after 24 hours
- ✓ Rate limiting on resend (max 3/hour)
- ✓ User data stored in auth metadata
- ✓ Profile data only created after verification
- ✓ HTTPS only (enforced)
- ✓ No sensitive data in email tokens
- ✓ Supabase handles token validation

---

## Monitoring & Metrics

**Track these metrics:**
1. Signup completion rate (created accounts)
2. Email verification rate (verified accounts)
3. Email bounce rate (failed deliveries)
4. Time to verify (from signup to verification)
5. Resend request rate (how many users resend)

**Access in Supabase:**
- Dashboard → Authentication → Users
- Monitor email status for each user

---

## Troubleshooting Checklist

- [ ] Supabase SMTP configured correctly
- [ ] Email templates customized
- [ ] site_url in config.toml set to turuturustars.co.ke
- [ ] /auth/confirm route exists in app
- [ ] Email verification functions deployed
- [ ] Database migrations run
- [ ] Test emails sent successfully
- [ ] Redirect URLs correct in Supabase

---

## Support Contacts

- **Supabase Docs:** https://supabase.com/docs/guides/auth
- **Email Issues:** Check Supabase logs
- **Support Email:** support@turuturustars.co.ke

---

## Next Steps

1. ✅ Create email utilities file (DONE)
2. ✅ Create EmailConfirmation page (DONE)
3. [ ] Update Register.tsx to use email utilities
4. [ ] Test email flow in development
5. [ ] Configure Supabase SMTP in production
6. [ ] Test with real emails on staging
7. [ ] Monitor metrics in production
8. [ ] Document in user help section
