# 🔗 Redirect URL Configuration Guide

## Current Issue

**site_url in supabase/config.toml:**
```
[auth]
site_url = "https://turuturustars.co.ke"
```

**Problem**: This only works for production. When testing locally at `http://localhost:5173`, email confirmation links redirect to the **production domain** instead of localhost.

---

## ✅ Solution: Environment-Specific Configuration

### For Local Development

When running `npm run dev` locally, you need email links to redirect to `http://localhost:5173`, not the production domain.

**Two options:**

#### Option A: Use Vercel CLI (Recommended for Testing)
```bash
# Install Vercel CLI
npm install -g vercel

# Set up local environment
vercel env pull  # Pulls environment variables from Vercel

# Run development server
npm run dev
```

**Why this works:**
- Vercel automatically handles environment-specific configurations
- Email links redirect correctly based on your dev environment
- No manual configuration needed

---

#### Option B: Manual Local Override
Create a `.env.local` file with development overrides:

```bash
# Create .env.local in project root
VITE_SUPABASE_URL=https://mkcgkfzltohxagqvsbqk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Your key here
```

Then update `supabase/config.toml`:

```toml
project_id = "mkcgkfzltohxagqvsbqk"

[auth]
# For production
site_url = "https://turuturustars.co.ke"

# For local development (comment out for production)
# site_url = "http://localhost:5173"
```

**When testing locally:**
1. Uncomment the localhost line
2. Comment out the production line
3. Run `npm run dev`
4. After testing, swap back for production

---

## 🔍 Current Status

**Production (turuturustars.co.ke):**
- ✅ site_url = `https://turuturustars.co.ke` 
- ✅ Email links work correctly
- ✅ Ready for production deployment

**Local Development (localhost:5173):**
- ⚠️ site_url = `https://turuturustars.co.ke` (MISMATCH)
- ❌ Email links redirect to production
- ⏳ Needs override for local testing

---

## 📋 Code Currently Using Correct Redirect URLs

The code in your app already uses **dynamic redirect URLs**:

**In Auth.tsx:**
```tsx
redirectTo: `${globalThis.location.origin}/register?mode=complete-profile`
```

**In EmailDiagnostics.tsx:**
```tsx
emailRedirectTo: `${window.location.origin}/register?mode=complete-profile`
```

**In ForgotPassword.tsx:**
```tsx
redirectTo: `${globalThis.location.origin}/reset-password`
```

✅ **This is correct!** The code uses `location.origin` which automatically adapts to the current domain.

---

## 🚀 The Real Problem

**Email Service (Brevo SMTP) Configuration:**

When Supabase sends an email confirmation, it uses the `site_url` from `config.toml` to generate the confirmation link. This link is embedded in the email.

**For development:**
- User signs up at `http://localhost:5173`
- Email is sent with link like: `https://turuturustars.co.ke/auth/callback?token=...`
- User clicks link → redirects to production site ❌
- User's email isn't confirmed locally ❌

**For production:**
- User signs up at `https://turuturustars.co.ke`
- Email is sent with link like: `https://turuturustars.co.ke/auth/callback?token=...`
- User clicks link → redirects to production site ✅
- User's email is confirmed ✅

---

## ✅ Solutions by Use Case

### Use Case 1: Testing Locally
**Goal:** Test email confirmation flow locally

**Solution:**
```bash
# 1. Update supabase/config.toml temporarily
[auth]
site_url = "http://localhost:5173"  # Use localhost for local testing

# 2. Run development server
npm run dev

# 3. Test signup and email flow

# 4. IMPORTANT: Revert before pushing
[auth]
site_url = "https://turuturustars.co.ke"  # Back to production
```

---

### Use Case 2: Deploying to Production
**Goal:** Deploy to turuturustars.co.ke

**Ensure:**
```bash
# supabase/config.toml MUST have:
[auth]
site_url = "https://turuturustars.co.ke"

# Deploy
git push origin main
```

---

### Use Case 3: Testing with ngrok (Advanced)
**Goal:** Test email flow with real domain-like URL

```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Start ngrok tunnel
ngrok http 5173
# Output: https://abc123.ngrok.io

# 3. Update supabase/config.toml
[auth]
site_url = "https://abc123.ngrok.io"

# 4. Run dev server
npm run dev

# 5. Access app at https://abc123.ngrok.io
# 6. Test email confirmation flow
```

---

## 📊 Quick Reference

| Environment | site_url | Used For |
|---|---|---|
| Local Development | `http://localhost:5173` | Testing email flow locally |
| Production (Live) | `https://turuturustars.co.ke` | Real users, production emails |
| Testing with ngrok | `https://abc123.ngrok.io` | Testing like production locally |

---

## ⚠️ Common Mistakes

❌ **Mistake 1:** Leave site_url as production when testing locally
- Result: Email links redirect to production, breaking local testing

❌ **Mistake 2:** Forget to revert config before pushing to production
- Result: Email links might redirect to localhost (if accidentally committed)

✅ **Best Practice:** 
- Keep `supabase/config.toml` for production
- Only edit when testing locally
- Always revert before committing

---

## 🔧 How to Configure for YOUR Use Case

### For Local Testing Right Now:

**Step 1:** Update `supabase/config.toml`
```toml
[auth]
site_url = "http://localhost:5173"  # Change this
```

**Step 2:** Save and run
```bash
npm run dev
```

**Step 3:** Test email signup at `http://localhost:5173`

**Step 4:** Revert before committing
```toml
[auth]
site_url = "https://turuturustars.co.ke"  # Change back
```

---

## 📞 Email Confirmation Link Flow

```
User signs up at: http://localhost:5173/auth
          ↓
Email sent with link: https://turuturustars.co.ke/auth/callback?token=xxx
          ↓
User clicks link
          ↓
Browser redirects to: https://turuturustars.co.ke/auth/callback?token=xxx
          ↓
❌ Wrong environment! (should be localhost)
```

**With correct site_url:**

```
User signs up at: http://localhost:5173/auth
          ↓
Email sent with link: http://localhost:5173/auth/callback?token=xxx
          ↓
User clicks link
          ↓
Browser redirects to: http://localhost:5173/auth/callback?token=xxx
          ↓
✅ Correct environment! Email confirmed locally
```

---

## ✨ Next Steps

1. **If testing locally now:**
   - [ ] Update `supabase/config.toml` → `site_url = "http://localhost:5173"`
   - [ ] Run `npm run dev`
   - [ ] Test email signup flow
   - [ ] Revert config back to production URL

2. **If deploying to production:**
   - [ ] Ensure `supabase/config.toml` → `site_url = "https://turuturustars.co.ke"`
   - [ ] Push to main branch
   - [ ] Verify emails work in production

3. **If stuck:**
   - [ ] Check `/email-diagnostics` page for system status
   - [ ] Verify email in spam folder
   - [ ] Review this guide again

---

**Last Updated:** January 31, 2026
**Status:** Configuration guide for environment-specific redirects
