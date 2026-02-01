# 🔐 Complete Authentication & Email Setup Guide

A comprehensive guide to the new authentication system with proper email configuration and profile setup flow.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Email Configuration](#email-configuration)
4. [Profile Setup Process](#profile-setup-process)
5. [Key Files & Components](#key-files--components)
6. [Configuration Steps](#configuration-steps)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

The new authentication system provides a complete, production-ready setup that includes:

- ✅ **Secure User Registration** - Email/password signup with validation
- ✅ **Email Verification** - Automatic email confirmation flow
- ✅ **Profile Completion** - Guided profile setup after signup
- ✅ **OAuth Integration** - Google sign-in support
- ✅ **Password Recovery** - Secure password reset functionality
- ✅ **Email Configuration** - Support for multiple email providers

---

## Authentication Flow

### Signup Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SIGNUP JOURNEY                          │
└─────────────────────────────────────────────────────────────────┘

1. User visits /auth page
   ↓
2. Clicks "Create an Account" button
   ↓
3. Fills in email, password, confirm password
   ↓
4. Clicks "Create Account"
   ↓
5. Server creates user in Supabase Auth
   ↓
6. Confirmation email sent to user
   ↓
7. User redirected to /profile-setup
   ↓
8. ProfileSetup page shows "Verify Your Email" step
   ↓
9. User checks email and clicks confirmation link
   ↓
10. Email verified
    ↓
11. ProfileSetup page shows "Complete Your Profile" form
    ↓
12. User fills in: name, phone, location, bio, photo
    ↓
13. Profile data saved to database
    ↓
14. Redirected to /dashboard
```

### Login Flow

```
┌──────────────────────────────────────────────────────┐
│                   USER LOGIN JOURNEY                 │
└──────────────────────────────────────────────────────┘

1. User visits /auth page
   ↓
2. Fills in email and password
   ↓
3. Clicks "Sign In"
   ↓
4. Credentials validated with Supabase
   ↓
5. Session created
   ↓
6. Redirected to /dashboard
```

---

## Email Configuration

### Supported Email Providers

The system supports multiple email providers:

1. **Supabase Email Service** (Development)
   - Built-in, no configuration needed
   - Limited usage for development only
   - Not recommended for production

2. **Brevo (Sendinblue)** (Production Recommended)
   - Free tier with 300 emails/day
   - Professional email templates
   - Good deliverability

3. **SendGrid** (Enterprise)
   - High reliability
   - Advanced features
   - Scalable infrastructure

4. **Mailgun** (Professional)
   - Flexible pricing
   - Good documentation
   - Developer-friendly

5. **AWS SES** (Cost-effective)
   - Pay per email
   - Integrates with AWS ecosystem
   - Requires domain verification

### Configure Email Provider

#### Option 1: Use Supabase (Development)

Supabase handles email automatically. No configuration needed for development.

#### Option 2: Configure Brevo (Recommended for Production)

1. **Sign up at:** https://www.brevo.com/

2. **Get SMTP Credentials:**
   - Go to Settings → SMTP & API
   - Copy: SMTP Host, SMTP Port (587), Username, Password

3. **Update Environment Variables:**

```bash
VITE_BREVO_SMTP_HOST=smtp-relay.brevo.com
VITE_BREVO_SMTP_USER=your-email@example.com
VITE_BREVO_SMTP_PASSWORD=your-api-key
VITE_EMAIL_FROM=noreply@yourdomain.com
VITE_EMAIL_REPLY_TO=support@yourdomain.com
```

4. **Configure in Supabase:**
   - Go to Supabase Dashboard
   - Project Settings → Auth
   - Email Configuration
   - Fill in SMTP details from Brevo

#### Option 3: Configure SendGrid

1. **Create SendGrid Account:** https://sendgrid.com/

2. **Get API Key:**
   - Settings → API Keys
   - Create New API Key

3. **Update Environment Variables:**

```bash
VITE_SENDGRID_API_KEY=SG.xxxxxxxxxxxxxx
VITE_EMAIL_FROM=noreply@yourdomain.com
```

4. **Configure in Supabase:**
   - Use SendGrid's SMTP credentials
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: `SG.xxxxxxxxxxxxxx`

---

## Profile Setup Process

### Profile Setup Page (`/profile-setup`)

The profile setup page is a **protected route** that guides users through:

#### Step 1: Email Verification
- Shows user's email address
- Displays verification email status
- Provides resend button (5-minute cooldown)
- Auto-checks verification status (every 5 seconds)

#### Step 2: Complete Profile
- **Full Name** (required) - Text input, min 2 characters
- **Phone Number** (optional) - Validated phone format
- **Location** (required) - City/Country format
- **Bio** (optional) - Max 500 characters
- **Profile Photo** (optional) - Image upload, max 5MB

### Database Schema

The profile data is stored in the `profiles` table:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  profile_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Profile Image Upload

- **Storage:** Supabase Storage (bucket: `profile-images`)
- **Path:** `avatars/{user-id}-{timestamp}-{filename}`
- **Max Size:** 5MB
- **Formats:** JPG, PNG, GIF, WebP
- **Public URL:** Generated and stored in database

---

## Key Files & Components

### Core Authentication Files

| File | Purpose |
|------|---------|
| `src/config/emailConfig.ts` | Email configuration for all environments |
| `src/lib/authService.ts` | Authentication utility functions |
| `src/pages/Auth.tsx` | Login/Signup page |
| `src/pages/ProfileSetup.tsx` | Profile completion page |
| `src/components/auth/EmailVerification.tsx` | Email verification component |

### Key Functions

#### `authService.ts`

```typescript
// Sign up a new user
signUpUser(data: SignUpData)

// Sign in with email/password
signInUser(data: SignInData)

// Sign in with OAuth
signInWithOAuth(provider: 'google' | 'github' | 'twitter')

// Check if email is verified
isEmailVerified(userId: string)

// Resend email confirmation
resendEmailConfirmation(email: string)

// Get current authenticated user
getCurrentUser()

// Validate email format
validateEmail(email: string)

// Validate password strength
validatePassword(password: string)
```

#### `emailConfig.ts`

```typescript
// Get current environment config
getEmailConfig()

// Email templates configuration
emailTemplates

// Supabase-specific email settings
supabaseEmailConfig

// Email verification settings
emailVerificationConfig
```

### Component Structure

```
src/
├── pages/
│   ├── Auth.tsx              # Login/Signup page
│   └── ProfileSetup.tsx      # Profile completion page
├── components/auth/
│   ├── EmailVerification.tsx # Email verification component
│   └── ProtectedRoute.tsx    # Protected route wrapper
├── config/
│   ├── emailConfig.ts        # Email configuration
│   └── routes.ts             # Route definitions
├── lib/
│   └── authService.ts        # Authentication utilities
└── integrations/
    └── supabase/
        └── client.ts         # Supabase client
```

---

## Configuration Steps

### 1. Environment Variables

Create `.env.local` file in project root:

```env
# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Email Configuration (choose one provider)

# Brevo
VITE_BREVO_SMTP_HOST=smtp-relay.brevo.com
VITE_BREVO_SMTP_USER=your-email@brevo.com
VITE_BREVO_SMTP_PASSWORD=your-brevo-api-key

# Or SendGrid
VITE_SENDGRID_API_KEY=SG.your-api-key

# General Email Settings
VITE_EMAIL_FROM=noreply@yourdomain.com
VITE_EMAIL_REPLY_TO=support@yourdomain.com
```

### 2. Supabase Configuration

#### Enable Email Confirmation

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Providers**
3. Click **Email** provider
4. Toggle **Confirm email** - ON
5. Set email templates (optional - use defaults)

#### Configure SMTP (Optional, for Production)

1. Go to **Project Settings** → **Auth**
2. Find **Email Configuration** section
3. Fill in your SMTP details:
   - **SMTP Host**
   - **SMTP Port** (usually 587)
   - **SMTP Username**
   - **SMTP Password**
4. Save changes

#### Create Storage Bucket (for Profile Images)

1. Go to **Storage** section
2. Click **Create a new bucket**
3. Name it: `profile-images`
4. Toggle **Public bucket** - ON
5. Create bucket

#### Set Storage Policies

```sql
-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow public read access
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');
```

### 3. Configure Email Templates

Navigate to **Authentication** → **Email Templates**

#### Customize Signup Confirmation Email

```html
<h2>Confirm Your Email</h2>
<p>Welcome to Turuturu Stars Community!</p>
<p>Please confirm your email address by clicking the link below:</p>
<a href="{{ .ConfirmationURL }}">Confirm Email</a>
<p>This link expires in 24 hours.</p>
```

#### Customize Password Reset Email

```html
<h2>Reset Your Password</h2>
<p>We received a request to reset your password.</p>
<p>Click the link below to create a new password:</p>
<a href="{{ .ConfirmationURL }}">Reset Password</a>
<p>If you didn't request this, you can ignore this email.</p>
```

---

## Troubleshooting

### Issue: Users Not Receiving Confirmation Emails

**Possible Causes:**
1. SMTP not configured in Supabase
2. Email provider (Brevo, SendGrid) not set up
3. Email marked as spam
4. Typo in recipient email

**Solutions:**
```bash
# Check Supabase logs
1. Go to Supabase Dashboard → Logs
2. Filter by "email" or "auth"
3. Look for error messages

# Test email sending
1. Sign up with test email
2. Check spam folder
3. Verify SMTP credentials are correct
```

### Issue: Profile Setup Page Not Loading

**Possible Causes:**
1. User not authenticated
2. Route not added to App.tsx
3. ProfileSetup component has import errors

**Solutions:**
```bash
# Check browser console for errors
1. Open DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab for failed requests

# Verify route is registered
# In src/App.tsx, should have:
<Route path="/profile-setup" element={<ProfileSetup />} />
```

### Issue: Profile Image Upload Failed

**Possible Causes:**
1. Bucket not created or not public
2. Storage policies not set
3. File too large
4. File format not supported

**Solutions:**
```bash
# Check storage bucket
1. Go to Supabase → Storage
2. Verify `profile-images` bucket exists
3. Check bucket is public
4. Verify policies are correct

# Test upload
1. Reduce file size (use < 1MB)
2. Use common format (JPG/PNG)
3. Check error message in console
```

### Issue: Email Verification Not Auto-Detecting

**Possible Causes:**
1. Check interval too long or too short
2. Session not persisting
3. API permissions not correct

**Solutions:**
```bash
# Manual refresh
# In ProfileSetup page, users can:
1. Click refresh browser
2. Close and reopen page
3. Log out and log back in

# Adjust check interval
# In ProfileSetup.tsx:
- Default: every 5 seconds
- Change: autoCheckInterval prop
```

---

## Best Practices

### 1. Email Security

✅ **Do:**
- Use TLS/SSL encryption (port 587 or 465)
- Validate email addresses
- Rate-limit password reset requests
- Use strong API keys
- Rotate credentials regularly

❌ **Don't:**
- Store passwords in plain text
- Use unencrypted connections
- Share API keys in code
- Log sensitive email addresses

### 2. Profile Data Handling

✅ **Do:**
- Validate all user input
- Sanitize file uploads
- Store images in secure bucket
- Backup user data regularly
- Honor privacy settings

❌ **Don't:**
- Trust client-side validation alone
- Allow arbitrary file uploads
- Expose private user data
- Store sensitive info in metadata

### 3. Email Configuration

✅ **Do:**
- Use dedicated email provider for production
- Set up email templates professionally
- Monitor email delivery rates
- Handle bounced emails
- Keep credentials secure

❌ **Don't:**
- Use Supabase email service for production
- Send emails from random addresses
- Ignore email delivery failures
- Commit API keys to git

### 4. User Experience

✅ **Do:**
- Provide clear error messages
- Show verification status
- Allow email resend (with cooldown)
- Auto-detect verification
- Make profile setup optional initially

❌ **Don't:**
- Force immediate profile completion
- Lose user session on verification
- Hide error messages
- Make email verification confusing

### 5. Testing

✅ **Do:**
- Test signup with valid/invalid emails
- Test email delivery
- Test profile image upload
- Test on mobile devices
- Test error scenarios

❌ **Don't:**
- Only test happy path
- Use production database for testing
- Skip email verification testing
- Ignore error cases

---

## Environment Variables Reference

```bash
# Required - Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx

# Email Provider - Brevo
VITE_BREVO_SMTP_HOST=smtp-relay.brevo.com
VITE_BREVO_SMTP_USER=your-email@brevo.com
VITE_BREVO_SMTP_PASSWORD=xxxxx

# Email Provider - SendGrid (Alternative)
VITE_SENDGRID_API_KEY=SG.xxxxx

# Email Configuration
VITE_EMAIL_FROM=noreply@yourdomain.com
VITE_EMAIL_REPLY_TO=support@yourdomain.com

# Optional - Feature Flags
VITE_ENABLE_OAUTH_GOOGLE=true
VITE_REQUIRE_EMAIL_VERIFICATION=true
VITE_ENABLE_PROFILE_IMAGE_UPLOAD=true
```

---

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs/guides/auth
- **Brevo (Sendinblue):** https://www.brevo.com/
- **SendGrid:** https://sendgrid.com/
- **Email Best Practices:** https://www.rfc-editor.org/rfc/rfc5322

---

**Last Updated:** February 2026
**Version:** 1.0
