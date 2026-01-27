/**
 * Cloudflare Turnstile - Quick Reference Guide
 * 
 * Fast implementation guide for developers
 */

# 🎯 Quick Start

## 1. Import the Hook
```typescript
import { useTurnstile } from '@/hooks/useTurnstile';
```

## 2. Use in Component
```typescript
const MyComponent = () => {
  const { token, error, renderCaptcha } = useTurnstile();

  useEffect(() => {
    renderCaptcha('container-id');
  }, [renderCaptcha]);

  return <div id="container-id" />;
};
```

## 3. Validate Token
```typescript
const handleSubmit = () => {
  if (!token) {
    alert('Please verify you are not a robot');
    return;
  }
  // Submit form with token
};
```

---

## 📋 Full API Reference

### Hook Properties
```typescript
const {
  token,              // string | null - Current captcha token
  isLoading,          // boolean - Widget is loading
  error,              // string | null - Error message
  renderCaptcha,      // (id, options?) => Promise<void>
  reset,              // () => void - Reset widget
  remove,             // () => void - Remove widget
  getToken,           // () => string | null
  isExpired,          // () => boolean
} = useTurnstile();
```

### Options
```typescript
renderCaptcha('container-id', {
  theme: 'light',                    // 'light' | 'dark'
  size: 'normal',                    // 'normal' | 'compact'
  appearance: 'managed',             // 'always' | 'execute' | 'interaction-only'
  language: 'en',
  callback: (token) => {},           // On success
  'error-callback': () => {},        // On error
  'expired-callback': () => {},      // When token expires
});
```

---

## 🔑 Environment Setup

### Already Configured:
- ✅ `VITE_CLOUDFLARE_SITE_KEY` in `.env`
- ✅ Turnstile script in `index.html`
- ✅ Hook in `src/hooks/useTurnstile.ts`

### To Use in Your Component:
1. Import the hook
2. Call `renderCaptcha()` in `useEffect`
3. Check `token` before submission

---

## ✅ Current Implementation

**Location**: `/register` page (Step 1 - Personal Information)

**Features**:
- Rendered automatically on step 1
- Removed when leaving step 1
- Required for form submission
- Displays error/success messages
- Beautiful dark mode support

---

## 🚀 Next Steps: Backend Verification

### 1. Environment Variable
```bash
CLOUDFLARE_SECRET_KEY=your_secret_key_here
```

### 2. Create Verification Endpoint
```typescript
// POST /api/auth/verify-captcha
const { data } = req.body;

const response = await fetch(
  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.CLOUDFLARE_SECRET_KEY,
      response: data.token,
    }),
  }
);

const result = await response.json();
if (!result.success) throw new Error('Verification failed');
```

### 3. Check Before Signup
```typescript
// In your signup handler
const isVerified = await verifyTurnstile(token);
if (!isVerified) throw new Error('Captcha verification required');

// Proceed with signup...
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget not rendering | Check if `VITE_CLOUDFLARE_SITE_KEY` is set |
| Token always null | Wait for user to complete widget |
| Script not loading | Verify `index.html` has Turnstile script |
| Widget not visible | Check container ID matches exactly |
| Errors in console | Check browser console for Turnstile errors |

---

## 📚 Resources

- [Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Client-Side Implementation](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [Server-Side Verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

---

## 💡 Tips

✅ Always verify tokens on the backend
✅ Tokens expire after ~5 minutes
✅ Use `reset()` to allow user to retry
✅ Customize widget appearance with options
✅ Monitor completion rates in Cloudflare dashboard
✅ Never expose secret key in frontend

---

**Last Updated**: January 27, 2026
**Status**: Production Ready ✅
