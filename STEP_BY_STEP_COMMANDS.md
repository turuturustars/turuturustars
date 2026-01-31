# 🚀 Step-by-Step Action Commands

## ⚡ QUICK START (Copy/Paste These)

### Step 1: Start Dev Server
```bash
cd "c:\Users\ndung\turuturustars"
npm run dev
```

Wait for output like:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

---

### Step 2: Open Diagnostic Tool
```
Browser URL: http://localhost:5173/auth-diagnostics
```

You should see:
- "Diagnostics" page with "Run All Tests" button
- Click it and wait for results

---

### Step 3: Check Results

**If All Tests Pass (Green ✓):**
- Your auth system is configured correctly
- Try logging in with test credentials
- If login still fails, there's a data issue (go to Step 4)

**If Tests Fail (Red ✗):**
- Note which test failed
- Go to Step 4 based on the error

---

### Step 4: Run Specific Fixes

#### **If Diagnostics Says: "Missing environment variables"**

**Action:**
```bash
# Check .env file
cat .env | grep VITE_SUPABASE
```

**Should see:**
```
VITE_SUPABASE_URL=https://mkcgkfzltohxagqvsbqk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

**If missing:**
```bash
# Copy from example
cp .env.example .env

# Then edit .env with correct values from Supabase
```

---

#### **If Diagnostics Says: "Supabase connection failed"**

**Action:**
1. Verify Supabase service is online
2. Visit: https://status.supabase.com
3. Check if service shows "All Systems Operational" ✓
4. Try refreshing browser

**If still failing:**
```bash
# Test connection manually
curl https://mkcgkfzltohxagqvsbqk.supabase.co
```

---

#### **If Diagnostics Says: "Access denied to profiles table"**

**Action:**
1. Go to: Supabase Dashboard → SQL Editor
2. Copy/paste this command:

```sql
-- Create RLS policies for profiles
CREATE POLICY "Users can see their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

3. Click "Run" button
4. Re-run diagnostics

---

### Step 5: Test Login

**Try These Credentials:**

**Test User 1 (If exists):**
```
Email: test@example.com
Password: password123
```

**Not working?**

**Create Test User:**
1. Go to: Supabase Dashboard → Authentication → Users
2. Click "+ Add user"
3. Email: `test@example.com`
4. Password: `password123`
5. "Email verified": Toggle ON ✓
6. Click "Create user"

**Or use SQL:**
```sql
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{}',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
```

1. Go to: Supabase → SQL Editor
2. Copy/paste above
3. Click "Run"

---

### Step 6: Test Signup

**Steps:**
1. Visit: `http://localhost:5173/auth?mode=signup`
2. Enter:
   - Email: `newuser@example.com`
   - Password: `password123`
   - Confirm: `password123`
3. Click "Create Account"

**Expected:**
- See success message
- Redirect to `/register`
- Form to complete profile

**If fails:**
```bash
# Check browser console (F12)
# Look for error messages
# Common: "User already exists" or "Connection failed"
```

---

### Step 7: Complete Registration

**Steps:**
1. Fill the registration form
2. Required fields:
   - Full Name: "Test User"
   - Phone: "+254700000000"
   - ID Number: "12345678"
3. Optional fields can be skipped
4. Click "Complete Registration"

**Expected:**
- Form saves
- Success message
- Redirect to `/dashboard`

**If form doesn't save:**
```bash
# Open DevTools (F12)
# Network tab
# Try submitting form again
# Look for POST request
# Check response status (should be 200)
# Check console for errors
```

---

### Step 8: Verify It Works

**Check Dashboard:**
1. Should see user profile
2. Should see menu options
3. Should not be redirected to `/register`

**If redirect to /register:**
```sql
-- Check if profile is complete
SELECT full_name, phone, id_number
FROM public.profiles
WHERE email = 'test@example.com';

-- If any are NULL, manually complete:
UPDATE public.profiles
SET 
  full_name = 'Test User',
  phone = '+254700000000',
  id_number = '12345678'
WHERE email = 'test@example.com';
```

---

## 🔧 Troubleshooting Commands (Copy/Paste)

### Command 1: Check All Users and Profiles
```sql
-- Supabase SQL Editor
SELECT 
  au.email,
  au.email_confirmed_at,
  p.full_name,
  p.phone,
  p.id_number,
  p.status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 20;
```

---

### Command 2: Find Users Without Profiles
```sql
-- Supabase SQL Editor
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

---

### Command 3: Create Missing Trigger
```sql
-- Supabase SQL Editor

-- 1. Create function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

---

