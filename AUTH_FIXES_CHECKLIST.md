# Step-by-Step Authentication Troubleshooting Checklist

Follow this checklist to identify and fix login, signup, and registration issues.

---

## 🚀 QUICK START: Run Diagnostic Tests

**Before anything else:**
1. Start your dev server: `npm run dev`
2. Visit: `http://localhost:5173/auth-diagnostics`
3. Click "Run All Tests"
4. **Note any ERRORS or WARNINGS** and check the solutions below

---

## 📋 PART 1: Check Configuration (5 minutes)

### ✅ Check 1: Environment Variables

**File:** `.env`

```bash
# Should contain these EXACT settings:
VITE_SUPABASE_URL=https://mkcgkfzltohxagqvsbqk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**If missing:**
- Copy from `.env.example`
- Ask your team for the correct keys
- DO NOT commit real keys to git

---

### ✅ Check 2: Supabase Project is Live

**How to verify:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: "Turuturu Stars"
3. Check status (should be green)
4. Go to Authentication → Users (should see existing users)

**If project is down:**
- Wait for Supabase to come back up
- Or contact Supabase support

---

### ✅ Check 3: Database Tables Exist

**In Supabase Dashboard:**
1. Go to Table Editor
2. Look for table: `profiles`
3. Check it has these columns:
   - `id` (UUID, Primary Key)
   - `full_name` (Text)
   - `phone` (Text)
   - `email` (Text, optional)
   - `membership_number` (Text, optional)
   - `status` (Text: active/dormant/pending/suspended)
   - `id_number` (Text)

**If table is missing:**
```bash
# Run migrations:
supabase migration up
```

---

## 🔍 PART 2: Test Login (10 minutes)

### ✅ Test 1: Try Logging In

**Steps:**
1. Go to: `http://localhost:5173/auth`
2. Enter test email: `test@example.com`
3. Enter password: `password123`
4. Click "Sign In"

**Expected Result:**
- Success message appears
- Redirects to `/dashboard`

**If it fails:**

#### Error: "Invalid login credentials"

**Causes:**
- [ ] User doesn't exist
- [ ] Wrong password
- [ ] Email not confirmed

**Fix:**
```sql
-- Option A: Create test user (use Supabase SQL Editor)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES (
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{}',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Option B: Or create via Supabase Dashboard:
-- Authentication → Users → Add User
-- Email: test@example.com
-- Password: password123
-- Email verified: YES
```

#### Error: "Auth service offline" or Connection error

**Causes:**
- [ ] Internet connection down
- [ ] Supabase service down
- [ ] Wrong URL in .env

