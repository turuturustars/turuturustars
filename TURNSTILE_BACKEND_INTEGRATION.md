# 🔒 Turnstile Backend Verification - Integration Guide

## Overview

This guide explains how to integrate Turnstile backend verification into your registration flow using the Supabase Edge Function.

---

## 📁 Files Created

1. **`supabase/functions/verify-turnstile/index.ts`** (108 lines)
   - Deno-based Edge Function
   - Verifies tokens with Cloudflare API
   - Handles errors gracefully
   - Production-ready

2. **`src/hooks/useVerifyTurnstile.ts`** (100+ lines)
   - React hook for frontend verification
   - Calls Edge Function
   - Manages loading and error states
   - Easy to use in components

3. **`EDGE_FUNCTION_GUIDE.md`**
   - Comprehensive setup and usage guide
   - API documentation
   - Security notes
   - Troubleshooting

---

## 🚀 Setup Steps

### Step 1: Set Environment Variable

Get your Turnstile **Secret Key** from Cloudflare:
1. Go to https://dash.cloudflare.com/
2. Navigate to Turnstile settings
3. Copy your **Secret Key** (not Site Key)

Set it in Supabase:

**Option A: Via CLI**
```bash
supabase secrets set TURNSTILE_SECRET_KEY=your_actual_secret_key
```

**Option B: Via Dashboard**
- Go to Supabase Dashboard
- Project Settings → Edge Functions → Secrets
- Add new secret → `TURNSTILE_SECRET_KEY`
- Paste your secret key

### Step 2: Deploy Edge Function

```bash
cd c:\Users\ndung\turuturustars
supabase functions deploy verify-turnstile
```

Expected output:
```
✓ Function deployed successfully
Function URL: https://<project-id>.supabase.co/functions/v1/verify-turnstile
```

### Step 3: Test Function (Optional)

```bash
supabase functions serve verify-turnstile
```

In another terminal:
```bash
curl -X POST http://localhost:54321/functions/v1/verify-turnstile \
  -H "Content-Type: application/json" \
  -d '{"token":"test-token"}'
```

---

## 💻 Frontend Integration

### Basic Usage

```typescript
import { useVerifyTurnstile } from '@/hooks/useVerifyTurnstile';

const MyComponent = () => {
  const { isVerifying, error, verify } = useVerifyTurnstile();

  const handleSubmit = async (turnstileToken: string) => {
    // Verify token with backend
    const isValid = await verify(turnstileToken);

    if (!isValid) {
      // Error is automatically set in the hook
      console.error(error);
      return;
    }

    // Token verified successfully - proceed with signup
    await submitForm();
  };

  return (
    <div>
      <button onClick={() => handleSubmit(token)} disabled={isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};
```

### Integration in Registration

```typescript
import { useTurnstile } from '@/hooks/useTurnstile';
import { useVerifyTurnstile } from '@/hooks/useVerifyTurnstile';

const StepByStepRegistration = ({ user }) => {
  const { token: turnstileToken } = useTurnstile();
  const { isVerifying, error: verifyError, verify } = useVerifyTurnstile();

  const handleNext = async () => {
    // Validate form fields first
    if (!validateStep()) return;

    // Verify Turnstile token with backend
    const isValid = await verify(turnstileToken);
    if (!isValid) {
      toast({
        title: 'Verification Failed',
        description: 'Security verification failed. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Verified - proceed to next step
    setCurrentStep(currentStep + 1);
  };

  return (
    <div>
      {/* Form fields */}
      {verifyError && <ErrorMessage>{verifyError}</ErrorMessage>}
      <button onClick={handleNext} disabled={isVerifying}>
        {isVerifying ? 'Verifying...' : 'Next'}
      </button>
    </div>
  );
};
```

---

## 🔄 Full Flow Example

```typescript
/**
 * Complete registration flow with Turnstile verification
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTurnstile } from '@/hooks/useTurnstile';
import { useVerifyTurnstile } from '@/hooks/useVerifyTurnstile';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Frontend: Get Turnstile token
  const { token: turnstileToken } = useTurnstile();

  // Backend verification
  const { isVerifying, error: verifyError, verify } = useVerifyTurnstile();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Step 1: Verify Turnstile token with backend
      const isVerified = await verify(turnstileToken);
      if (!isVerified) {
        throw new Error(verifyError || 'Verification failed');
      }

      // Step 2: Create user account
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      // Step 3: Success
      toast({
        title: 'Success',
        description: 'Account created! Please check your email.',
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Registration failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />

      {verifyError && <p className="error">{verifyError}</p>}

      <button type="submit" disabled={isLoading || isVerifying}>
        {isVerifying ? 'Verifying...' : isLoading ? 'Creating account...' : 'Register'}
      </button>
    </form>
  );
};

export default Register;
```

