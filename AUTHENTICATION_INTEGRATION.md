# Integration Guide: Using AuthenticationForm in Your App

## Quick Start (5 minutes)

### Step 1: Import the Component

Replace your existing auth components with:

```tsx
import AuthenticationForm from '@/components/auth/AuthenticationForm';
```

### Step 2: Use in Your Pages

#### Option A: Replace Auth.tsx

**Before** (current):
```tsx
// src/pages/Auth.tsx
const Auth = () => {
  // 100+ lines of code managing forms, captcha, etc.
  return (
    <div>
      {/* Complex login/signup form */}
    </div>
  );
};
```

**After** (refactored):
```tsx
// src/pages/Auth.tsx
import AuthenticationForm from '@/components/auth/AuthenticationForm';

const Auth = () => {
  return <AuthenticationForm initialMode="login" />;
};

export default Auth;
```

#### Option B: Replace in AuthFlow

**Before**:
```tsx
// src/components/auth/AuthFlow.tsx
if (authState === 'unauthenticated') {
  return <Auth />;
}
```

**After**:
```tsx
// src/components/auth/AuthFlow.tsx
import AuthenticationForm from '@/components/auth/AuthenticationForm';

if (authState === 'unauthenticated') {
  return <AuthenticationForm initialMode="login" />;
}
```

#### Option C: Use in Router

```tsx
// src/router.tsx
import AuthenticationForm from '@/components/auth/AuthenticationForm';

const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthenticationForm initialMode="login" />,
  },
  {
    path: '/auth/signup',
    element: <AuthenticationForm initialMode="signup" />,
  },
]);
```

---

## File-by-File Migration

### 1. src/pages/Auth.tsx

**Current**: 677 lines managing login, signup, password recovery, Turnstile

**New**: Simple wrapper

```tsx
import AuthenticationForm from '@/components/auth/AuthenticationForm';
import { usePageMeta } from '@/hooks/usePageMeta';

const Auth = () => {
  usePageMeta({
    title: 'Sign In - Turuturu Stars CBO',
    description: 'Sign in to your account',
  });

  return <AuthenticationForm initialMode="login" />;
};

export default Auth;
```

---

### 2. src/hooks/useCaptcha.ts

**Current**: Custom Turnstile hook with manual lifecycle management

**New**: No longer needed! AuthenticationForm handles all Turnstile logic internally

```tsx
// You can keep this file for other uses, but remove from Auth page
// AuthenticationForm has its own Turnstile management
```

---

### 3. src/hooks/useTurnstile.ts

**Current**: Another Turnstile hook with 246 lines

**New**: Handled internally by AuthenticationForm

```tsx
// This hook is now superseded
// Use AuthenticationForm instead
```

---

### 4. src/components/auth/StepByStepRegistration.tsx

**Current**: Complex multi-step form (899 lines)

**New**: AuthenticationForm handles signup + profile completion

The new flow:
1. User signs up with AuthenticationForm
2. Gets redirected to complete profile page
3. Existing profile completion form can stay

```tsx
// Keep this file if you need step-by-step profile completion
// It's called AFTER signup is complete
```

---

## Detailed Implementation

### Full Page Component

```tsx
// src/pages/Auth.tsx
import { useSearchParams } from 'react-router-dom';
import AuthenticationForm from '@/components/auth/AuthenticationForm';
import { usePageMeta } from '@/hooks/usePageMeta';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  usePageMeta({
    title: mode === 'signup' ? 'Sign Up - Turuturu Stars' : 'Sign In - Turuturu Stars',
    description: mode === 'signup' 
      ? 'Create your account' 
      : 'Sign in to your account',
  });

  return <AuthenticationForm initialMode={mode} />;
};

export default Auth;
```

### In a Layout

```tsx
// src/layouts/PublicLayout.tsx
import { Outlet } from 'react-router-dom';
import AuthenticationForm from '@/components/auth/AuthenticationForm';

export default function PublicLayout() {
  return (
    <div>
      <header>{/* Your header */}</header>
      <main>
        <Outlet /> {/* Page content */}
      </main>
      <footer>{/* Your footer */}</footer>
    </div>
  );
}
```

### With Toast Notifications

```tsx
// src/pages/Auth.tsx
import AuthenticationForm from '@/components/auth/AuthenticationForm';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: 'Success!',
      description: 'You have been authenticated.',
    });
  };

  return <AuthenticationForm initialMode="login" onSuccess={handleSuccess} />;
};
```

---

## Environment Setup

### 1. Verify .env.production

```bash
# Must have these variables
VITE_CLOUDFLARE_SITE_KEY=0x4AAAAAACRfKckufG5fhGU_
VITE_SUPABASE_URL=https://mkcgkfzltohxagqvsbqk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
```

### 2. Verify .env (development)

```bash
# For local testing
VITE_CLOUDFLARE_SITE_KEY=0x4AAAAAACXY...test_key...
```

### 3. Supabase Configuration

Ensure these exist in Supabase dashboard:

✅ Auth enabled
✅ Email/password provider enabled
✅ Google OAuth configured
✅ Database `profiles` table created
✅ RLS policies allow user creation

---

## Testing Checklist

