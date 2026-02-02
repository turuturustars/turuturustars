# 📧 Supabase Email Template Setup Guide

## Professional Email Confirmation Template for Turuturu Stars

This guide explains how to configure your professional email confirmation template in Supabase.

---

## 📋 Quick Summary

**Template File:** `SUPABASE_EMAIL_CONFIRMATION_TEMPLATE.html`

**Features:**
- ✅ Professional gradient header with Turuturu Stars branding (cyan #0ea5e9)
- ✅ Organization logo from GitHub
- ✅ Responsive mobile design
- ✅ Clear call-to-action button
- ✅ Security notice and expiration information
- ✅ Social links (Facebook, WhatsApp)
- ✅ Support contact links
- ✅ Production-ready for turuturustars.co.ke domain

---

## 🔧 Deployment Steps

### Step 1: Log into Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your **Turuturu Stars** project
3. Navigate to **Authentication → Email Templates** (or Settings → Email)

### Step 2: Select "Confirm email" Template
1. Look for the email template list
2. Click on **"Confirm email"** template
3. Click **"Edit"** or **"Customize"**

### Step 3: Copy the Template Content
1. Open `SUPABASE_EMAIL_CONFIRMATION_TEMPLATE.html` 
2. **Select all** (Ctrl+A) and **copy** (Ctrl+C)
3. Paste into Supabase's HTML template editor

### Step 4: Important - Template Variables
The template uses **Supabase template variables**:
- `{{ .ConfirmationURL }}` - The email confirmation link
- `{{ .Email }}` - The user's email address

**DO NOT change these variables** - Supabase will automatically populate them.

### Step 5: Save & Test
1. Click **Save** in Supabase
2. Send a test email to verify formatting

---

## 📧 Testing Your Template

### Test Email Signup Flow
1. Go to your app at https://turuturustars.co.ke
2. Click **Sign Up** → **Register**
3. Complete the 6-step registration form
4. Check your test email inbox
5. Verify that:
   - Logo displays correctly
   - Button renders with gradient
   - Confirmation link works
   - Email is responsive on mobile

### Expected Email Content
- Header: Cyan gradient with Turuturu Stars logo
- Main message: Welcome text + instructions
- CTA Button: "Confirm Email Address" in cyan
- Security notice: Yellow alert box
- Footer: Contact info + social links
- Support email: support@turuturustars.co.ke

---

## 🎨 Customization Guide

If you need to modify the template:

### Change Brand Color
Find: `background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);`
Replace `#0ea5e9` and `#0284c7` with your colors

### Update Logo URL
Find: `https://github.com/turuturustars.png?size=96`
Replace with your logo URL (must be HTTPS)

### Change Organization Name
Find: `Turuturu Stars` and `Community Based Organization`
Update all instances as needed

### Update Support Contact
Find: `support@turuturustars.co.ke`
Replace with your actual support email

### Update Social Links
Find the social links section and update URLs:
- Facebook: `https://www.facebook.com/profile.php?id=61586034996115`
- WhatsApp: `https://chat.whatsapp.com/GGTZMqkT2akLenI23wWrN7`
- Website: `https://turuturustars.co.ke`

---

## ✅ Checklist Before Going Live

- [ ] Copied entire HTML template to Supabase Email Templates
- [ ] Verified `{{ .ConfirmationURL }}` variable is present
- [ ] Verified `{{ .Email }}` variable is present
- [ ] Tested with a real signup
- [ ] Confirmed email receives correct confirmation link
- [ ] Verified button is clickable and links work
- [ ] Tested on mobile device (responsive design)
- [ ] Checked that logo loads from GitHub
- [ ] Verified support email is correct
- [ ] Confirmed footer links work correctly

---

## 🌐 Domain Configuration

Your Supabase project is already configured with:
- **Site URL:** `https://turuturustars.co.ke` (in config.toml)
- **Confirmation Redirect:** `/auth/confirm`
- **Full Confirmation URL:** `https://turuturustars.co.ke/auth/confirm?token=...`

These are **automatically generated** by Supabase, so the email template will always use the correct domain.

---

## 🚀 Email Flow Summary

1. User signs up at `/register` with email
2. Supabase automatically sends **Confirm email** template
3. Email contains: Logo + Welcome message + Confirm button
4. User clicks button → Redirected to `https://turuturustars.co.ke/auth/confirm`
5. Your app verifies token and completes registration
6. User is logged in and shown success message

---

## 📞 Troubleshooting

**Email not received?**
- Check spam/junk folder
- Verify email address in test signup
- Check Supabase logs for SMTP errors
- Confirm your email provider is configured (SMTP relay with Brevo)

**Template not rendering?**
- Ensure you copied the ENTIRE HTML file
- Check that {{ variables }} are not modified
- Test with a fresh signup
- Clear browser cache and retry

**Logo not loading?**
- Verify GitHub URL is accessible: https://github.com/turuturustars.png?size=96
- Use an image hosting service if GitHub is blocked in your region
- Ensure image is HTTPS (not HTTP)

**Confirmation link not working?**
- Verify site_url in config.toml is `https://turuturustars.co.ke`
- Check /auth/confirm page is deployed
- Test confirmation flow locally first

---

## 📚 Related Documentation

- [Email Registration Flow Guide](./docs/REGISTRATION_FLOW_DIAGRAM.md)
- [Authentication Checklist](./AUTHENTICATION_CHECKLIST.md)
- [Email Configuration Guide](./EMAIL_CONFIGURATION_GUIDE.md)
- [Supabase Auth Setup](./START_AUTHENTICATION_HERE.md)

---

## 🎯 Next Steps

1. **Deploy this template** to your Supabase project
2. **Test the email flow** with a test signup
3. **Configure your email provider** (Brevo SMTP recommended)
4. **Monitor email logs** in Supabase dashboard
5. **Update footer links** if needed (social media, website)

---

**Template Version:** 1.0 (Professional Edition)
**Last Updated:** 2026
**Compatible with:** Supabase Auth v2+
**Domain:** turuturustars.co.ke
