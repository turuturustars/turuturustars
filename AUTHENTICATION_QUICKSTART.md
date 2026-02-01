# ⚡ Authentication Setup - Quick Start

Get your authentication system running in 15 minutes!

---

## 🎯 Quick Setup (5 Steps)

### Step 1: Configure Environment Variables (2 min)

Create `.env.local` in your project root:

```bash
# Supabase (Required)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Email Configuration (Choose one)

# Option A: Brevo (Recommended)
VITE_BREVO_SMTP_HOST=smtp-relay.brevo.com
VITE_BREVO_SMTP_USER=your-email@brevo.com
VITE_BREVO_SMTP_PASSWORD=your-api-key

# Option B: SendGrid
VITE_SENDGRID_API_KEY=SG.your-api-key

# General
VITE_EMAIL_FROM=noreply@yourdomain.com
VITE_EMAIL_REPLY_TO=support@yourdomain.com
```

### Step 2: Configure Supabase Email (2 min)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Authentication** → **Providers**
4. Find **Email** provider
5. Toggle **Confirm email** ON
6. Save

### Step 3: Create Storage Bucket (2 min)

1. Go to **Storage** in Supabase
2. Click **Create a new bucket**
3. Name: `profile-images`
4. Toggle **Public bucket** ON
5. Create

### Step 4: Test Signup (2 min)

```bash
# Start dev server
npm run dev

# Open browser
http://localhost:5173/auth

# Click "Create an Account"
# Fill in test email and password
# Submit
```

### Step 5: Verify Email (1 min)

You should see:
1. ✅ Redirected to `/profile-setup`
2. ✅ Email verification screen
3. ✅ Check your email for confirmation link
4. ✅ Click link
5. ✅ Profile form appears

---

## 🔐 How It Works

### User Journey

```
Sign Up → Email Sent → Email Verified → Profile Setup → Dashboard
```

### What Happens in Each Step

| Step | What Happens | User Sees |
|------|--------------|-----------|
| **Sign Up** | Account created in Supabase | Confirmation email sent message |
| **Email Sent** | Confirmation email delivered | Redirected to profile setup page |
| **Email Verified** | User clicks email link | Profile setup form appears |
| **Profile Setup** | Profile data saved to database | Profile photo uploaded to storage |
| **Dashboard** | Session established | User sees dashboard |

---

## 📁 File Structure

New files created:

```
src/
├── config/
│   └── emailConfig.ts           # Email settings
├── lib/
│   └── authService.ts           # Auth functions
├── pages/
│   ├── Auth.tsx                 # Updated signup
│   └── ProfileSetup.tsx         # NEW - Profile completion
└── components/auth/
    └── EmailVerification.tsx    # NEW - Email verification
```

---

## 🧪 Testing the Flow

### Test 1: Successful Signup

```bash
# 1. Go to http://localhost:5173/auth
# 2. Click "Create an Account"
# 3. Enter test email: test@example.com
# 4. Enter password: TestPassword123
# 5. Confirm password: TestPassword123
# 6. Click "Create Account"

# Expected: Redirect to /profile-setup
# You should see email verification screen
```

### Test 2: Resend Confirmation Email

```bash
# On profile setup page:
# 1. Look for "Resend Verification Email" button
# 2. Should be disabled for 5 minutes initially
# 3. Wait or click after cooldown
# 4. Should see success toast message
```

### Test 3: Complete Profile After Email Verification

```bash
# After clicking email confirmation link:
# 1. Profile form appears
# 2. Fill in: Full Name, Location
# 3. Optional: Phone, Bio, Photo
# 4. Click "Complete Setup & Go to Dashboard"
# 5. Should be redirected to dashboard
```

---

## ⚙️ Email Provider Setup

### Option A: Brevo (Recommended for beginners)

1. **Sign up:** https://www.brevo.com/ (free)
2. **Get credentials:**
   - Settings → SMTP & API
   - Copy SMTP Host, Username, Password
3. **Add to .env.local**
4. **Done!** Works immediately

### Option B: SendGrid

1. **Sign up:** https://sendgrid.com/
2. **Create API key:**
   - Settings → API Keys
   - Create New API Key
3. **Add to .env.local**
4. **Configure in Supabase:**
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - User: `apikey`
   - Pass: Your API key

### Option C: Mailgun

1. **Sign up:** https://www.mailgun.com/
2. **Get SMTP details:**
   - Domain Settings → SMTP
3. **Add to .env.local**
4. **Verify domain** (required for production)

---

## 🆘 Troubleshooting

### "No confirmation emails received"

**Check:**
```bash
✓ Email provider credentials in .env.local correct
✓ .env.local file exists and is readable
✓ Dev server restarted after changing .env.local
✓ Check spam/junk folder
✓ Look in browser console for errors (F12 → Console)
```

**Fix:**
```bash
# 1. Verify credentials are correct
# 2. Restart dev server
npm run dev

# 3. Try signing up with different email
# 4. Check Supabase logs:
#    Dashboard → Logs → filter "email"
```

### "Profile setup page not loading"

**Check:**
```bash
✓ Are you logged in? (Check DevTools → Storage → auth.)
✓ Is route added to App.tsx?
✓ No TypeScript errors in console?
```

**Fix:**
```bash
# 1. Open DevTools (F12)
# 2. Go to Console tab
# 3. Look for error messages
# 4. Check Network tab for failed requests
```

### "Image upload failed"

**Check:**
```bash
✓ File size < 5MB
✓ File format is JPG/PNG
✓ Storage bucket "profile-images" exists and is public
```

**Fix:**
```bash
# 1. In Supabase, check Storage:
#    - Bucket exists
#    - Is marked public
#    - Has correct policies

# 2. Try smaller image
# 3. Try different format
```

---

## 📊 Current Setup Checklist

- [x] Email configuration file created
- [x] Authentication utilities created
- [x] Profile setup page created
- [x] Email verification component created
- [x] Routes updated in App.tsx
- [x] Auth.tsx signup updated
- [x] Documentation created

### Next Steps (Optional)

- [ ] Customize email templates in Supabase
- [ ] Set up profile image optimization
- [ ] Add email verification analytics
- [ ] Create admin panel for user management
- [ ] Add two-factor authentication
- [ ] Set up email rate limiting

---

## 🔗 Key Routes

| Route | Purpose | Protection |
|-------|---------|-----------|
| `/auth` | Login/Signup | Public |
| `/profile-setup` | Complete profile | Protected (authenticated) |
| `/dashboard` | Main app | Protected (authenticated) |

---

## 💡 Pro Tips

1. **Whitelist Test Emails in Brevo**
   - Brevo free tier can send to whitelisted addresses
   - Add your test emails in Brevo settings

2. **Check Email Delivery**
   - Brevo Dashboard → Emails → Statistics
   - SendGrid Dashboard → Email Activity

3. **Development vs Production**
   - Use Brevo for testing
   - Use SendGrid for production (more reliable)

4. **Profile Images**
   - Stored in Supabase Storage
   - Public URLs generated automatically
   - User can update anytime from dashboard

5. **Security Notes**
   - Never commit `.env.local` to git
   - Rotate API keys periodically
   - Use environment-specific credentials

---

## 📞 Support

- Check [AUTHENTICATION_SETUP_COMPLETE.md](./AUTHENTICATION_SETUP_COMPLETE.md) for detailed info
- Review error messages in browser console (F12)
- Check Supabase Dashboard logs
- Verify email provider status

---

**Version:** 1.0
**Last Updated:** February 2026
