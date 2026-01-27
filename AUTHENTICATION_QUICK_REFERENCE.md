# AuthenticationForm Quick Reference

## Import & Use

```tsx
import AuthenticationForm from '@/components/auth/AuthenticationForm';

// In your component/page
<AuthenticationForm initialMode="login" onSuccess={() => console.log('done')} />
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialMode` | `'login' \| 'signup'` | `'login'` | Which form to show first |
| `onSuccess` | `() => void` | - | Callback after successful auth |

---

## Features

✅ Login with email/password
✅ Signup with Turnstile captcha
✅ Google OAuth integration
✅ Form validation (Zod)
✅ Error handling
✅ Loading states
✅ Responsive design
✅ Dark overlay modal
✅ RLS error graceful handling
✅ Token verification
✅ Works localhost & production

---

## What It Does

1. **Loads Turnstile script** on component mount
2. **Renders captcha** only for signup mode
3. **Validates form** with Zod schemas
4. **Verifies Turnstile token** via Edge Function
5. **Creates auth user** with Supabase
6. **Creates profile** with proper headers
7. **Handles errors** gracefully
8. **Resets form** after success
9. **Redirects** to dashboard or profile completion

---

## Authentication Flow

```
User visits /auth
    ↓
AuthenticationForm loads
    ↓
Show login form by default
    ↓
User can switch to signup
    ↓
[LOGIN PATH]           [SIGNUP PATH]
  Fill email             Fill email
  Fill password          Fill password
  Click Sign In          Confirm password
                         Complete captcha
                         Click Create Account
                         
  ↓                      ↓
  
  Validate form          Validate form
  ↓                      ↓
  Sign in with           Verify captcha
  Supabase              ↓
  ↓                      Sign up with Supabase
  Success!              ↓
  Navigate to           Create profile
  dashboard             ↓
                        Success!
                        Switch to login
```

---

## Environment Variables

```bash
# Required
VITE_CLOUDFLARE_SITE_KEY=0x4AAAAAACRfKckufG5fhGU_
VITE_SUPABASE_URL=https://mkcgkfzltohxagqvsbqk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
```

---

## Error Messages

| Scenario | Message |
|----------|---------|
| Invalid email | "Please enter a valid email address" |
| Short password | "Password must be at least 8 characters" |
| Passwords don't match | "Passwords do not match" |
| Email exists | "This email is already registered. Please log in instead." |
| Wrong credentials | "Invalid email or password" |
| Email not confirmed | "Please check your email to confirm your account" |
| Captcha failed | "Security verification failed. Please try again." |
| Captcha expired | "Captcha expired. Please verify again." |
| Network error | "An unexpected error occurred. Please try again." |

---

## Console Logs

```javascript
✅ Turnstile script loaded
✅ Captcha rendered successfully
✅ Captcha verified
✅ Captcha reset
🔄 Captcha reset
❌ Captcha error - Check your site key and domain
⏱️ Captcha expired
⏱️ Captcha timeout
⚠️ Turnstile not supported in this browser
🗑️ Captcha removed
```

---

## Color Palette

```javascript
#00B2E3  // Primary Blue (buttons, accents)
#003366  // Deep Blue (headers, emphasis)
#FFFFFF  // White (background)
#F0F0F0  // Light Gray (secondary backgrounds)
#1C1C1C  // Black (text)
#00CC99  // Green (success, highlights)
#EF4444  // Red (errors)
#22C55E  // Green (success states)
```

---

## Validation Rules

### Login
- Email: valid email format
- Password: min 6 characters

### Signup
- Email: valid email format
- Password: min 8 characters
- Confirm password: must match
- Captcha: must be completed

---

## Key Improvements

| Issue | Before | After |
|-------|--------|-------|
| Turnstile render | String ID | React ref ✅ |
| MIME type errors | Not handled | Properly initialized ✅ |
| Supabase headers | Missing | Handled by SDK ✅ |
| RLS errors | Crash | Graceful handling ✅ |
| Error messages | Technical | User-friendly ✅ |
| Responsive | Partial | Full mobile ✅ |
| Accessibility | Basic | Enhanced ✅ |

---

## Testing

### Local Testing
```bash
npm run dev
# Visit http://localhost:5173/auth
```

### Test Accounts
```
Email: test@example.com
Password: Test123456
```

### Test Turnstile
- Captcha appears for signup
- Can be verified in test mode
- Shows "Verified" on success

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Turnstile not showing | Check `VITE_CLOUDFLARE_SITE_KEY` in .env |
| Login fails | Verify email/password in Supabase |
| Profile not created | Check RLS policies in Supabase |
| Google OAuth fails | Check redirect URI in Google Console |
| MIME type error | Clear browser cache, reload |
| Module import fails | Clear cache, restart dev server |

---

## Browser Support

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
❌ IE 11 (not supported)

---

## Next Steps

1. **Import component** in your Auth page
2. **Test on localhost** - npm run dev
3. **Deploy to production**
4. **Monitor console** for errors
5. **Remove old components** (useCaptcha.ts, etc)

---

## Security Notes

🔒 Passwords sent securely to Supabase
🔒 Turnstile secret never exposed to frontend
🔒 Session tokens managed by Supabase
🔒 All requests over HTTPS
🔒 No hardcoded secrets in code

---

## Performance

⚡ Lazy loads Turnstile script (not on initial page load)
⚡ Memoized functions prevent re-renders
⚡ Conditional rendering (only signup needs captcha)
⚡ Efficient form validation
⚡ ~620 lines of code (down from 900+)

---

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `AuthenticationForm.tsx` | 620 | Main component (all-in-one) |
| `AUTHENTICATION_FORM_GUIDE.md` | Comprehensive | Full documentation |
| `AUTHENTICATION_INTEGRATION.md` | Detailed | How to integrate |
| `AUTHENTICATION_TECHNICAL_DEEP_DIVE.md` | Technical | Deep dive into fixes |

---

## Related Files

**Keep:**
- ✅ src/components/auth/StepByStepRegistration.tsx (profile completion)
- ✅ src/components/ForgotPassword.tsx (password reset)

**Can Delete:**
- ❌ src/hooks/useCaptcha.ts
- ❌ src/hooks/useTurnstile.ts
- ❌ src/components/auth/TurnstileExamples.tsx
- ❌ src/components/TurnstileDebugComponent.tsx

**Update:**
- ⚠️ src/pages/Auth.tsx (make simple wrapper)
- ⚠️ src/components/auth/AuthFlow.tsx (use new component)

---

## Quick Start Code

```tsx
// pages/Auth.tsx
import AuthenticationForm from '@/components/auth/AuthenticationForm';

export default function Auth() {
  return <AuthenticationForm initialMode="login" />;
}

// DONE! ✅
```

---

## Support

📚 Read AUTHENTICATION_FORM_GUIDE.md for detailed docs
💻 Check component source code for inline comments
🐛 Check browser console (F12) for error messages
✉️ Email logs if needed

---

**Version**: 1.0.0
**Status**: Production Ready ✅
**Last Updated**: January 27, 2026
