# Supabase Email Configuration - Production Setup

## Quick Setup Checklist

Follow these steps to enable email verification for your production environment.

---

## Step 1: Configure Supabase Auth Settings

### In Supabase Dashboard:
1. Go to **Project Settings** → **Authentication**
2. Under **Email Configuration**, select your email provider:
   - **Option A: Brevo (Recommended for Production)**
   - **Option B: SendGrid**
   - **Option C: Custom SMTP**

---

## Step 2: Set Site URL

### In config.toml:
```toml
[auth]
site_url = "https://turuturustars.co.ke"
```

### Why this matters:
- All email links will use this base URL
- Confirmation link: `https://turuturustars.co.ke/auth/confirm?token=xxx`
- Password reset link: `https://turuturustars.co.ke/auth/reset-password?token=xxx`

---

## Step 3: Configure Email Verification

### Email Confirmation (Required):
1. Dashboard → **Authentication** → **Email Templates**
2. Click **Email Confirmation Template**
3. Customize the email template:
   ```html
   <h1>Confirm your email</h1>
   <p>Hi {{ email }},</p>
   <p>Please confirm your email address to complete your registration 
   with Turuturu Stars Community.</p>
   
   <a href="{{ confirmation_url }}" 
      style="background: #0066ff; color: white; padding: 10px 20px; 
             border-radius: 5px; text-decoration: none;">
     Confirm Email
   </a>
   
   <p>Or copy this link:</p>
   <p>{{ confirmation_url }}</p>
   
   <p>This link expires in 24 hours.</p>
   <p>Welcome to Turuturu Stars!</p>
   ```

### Key Variables Available:
- `{{ email }}` - User's email address
- `{{ confirmation_url }}` - Full confirmation link
- `{{ site_url }}` - Your site URL
- `{{ link }}` - Just the token path

---

## Step 4: Configure Password Reset (Optional but Recommended)

### Password Reset Template:
1. Dashboard → **Authentication** → **Email Templates**
2. Click **Password Reset Template**
3. Customize similarly to confirmation email

---

## Step 5: Set Up Email Provider

### Option A: Brevo (Recommended)

1. Sign up at https://www.brevo.com
2. Create API key (Settings → API Keys)
3. In Supabase Dashboard → Authentication → Email:
   - Select **Brevo** as provider
   - Paste API key
   - Set "From Name": `Turuturu Stars`
   - Set "From Email": `noreply@turuturustars.co.ke`

**Note:** You'll need to verify the sender domain in Brevo

### Option B: SendGrid

1. Sign up at https://sendgrid.com
2. Create API key (Settings → API Keys)
3. In Supabase Dashboard → Authentication → Email:
   - Select **SendGrid** as provider
   - Paste API key
   - Set sender: `noreply@turuturustars.co.ke`

### Option C: Custom SMTP

If you have your own SMTP server:
```
Host: smtp.your-provider.com
Port: 587 (or 465 for SSL)
Username: your-email@domain.com
Password: your-password
From: noreply@turuturustars.co.ke
```

---

## Step 6: Update Auth Redirect Routes

### In Supabase Dashboard:
1. Go to **Project Settings** → **Authentication**
2. Under **URL Configuration**, add **Redirect URLs**:
   ```
   https://turuturustars.co.ke/auth/confirm
   https://turuturustars.co.ke/auth/reset-password
   https://turuturustars.co.ke
   ```

### In your app (config.toml):
Already set to:
```toml
site_url = "https://turuturustars.co.ke"
```

---

## Step 7: Verify Routes Exist

Make sure these routes are created in your React app:

```typescript
// src/App.tsx or Router configuration
import EmailConfirmation from '@/pages/auth/EmailConfirmation';

const routes = [
  { path: '/auth/confirm', element: <EmailConfirmation /> },
  { path: '/auth/reset-password', element: <ResetPassword /> },
  // ... other routes
];
```

---

## Step 8: Test Email Flow

### Local Testing:
```bash
# Start local Supabase
supabase start

# Check email in Supabase logs
# Should see "Email sent to: user@example.com"
```

### Staging Testing:
1. Go to https://staging.turuturustars.co.ke/register
2. Fill form with test email (use Gmail)
3. Submit
4. Check email inbox for confirmation
5. Click confirmation link
6. Should be redirected to dashboard

### Production Verification:
1. Monitor Supabase Dashboard → Authentication → Users
2. Check `email_confirmed_at` column
3. Should show timestamp for verified users

---

## Step 9: Rate Limiting (Optional but Recommended)

Configure rate limits to prevent spam:
1. Dashboard → Authentication → Auth Policies
2. Set limits:
   - Email confirmation resend: 3 per hour
   - Password reset: 3 per hour
   - Login attempts: 10 per hour

---

## Troubleshooting

### Issue: Email not received
**Solution:**
1. Check SMTP/email provider settings
2. Verify sender domain is approved
3. Check spam folder
4. Look at Supabase logs for errors

### Issue: "Invalid token" error
**Solution:**
- Token expires after 24 hours
- User needs to request new confirmation email
- Check link wasn't modified in email client

### Issue: Redirect not working
**Solution:**
1. Verify `site_url` in config.toml
2. Check redirect URLs in Supabase
3. Ensure `/auth/confirm` route exists
4. Check browser console for errors

---

## Monitoring & Alerts

### Track these metrics:
1. **Signup completion rate** - % users completing registration
2. **Email verification rate** - % users verifying email
3. **Email bounce rate** - % emails failing to deliver
4. **Time to verify** - Average time from signup to verification

### Set up alerts:
1. High bounce rate (> 5%)
2. Low verification rate (< 70%)
3. SMTP failures

---

## Security Checklist ✅

- [ ] HTTPS enabled (turuturustars.co.ke)
- [ ] Email provider API key secure
- [ ] Verification tokens expire (24h)
- [ ] Rate limiting enabled
- [ ] From address verified
- [ ] Redirect URLs whitelist configured
- [ ] No sensitive data in email URLs
- [ ] Logs monitored for failures

---

## Environment Variables

**Supabase Configuration** (in config.toml):
```toml
project_id = "mkcgkfzltohxagqvsbqk"

[auth]
site_url = "https://turuturustars.co.ke"

# Email will be configured in Supabase dashboard
# No additional env vars needed here
```

**App Configuration** (in .env):
```
VITE_SUPABASE_URL=https://mkcgkfzltohxagqvsbqk.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Deployment Checklist

Before going live:
- [ ] Email provider configured
- [ ] Test email sent successfully
- [ ] site_url updated to production
- [ ] Redirect routes implemented
- [ ] EmailConfirmation.tsx deployed
- [ ] emailRegistration.ts deployed
- [ ] StepByStepRegistration.tsx updated
- [ ] Database migrations run
- [ ] Monitoring set up
- [ ] Support email configured

---

## Next Steps

1. ✅ Supabase auth configured
2. ✅ Email provider set up
3. ✅ Routes created
4. [ ] Test email flow
5. [ ] Deploy to production
6. [ ] Monitor metrics
7. [ ] Adjust based on feedback

---

## Support

- **Supabase Docs:** https://supabase.com/docs/guides/auth/auth-email
- **Email Provider Support:** Check your provider's docs
- **App Support:** support@turuturustars.co.ke