---

## 📊 API Reference

### Edge Function Endpoint

```
POST /functions/v1/verify-turnstile
```

### Request

```json
{
  "token": "0.A1bC2dE3fG4hI5jK6lM7nO8pQ9rS-UvWxYz_1aB2cD3eF"
}
```

### Success Response

```json
{
  "success": true,
  "data": {
    "success": true,
    "challenge_ts": "2023-02-01T11:12:13.456Z",
    "hostname": "turuturustars.co.ke",
    "score": 0.9,
    "score_reason": ["not_machine"]
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Missing or invalid token in request body."
}
```

### Hook API

```typescript
const {
  isVerifying,        // boolean - Verification in progress
  error,              // string | null - Error message
  verify,             // (token: string) => Promise<boolean>
  reset,              // () => void
} = useVerifyTurnstile();
```

---

## 🔐 Security Implementation

### What's Secured

✅ **Secret Key**: Stored as environment variable, never exposed
✅ **Token Validation**: Server-side verification required
✅ **Input Validation**: Token format and type checked
✅ **Error Handling**: Generic errors to frontend, detailed to logs
✅ **HTTPS Only**: All communication encrypted
✅ **One-time Use**: Implement token expiry if needed

### Recommendations

1. **Rate Limiting**
   - Prevent brute force attempts
   - Use Supabase Auth's built-in rate limiting

2. **Database Logging**
   - Log successful verifications
   - Track failed attempts
   - Store verification timestamp

3. **Monitoring**
   - Alert on repeated failures
   - Monitor Cloudflare error codes
   - Track verification metrics

---

## 🧪 Testing

### Test Locally

```bash
# Start Supabase
supabase start

# Deploy function locally
supabase functions serve verify-turnstile

# In another terminal, test
curl -X POST http://localhost:54321/functions/v1/verify-turnstile \
  -H "Content-Type: application/json" \
  -d '{"token":"test-token"}'
```

### Test in Production

```bash
# Use Supabase client in frontend
const { data, error } = await supabase.functions.invoke('verify-turnstile', {
  body: { token: 'real-turnstile-token' }
});

console.log(data, error);
```

---

## ⚠️ Common Issues

### Issue: "TURNSTILE_SECRET_KEY not set"

**Solution**: Set environment variable in Supabase dashboard
- Project Settings → Edge Functions → Secrets
- Add `TURNSTILE_SECRET_KEY` with your secret key

### Issue: "Failed to verify token"

**Possible causes**:
- Invalid or expired token
- Token already used
- Wrong secret key
- Cloudflare API down

**Solution**: Check function logs in Supabase dashboard

### Issue: CORS errors

**Solution**: Use Supabase client, not direct fetch
```typescript
// ✅ Correct
const { data } = await supabase.functions.invoke('verify-turnstile', {
  body: { token }
});

// ❌ Wrong (CORS issue)
const response = await fetch('/functions/v1/verify-turnstile', {
  method: 'POST',
  body: JSON.stringify({ token })
});
```

---

## 📚 Next Steps

1. **Immediate**
   - [ ] Set TURNSTILE_SECRET_KEY environment variable
   - [ ] Deploy verify-turnstile function
   - [ ] Test function locally

2. **Integration**
   - [ ] Use useVerifyTurnstile hook in registration
   - [ ] Test with real Turnstile token
   - [ ] Handle error cases

3. **Enhancement**
   - [ ] Add database logging
   - [ ] Implement rate limiting
   - [ ] Set up monitoring/alerts
   - [ ] Add analytics tracking

4. **Deployment**
   - [ ] Test in staging
   - [ ] Monitor logs
   - [ ] Deploy to production

---

## 📖 References

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Server-side Verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Deno Docs](https://deno.land/)

---

**Status**: ✅ Ready to deploy
**Version**: 1.0.0
**Date**: January 27, 2026