### Command 4: Fix RLS Policies
```sql
-- Supabase SQL Editor

-- Delete old policies (if needed)
DROP POLICY IF EXISTS "Enable read for all" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- Create new policies
CREATE POLICY "Users can see all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

---

### Command 5: Manually Create Profile
```sql
-- Supabase SQL Editor

UPDATE public.profiles
SET 
  full_name = 'Your Full Name',
  phone = '+254700000000',
  id_number = '12345678',
  membership_number = 'TRS-001',
  status = 'active'
WHERE email = 'test@example.com';

-- If profile doesn't exist, create it:
INSERT INTO public.profiles (id, email, full_name, phone, id_number)
SELECT 
  id,
  email,
  'Test User',
  '+254700000000',
  '12345678'
FROM auth.users
WHERE email = 'test@example.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  id_number = EXCLUDED.id_number;
```

---

### Command 6: Clear Session (Browser)
```javascript
// Open DevTools Console (F12)
// Paste and run:

localStorage.clear();
sessionStorage.clear();
location.reload();

// You'll be logged out and redirected to /auth
```

---

### Command 7: Test Connection (Browser)
```javascript
// Open DevTools Console (F12)
// Paste and run:

const { supabase } = await import('/src/integrations/supabase/client');

// Test 1: Get session
console.log('Test 1: Session');
await supabase.auth.getSession().then(s => console.log(s));

// Test 2: Get current user
console.log('Test 2: Current User');
await supabase.auth.getUser().then(u => console.log(u));

// Test 3: Query profiles table
console.log('Test 3: First profile');
await supabase.from('profiles').select('*').limit(1).then(d => console.log(d));
```

---

## 📋 Complete Checklist Workflow

```bash
# 1. Terminal
npm run dev

# 2. Browser
# Visit: http://localhost:5173/auth-diagnostics

# 3. Run all tests → Note any errors

# 4. Based on errors:

   # If: Supabase connection failed
   # → Run Command 7 in browser console

   # If: Access denied to profiles
   # → Run Command 4 in Supabase SQL Editor

   # If: No users found
   # → Create user via Supabase Dashboard

   # If: No profiles found
   # → Run Command 3 (create trigger)

   # If: Users exist but no profiles
   # → Run Command 5 (manually create)

# 5. Re-run diagnostics

# 6. If all green, test login

# 7. If login works, test signup

# 8. If signup works, test registration

# 9. Check dashboard loads

# 10. Success! ✓
```

---

## 🎯 When Things Go Wrong

### Problem: "I see a blank page"
```bash
# 1. Open DevTools (F12)
# 2. Check Console tab for errors
# 3. Take screenshot of error
# 4. Check Network tab for failed requests
```

### Problem: "Form won't submit"
```bash
# 1. Open DevTools (F12)
# 2. Network tab
# 3. Try submitting
# 4. Look for request in list
# 5. Check response status
# 6. Check response body for error message
```

### Problem: "Data not saving"
```bash
# Run this in Supabase SQL Editor:
SELECT * FROM public.profiles 
WHERE email = 'your-email@example.com'
LIMIT 1;

# If empty/null in fields:
# → Check database update command (Command 5 above)
```

### Problem: "Still stuck"
```bash
# 1. Close browser completely
# 2. Clear browser cache (Ctrl+Shift+Delete)
# 3. npm run dev
# 4. Visit http://localhost:5173/auth-diagnostics
# 5. Run tests again
# 6. Report results
```

---

## 📞 Report Template (If You Need Help)

When asking for help, provide:

```
1. Diagnostic Test Results:
   - [ ] Environment variables: PASS / FAIL
   - [ ] Supabase connection: PASS / FAIL
   - [ ] Auth state: PASS / FAIL
   - [ ] Profiles table: PASS / FAIL
   - [ ] Session persistence: PASS / FAIL
   - [ ] Current profile: PASS / FAIL

2. What you were trying to do:
   (e.g., "Try to log in with test@example.com")

3. Exact error message:
   (Copy from browser console or screenshot)

4. Steps to reproduce:
   1. 
   2. 
   3. 

5. Browser/OS:
   (e.g., "Chrome on Windows 11")

6. Screenshot of:
   - Error message
   - Console errors
   - Diagnostic results
```

---

## ✨ Success Indicators

When everything works, you'll see:

✅ **At /auth-diagnostics:**
- All 6 tests show green checkmark
- No error messages

✅ **At /auth:**
- Form displays
- Can type credentials
- Can click "Sign In"

✅ **After signing in:**
- Success toast appears
- Redirected to /dashboard (or /register if profile incomplete)
- No errors in console

✅ **At /dashboard:**
- Page loads
- User info visible
- No redirects
- Can navigate menu

---

**Last Updated:** January 31, 2026  
**Ready to Troubleshoot** ✓

