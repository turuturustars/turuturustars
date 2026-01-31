# Authentication Troubleshooting Guide

## System Overview

Your authentication system uses:
- **Frontend**: React + Vite + TypeScript
- **Backend**: Supabase Auth + Edge Functions
- **Architecture**: Sign-in → Profile completion → Dashboard

---

## Authentication Flows

### 1. **Login Flow** (`/auth`)
```
User enters email + password
↓
Auth.tsx: handleSubmit()
↓
supabase.auth.signInWithPassword()
↓
Success → Navigate to /dashboard
Failure → Show error toast
```

### 2. **Signup Flow** (`/auth?mode=signup`)
```
User enters email + password + confirm password
↓
Auth.tsx: handleSignup()
↓
supabase.auth.signUp() → Creates auth user
↓
Two scenarios:
  A) Immediate session → Profile polling starts
  B) Email confirmation required → Store in localStorage
↓
Redirect to /register
```

### 3. **Registration Flow** (`/register`)
```
Check if authenticated
↓
If YES → Show StepByStepRegistration form
If NO + pending signup → Show confirmation guidance
If NO + no pending → Show "Start Registration" option
↓
Complete profile information
↓
Profile saved to DB
↓
Redirect to /dashboard
```

---

## 🔴 Common Issues & Solutions

### **Issue 1: Login fails with "Invalid credentials"**

**Root Causes:**
- [ ] User doesn't exist in Supabase
- [ ] Wrong password
- [ ] Email not confirmed (if email confirmation is enabled)
- [ ] Supabase URL/Key misconfigured

**Check:**
```bash
# 1. Verify environment variables
cat .env | grep VITE_SUPABASE
# Should show:
# VITE_SUPABASE_URL=https://mkcgkfzltohxagqvsbqk.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...

# 2. Check browser console for errors
# Open DevTools → Console → Try login again
```

**Solution:**
1. In Supabase Dashboard → Authentication → Users
2. Verify user exists with correct email
3. Check if email_confirmed = true
4. If not confirmed, look for confirmation email or resend it

---

### **Issue 2: Signup succeeds but profile not created**

**Root Causes:**
- [ ] Profile database trigger not firing
- [ ] Create-profile edge function not deployed
- [ ] Service role key not configured
- [ ] Database RLS policies blocking writes

**Check:**
```bash
# 1. Check if profiles table has data
supabase db remote diff  # Compare local vs remote

# 2. Verify edge function is deployed
supabase functions list

# 3. Check profiles table structure
supabase db pull # Sync schema locally
```

**Solution:**
1. **Ensure trigger exists:**
   - Supabase Dashboard → SQL Editor
   - Run: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%profile%'`

2. **Check RLS policies:**
   - Supabase Dashboard → Authentication → Policies
   - Verify: `INSERT` policy exists for users on `profiles` table

3. **Deploy edge function:**
   ```bash
   supabase functions deploy create-profile
   ```

---

### **Issue 3: Registration form doesn't save data**

**Root Causes:**
- [ ] StepByStepRegistration not submitting
- [ ] Database insert failing
- [ ] RLS policies blocking write
- [ ] JavaScript errors in console

**Check:**
1. Open DevTools → Console
2. Look for red error messages
3. Check Network tab → See if POST request to `/profiles` succeeds

**Solution:**
1. Check RLS policies allow authenticated users to update profiles
2. Verify all required fields are provided
3. Look at Supabase logs for database errors

---

### **Issue 4: Login works but redirects to /register instead of /dashboard**

**Root Causes:**
- [ ] Profile not found or incomplete
- [ ] Missing required fields: full_name, phone, id_number
- [ ] Database lag (profile not yet created)

**Check:**
1. Go to Supabase Dashboard → Table Editor → `profiles`
2. Find your user row
3. Check: full_name, phone, id_number columns

**Solution:**
1. Complete the StepByStepRegistration form with all required data
2. If stuck in loop, manually insert profile data in Supabase:
   ```sql
   INSERT INTO profiles (id, full_name, phone, id_number)
   VALUES ('<user_id>', 'Your Name', '+254XXXXXXXXX', '12345678')
   ON CONFLICT (id) DO UPDATE SET 
     full_name = EXCLUDED.full_name,
     phone = EXCLUDED.phone,
     id_number = EXCLUDED.id_number;
   ```

---

## 🔧 Step-by-Step Debugging

### **Step 1: Verify Supabase Connection**
```javascript
// Open DevTools Console and paste:
const { supabase } = await import('/src/integrations/supabase/client.js');
supabase.auth.getSession().then(({ data: { session } }) => {
  console.log('Session:', session);
});
```

### **Step 2: Test Login Manually**
```javascript
// In DevTools Console:
const { supabase } = await import('/src/integrations/supabase/client.js');
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123'
});
```

### **Step 3: Check Profile Data**
```javascript
// In DevTools Console:
const { supabase } = await import('/src/integrations/supabase/client.js');
const { data: { session } } = await supabase.auth.getSession();
if (session?.user) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  console.log('Profile:', data);
}
```

### **Step 4: Check Browser Network**
1. Open DevTools → Network tab
2. Try logging in
3. Look for these requests:
   - `POST /auth/v1/token` (should be 200)
   - `GET /rest/v1/profiles` (should be 200 if profile exists)
4. Check response status and errors

---

## 📋 Checklist Before Deployment

- [ ] Supabase Auth enabled
- [ ] Email confirmation setting (auto-confirm vs manual)
- [ ] RLS policies configured for profiles table
- [ ] `create-profile` edge function deployed
- [ ] Database triggers for profile creation
- [ ] `.env` variables set correctly
- [ ] Session persistence (localStorage) working
- [ ] OAuth (Google) configured if using

---

## 🆘 Quick Fixes

### Fix #1: Clear All Auth State
```javascript
// DevTools Console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Fix #2: Force Re-deploy Functions
```bash
cd supabase/functions/create-profile
supabase functions deploy create-profile --no-verify-jwt
```

### Fix #3: Reset All Auth Users (DESTRUCTIVE)
```sql
-- In Supabase SQL Editor:
-- WARNING: This deletes all users!
DELETE FROM auth.users;
DELETE FROM public.profiles;
```

---

## 📊 Useful SQL Queries

```sql
-- Check all users and their profiles
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  p.full_name,
  p.phone,
  p.id_number
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%profile%';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'profiles';
```

---

## 🚀 Next Steps

1. **Identify your specific issue** using the checklist above
2. **Run the debugging steps** in DevTools
3. **Check Supabase logs** for errors
4. **Verify database state** using SQL queries
5. **Fix the root cause** from the solutions provided