### Local Testing (localhost:5173)

- [ ] Page loads without errors
- [ ] Turnstile captcha appears
- [ ] Can type in email field
- [ ] Can type in password field
- [ ] Toggle password visibility works
- [ ] Switch between login/signup works
- [ ] Form validation works (empty fields)
- [ ] Form validation works (invalid email)
- [ ] Form validation works (short password)
- [ ] Can complete captcha (in test mode)
- [ ] Submit button shows loading state
- [ ] Can sign up with test email
- [ ] Can sign in with correct credentials
- [ ] Shows error for invalid credentials
- [ ] Google OAuth button works
- [ ] Responsive design works on mobile

### Production Testing

- [ ] Same tests as above on production domain
- [ ] Real Turnstile captcha appears (not test mode)
- [ ] Email confirmation flow works
- [ ] Password reset flow works
- [ ] Error messages are clear
- [ ] No console errors

### Browser Testing

- [ ] Chrome/Edge ✅
- [ ] Firefox ✅
- [ ] Safari ✅
- [ ] Mobile Safari ✅
- [ ] Chrome Mobile ✅

---

## Troubleshooting

### "Turnstile script failed to load"

**Problem**: Script can't load from CDN

**Solutions**:
```tsx
// Check site key
console.log(import.meta.env.VITE_CLOUDFLARE_SITE_KEY)

// Check network - should see:
// https://challenges.cloudflare.com/turnstile/v0/api.js

// Clear browser cache and reload
```

### "Captcha verification failed"

**Problem**: Token validation on backend failed

**Solutions**:
1. Check Edge Function logs in Supabase
2. Verify Turnstile secret key is set
3. Check that token isn't expired
4. Try resetting browser cache

### "Email already registered"

**Problem**: User tries to sign up with existing email

**Expected behavior**: Component shows error message
**User should**: Click to switch to login mode

---

## Code Cleanup (After Migration)

After implementing AuthenticationForm, you can remove:

```bash
# No longer needed (Turnstile is internal to new component)
src/hooks/useCaptcha.ts          ❌ Delete
src/hooks/useTurnstile.ts        ❌ Delete  
src/hooks/useTurnstileDebug.ts   ❌ Delete

# No longer needed (Turnstile examples)
src/components/auth/TurnstileExamples.tsx     ❌ Delete
src/components/TurnstileDebugComponent.tsx    ❌ Delete

# Can delete if fully replaced by AuthenticationForm
src/pages/Auth.tsx               ⚠️ Simplify to wrapper
src/components/ForgotPassword.tsx ⚠️ Keep (if needed)

# Keep but check if needed
src/components/auth/StepByStepRegistration.tsx ✅ Keep
```

---

## Performance Impact

**Before**:
- Turnstile script: Lazy loaded on demand ✅
- useCaptcha hook: ~156 lines
- Auth.tsx: ~677 lines
- **Total**: ~900 lines in hooks/pages

**After**:
- Turnstile script: Lazy loaded on demand ✅
- AuthenticationForm: ~620 lines (all-in-one)
- Auth.tsx: ~20 lines (simple wrapper)
- **Total**: ~640 lines
- **Savings**: ~260 lines of code
- **Bundle size**: Slightly smaller
- **Performance**: Same or better (better organization)

---

## Features Comparison

| Feature | Old Components | AuthenticationForm |
|---------|---|---|
| Login | ✅ Auth.tsx | ✅ Included |
| Signup | ✅ Auth.tsx | ✅ Included |
| Turnstile | ✅ useCaptcha.ts | ✅ Internal |
| Google OAuth | ✅ Auth.tsx | ✅ Included |
| Error Handling | ✅ Basic | ✅ Enhanced |
| Loading States | ✅ Yes | ✅ Yes |
| Form Validation | ✅ Zod | ✅ Zod |
| RLS Error Handling | ❌ No | ✅ Yes |
| Responsive | ✅ Yes | ✅ Enhanced |
| Accessibility | ✅ Basic | ✅ Enhanced |
| Dark Mode | ❌ No | ❌ No (yet) |

---

## Next: Profile Completion

After successful signup, guide users to complete their profile:

```tsx
// After signup success in AuthenticationForm
// User redirected to /auth?mode=complete-profile

// Use StepByStepRegistration for multi-step profile
import StepByStepRegistration from '@/components/auth/StepByStepRegistration';

const CompleteProfile = () => {
  return <StepByStepRegistration user={currentUser} />;
};
```

---

## Support Resources

📚 **Documentation**: See AUTHENTICATION_FORM_GUIDE.md
💻 **Source Code**: src/components/auth/AuthenticationForm.tsx
🧪 **Testing**: Run `npm run dev` and visit localhost:5173/auth

---

## Quick Command Reference

```bash
# Start development
npm run dev

# Visit auth page
open http://localhost:5173/auth

# Check for console errors
# Press F12 > Console tab

# Build for production
npm run build

# Preview production
npm run preview
```

---

## Questions?

Refer to:
1. **AUTHENTICATION_FORM_GUIDE.md** - Comprehensive guide
2. **Component source code** - Well commented
3. **Error messages** - Component provides clear feedback
4. **Browser console** - Detailed logging for debugging
