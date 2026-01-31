# 🚀 Quick Start: Fix Email Redirect Issues

## Problem Identified ✅

Your Supabase `site_url` is set to **production domain** (`https://turuturustars.co.ke`), but when testing locally, email confirmation links redirect to the **wrong place**.

**Current Status:**
```toml
[auth]
site_url = "https://turuturustars.co.ke"  ← Production only!
```

---

## Solution: 3 Easy Commands

### For Local Testing Now:

```bash
# 1. Switch to development configuration
npm run config:dev

# 2. Run the dev server
npm run dev

# 3. Test email flow at http://localhost:5173
```

When you're done testing locally, switch back:

```bash
# Switch back to production
npm run config:prod
```

---

## What These Commands Do

```bash
npm run config:dev     # Sets site_url = "http://localhost:5173"
npm run config:prod    # Sets site_url = "https://turuturustars.co.ke"
npm run config:show    # Shows current configuration
```

---

## ✅ Email Flow After Fix

**Before (❌ Broken):**
```
User at localhost → Email with production link → ❌ Wrong domain
```

**After (✅ Fixed):**
```
User at localhost → Email with localhost link → ✅ Correct domain
```

---

## 📋 Step-by-Step for Testing

1. **Prepare:**
   ```bash
   npm run config:dev
   npm run dev
   ```

2. **Test Signup:**
   - Go to http://localhost:5173/auth
   - Create account with test email
   - Check `/email-diagnostics` page

3. **Verify Email:**
   - Wait 1-2 minutes
   - Check your email inbox
   - Click confirmation link
   - Should redirect to localhost ✅

4. **Cleanup:**
   ```bash
   npm run config:prod
   # Before pushing to git!
   ```

---

## 🔍 Current Configuration

Check current state:
```bash
npm run config:show
```

**Output example:**
```
📋 Current Email Configuration:

File: /path/to/supabase/config.toml
Current site_url: https://turuturustars.co.ke

Available configurations:
     dev  - Development (localhost:5173)
       site_url: http://localhost:5173
  ✅ prod  - Production (turuturustars.co.ke)
       site_url: https://turuturustars.co.ke
```

---

## ⚠️ Important Notes

1. **Always switch back to production before committing:**
   ```bash
   npm run config:prod
   git add .
   git commit -m "Fix email confirmation"
   ```

2. **The config file is tracked by git**, so be careful not to accidentally commit dev settings

3. **Email links are generated when emails are sent**, so the site_url must be correct **before** user signs up

---

## 🎯 Testing Workflow

```bash
# Step 1: Switch to dev
npm run config:dev

# Step 2: Start dev server
npm run dev
# App runs at: http://localhost:5173

# Step 3: Test signup
# - Go to http://localhost:5173/auth
# - Sign up with test email
# - Check your email for confirmation link
# - Click link → should work! ✅

# Step 4: Switch back to production
npm run config:prod

# Step 5: Commit changes
git add .
git commit -m "Test email configuration"
git push origin main
```

---

## 🆘 If Email Still Not Working

1. ✅ Did you run `npm run config:dev`?
2. ✅ Did you wait 1-2 minutes for email?
3. ✅ Did you check spam folder?
4. ✅ Did you check `/email-diagnostics` page?

If still stuck:
- [ ] Review: [REDIRECT_URL_CONFIG.md](REDIRECT_URL_CONFIG.md)
- [ ] Review: [SMTP_EMAIL_VERIFICATION.md](SMTP_EMAIL_VERIFICATION.md)
- [ ] Check: Email Diagnostics page at `/email-diagnostics`

---

## 📊 Configuration Reference

| Command | What It Does | When to Use |
|---------|-------------|------------|
| `npm run config:dev` | Sets site_url to localhost | Before testing locally |
| `npm run config:prod` | Sets site_url to production | Before deploying/pushing |
| `npm run config:show` | Shows current setting | Anytime to check status |

---

## ✨ Next Steps

1. **Right now:** `npm run config:dev`
2. **Then:** `npm run dev`
3. **Test:** Email signup at localhost
4. **Before committing:** `npm run config:prod`
5. **Done!** ✅

---

**Ready?** Run `npm run config:dev` and test! 🚀
