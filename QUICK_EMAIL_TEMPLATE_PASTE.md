# 📋 Quick Copy-Paste Guide for Supabase Email Template

## ⚠️ IMPORTANT: Variable Syntax Check

Before copying the template, you need to know which variable syntax your Supabase uses.

### Syntax Option 1: Dot Notation (Most Common)
```
{{ .ConfirmationURL }}
{{ .Email }}
```

### Syntax Option 2: Lowercase
```
{{ confirmation_url }}
{{ email }}
```

---

## 🎯 How to Find Your Supabase Variable Format

1. Go to https://app.supabase.com
2. Select your project
3. Click **Authentication → Email Templates**
4. Click on any existing template (like "Magic Link")
5. Look at the template - you'll see the variable format being used

**Common Pattern:** If you see `{{ .SomeVariable }}` → Use Option 1 (TEMPLATE.html)
**If you see:** `{{ some_variable }}` → Use Option 2 (TEMPLATE_ALT.html)

---

## 📋 Copy-Paste Instructions

### For Syntax Option 1 ({{ .ConfirmationURL }} and {{ .Email }})

**Use file:** `SUPABASE_EMAIL_CONFIRMATION_TEMPLATE.html`

1. Open the file
2. Select ALL content (Ctrl+A)
3. Copy (Ctrl+C)
4. In Supabase: Authentication → Email Templates → "Confirm email" → Edit
5. Paste into the HTML editor (Ctrl+V)
6. Click Save

---

### For Syntax Option 2 ({{ confirmation_url }} and {{ email }})

**Use file:** `SUPABASE_EMAIL_CONFIRMATION_TEMPLATE_ALT.html`

1. Open the file
2. Select ALL content (Ctrl+A)
3. Copy (Ctrl+C)
4. In Supabase: Authentication → Email Templates → "Confirm email" → Edit
5. Paste into the HTML editor (Ctrl+V)
6. Click Save

---

## ✅ After Pasting: Verification Checklist

Before clicking Save, verify:

- [ ] All template content is visible in editor
- [ ] No error messages showing
- [ ] HTML looks properly formatted (indented code visible)
- [ ] You can see either `{{ .ConfirmationURL }}` OR `{{ confirmation_url }}`
- [ ] You can see either `{{ .Email }}` OR `{{ email }}`
- [ ] The cyan color codes are visible: `#0ea5e9` and `#0284c7`
- [ ] No red error highlights in the editor

Then click **Save** → Should see success message ✅

---

## 🧪 Test the Template Immediately

1. Don't close Supabase yet
2. In new tab: Go to https://turuturustars.co.ke/register
3. Fill out the registration form (use a test email you can access)
4. Submit the form
5. Check your test email inbox (within 1 minute)
6. Verify:
   - You receive an email from noreply@turuturustars.co.ke
   - Subject: "Confirm your email for Turuturu Stars"
   - Email has the cyan gradient header
   - Logo displays correctly
   - Button says "Confirm Email Address"
   - Email looks professional and branded

---

## 📊 Quick Reference: Template Sections

### What Should Be in the Email

```
[Gradient Header with Logo]
    ↓
[Main Content Section]
- Welcome message
- Explanation of confirmation
    ↓
[Action Button]
"Confirm Email Address"
    ↓
[Backup Link]
Plain text URL (in case button doesn't work)
    ↓
[Security Notice]
Yellow box warning about link expiration
    ↓
[What's Next Section]
4-step explanation of next process
    ↓
[Support Information]
Link to support page
    ↓
[Footer]
Organization name, location, social links, copyright
```

---

## 🚨 If Template Doesn't Work

### Scenario 1: Variables not being replaced ({{ .Email }} showing in email)
**Solution:** 
- Template might be using wrong variable syntax
- Try the ALT template instead
- Or check Supabase docs for correct variable names

### Scenario 2: Template not saving
**Solution:**
- Check HTML for syntax errors
- Copy-paste one more time ensuring ALL content is selected
- Check file size (template is ~6-7 KB)

### Scenario 3: Email not being sent after saving
**Solution:**
- Email provider may not be configured
- Check Supabase → Auth → Providers
- Verify SMTP relay is set up (Brevo recommended)
- Check Supabase logs for errors

### Scenario 4: Logo not showing in email
**Solution:**
- GitHub URL might be blocked
- Replace with your own hosting:
  - AWS S3
  - Cloudinary
  - Any HTTPS image hosting
- Keep image size at 96x96 or 64x64 pixels

---

## 🎨 Color Scheme Reference

If you need to customize colors later:

**Primary Cyan:** `#0ea5e9` (brand color, links, button)
**Dark Cyan:** `#0284c7` (gradient darker shade)
**Text Dark:** `#1f2937` (headings)
**Text Medium:** `#4b5563` (body text)
**Text Light:** `#6b7280` (secondary text)
**Warning Yellow:** `#fef3c7` (security notice background)
**Warning Border:** `#f59e0b` (security notice left border)
**Background Light:** `#f8fafc` (email background)
**Background Card:** `#ffffff` (white)
**Border:** `#e5e7eb` (dividers)

---

## 📞 Contact Information in Template

These are embedded in the email - verify they're correct:

- **Support Email:** support@turuturustars.co.ke
- **Website:** https://turuturustars.co.ke
- **Location:** Turuturu Primary School, Muranga County, Kenya
- **Facebook:** https://www.facebook.com/profile.php?id=61586034996115
- **WhatsApp:** https://chat.whatsapp.com/GGTZMqkT2akLenI23wWrN7

If any of these are wrong, edit the template HTML before pasting into Supabase.

---

## ⏱️ Estimated Time

- Read this guide: **2 minutes**
- Paste template into Supabase: **1 minute**
- Test with registration: **2 minutes**
- **Total: ~5 minutes** ✅

---

## 🚀 You're Ready!

1. Choose your template (primary or ALT based on variable syntax)
2. Copy the file content
3. Paste into Supabase Email Templates
4. Click Save
5. Test immediately with registration
6. Done! 🎉

---

**Support:** If template isn't showing correctly, compare with the HTML files in your project folder:
- `SUPABASE_EMAIL_CONFIRMATION_TEMPLATE.html` (Primary)
- `SUPABASE_EMAIL_CONFIRMATION_TEMPLATE_ALT.html` (Backup)

Both have identical design - only variable syntax differs.