**Fix:**
1. Check your internet
2. Visit [Supabase Status](https://status.supabase.com)
3. Verify `.env` has correct URL

---

### ✅ Test 2: Check Browser Console

**Steps:**
1. Open DevTools: `F12` or Right-click → Inspect
2. Go to Console tab
3. Try logging in again
4. Look for red error messages

**Common errors and fixes:**

```javascript
// Error: "Cannot find Supabase client"
// Fix: Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env

// Error: "Failed to fetch"
// Fix: Check internet connection and Supabase status

// Error: "CORS error"
// Fix: Supabase dashboard → Authentication → Redirect URLs
// Add: http://localhost:5173
```

---

## ✍️ PART 3: Test Signup (10 minutes)

### ✅ Test 1: Create New Account

**Steps:**
1. Go to: `http://localhost:5173/auth?mode=signup`
2. Enter email: `newuser@example.com`
3. Enter password: `password123`
4. Confirm password: `password123`
5. Click "Create Account"

**Expected Result:**
- Success message
- Redirected to `/register` to complete profile

**If it fails:**

#### Error: "User already exists"

**Causes:**
- [ ] Email already has account
- [ ] Account disabled/suspended

**Fix:**
- Use a different email
- Or delete user in Supabase Dashboard (if testing)

#### Error: "Email validation failed"

**Causes:**
- [ ] Invalid email format
- [ ] Email blacklisted

**Fix:**
- Use valid email format: `name@domain.com`
- Check Supabase auth settings

#### Error: "Password too weak"

**Causes:**
- [ ] Password less than 6 characters
- [ ] Password doesn't meet complexity rules

**Fix:**
- Use password: `Password123!`

---

### ✅ Test 2: Verify Profile is Created

After signup succeeds, check if profile was created:

```javascript
// In DevTools Console:
const { supabase } = await import('/src/integrations/supabase/client.js');
const { data: { user } } = await supabase.auth.getUser();

// Check if profile exists:
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

console.log('Profile:', data);
```

**Expected:** Profile object with `id`, `full_name`, etc.

**If null:**
- Profile wasn't created
- Check database trigger in next section

---

## 🗄️ PART 4: Check Database Triggers (15 minutes)

### ✅ Test: Verify Profile Creation Trigger

**What should happen:**
When a user signs up → Auth creates user → Database trigger automatically creates profile row

**How to check:**

1. **In Supabase SQL Editor, run:**
```sql
SELECT *
FROM information_schema.triggers
WHERE trigger_name LIKE '%profile%' 
   OR trigger_name LIKE '%create%'
ORDER BY trigger_created DESC;
```

**Expected:** Should see trigger like `on_auth_user_created`

**If no triggers:**
```sql
-- Create the trigger:
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

2. **Check trigger function exists:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
```

**If missing:**
```sql
-- Create the function:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🛡️ PART 5: Check Row-Level Security (RLS) Policies (15 minutes)

### ✅ Test: Verify Profiles Table Policies

RLS might be blocking writes!

**Check current policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

**Expected policies:**
- `SELECT` allowed for authenticated users
- `INSERT` allowed for authenticated users (own profile)
- `UPDATE` allowed for authenticated users (own profile)

**If policies are missing or too restrictive:**

```sql
-- Allow authenticated users to see all profiles:
CREATE POLICY "Public profiles visible to everyone"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert own profile:
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update own profile:
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

---

## 📝 PART 6: Test Registration Form (10 minutes)

### ✅ Test: Complete Registration

After signing up, you should be on `/register` with a form.

**Steps:**
1. Fill in the step-by-step form:
   - Step 1: Full Name
   - Step 2: Phone Number
   - Step 3: ID Number
   - ... (continue through all steps)
2. Click "Complete Registration"

**Expected Result:**
- Success message
- Redirected to `/dashboard`

**If it fails:**

#### Error: Form doesn't save data

**Check:**
1. Open DevTools → Console
2. Look for error messages
3. Check Network tab:
   - Look for `POST /profiles` request
   - Check response status (should be 200)

**Fix:**
1. Verify database isn't full/out of space:
```sql
SELECT table_name, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname='public';
```

2. Check for database errors:
```sql
SELECT * FROM profiles WHERE id = '<user-id>' LIMIT 1;
```

#### Error: Stuck in registration loop

**Causes:**
- [ ] Profile marked as incomplete
- [ ] Missing required fields: full_name, phone, id_number

**Fix:**
```sql
-- Manually complete profile:
UPDATE profiles 
SET full_name = 'Test User',
    phone = '+254700000000',
    id_number = '12345678',
    status = 'active'
WHERE id = '<user-id>';
```

---

## 🔗 PART 7: Test End-to-End Flow (20 minutes)

### ✅ Complete Test Scenario

**Step 1: Fresh Login**
```javascript
// Clear all auth:
localStorage.clear();
location.reload();
```

**Step 2: Sign In**
- Go to `/auth`
- Login with: `test@example.com` / `password123`

**Step 3: Check Profile**
```javascript
const { supabase } = await import('/src/integrations/supabase/client.js');
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
console.log('Profile:', profile);
```

**Step 4: Verify Dashboard Works**
- You should be on `/dashboard`
- Check all pages load without errors

**If any step fails:**
- Note the exact error
- Go back to the relevant section above and fix it

---

## 🆘 COMMON SOLUTIONS QUICK REFERENCE

| Problem | Solution |
|---------|----------|
| "Invalid credentials" | Create test user in Supabase Dashboard |
| Profile not created | Create database trigger `on_auth_user_created` |
| Can't save profile data | Check RLS policies on profiles table |
| Auth works but redirects to /register | Profile missing required fields - fill it in |
| Get "access denied" | Check RLS policies - might be too restrictive |
| Email confirmation loop | Set "Auto confirm users" in Supabase auth settings |
| Google OAuth not working | Add redirect URL: `http://localhost:5173/auth` |

---

## 📞 Need Help?

**If you're stuck:**

1. **Check Supabase logs:**
   - Supabase Dashboard → Logs → Check for errors

2. **Check browser console:**
   - DevTools → Console → Look for error messages

3. **Run diagnostics:**
   - Visit `/auth-diagnostics`
   - Note any ERROR results

4. **Ask the team:**
   - Share diagnostic results
   - Share console errors (screenshot)
   - Share exact steps to reproduce

---

## ✨ Success Indicators

When everything works correctly, you should see:

✅ Login page loads without errors
✅ Can log in with test credentials
✅ Redirects to dashboard
✅ Can see profile data
✅ Can complete registration
✅ All form data saves to database
✅ Can log out and log back in
✅ Session persists after page reload

---

**Last Updated:** January 31, 2026

