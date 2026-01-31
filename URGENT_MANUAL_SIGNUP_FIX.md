# 🚨 URGENT: Manual Signup Fix Required

The migrations are showing as "applied" but haven't actually executed. You need to manually run the fix in Supabase SQL Editor.

## Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard/project/mkcgkfzltohxagqvsbqk/sql
2. You'll see a blank SQL editor

### Step 2: Copy the Fix
Open the file `MANUAL_SIGNUP_FIX.sql` in your project root and copy ALL the SQL code.

### Step 3: Paste & Run
1. Paste the SQL into the Supabase SQL editor
2. Click **"Run"** button (or press Ctrl+Enter)
3. Wait for execution to complete

### Step 4: Test
Try signing up again with:
- Email: test@example.com
- Password: SecurePassword123

**Expected**: ✅ Signup succeeds OR you're asked to confirm email
**NOT Expected**: ❌ 500 Internal Server Error

---

## Why This Is Needed

The migration files say they're "applied" but the SQL statements inside them never actually executed on the database. This is a migration history sync issue.

Running the manual fix applies the same SQL changes directly without relying on the migration system.

---

## What The Fix Does

1. **Makes `phone` field nullable** - Users don't provide phone during signup
2. **Fixes RLS policies** - Allows auth trigger (service_role) to create profiles
3. **Adds error handling** - Membership number generation won't break signup
4. **Rewrites trigger** - Proper NULL handling, better error management
5. **Syncs orphaned users** - Creates profiles for any auth users missing profiles

---

##  After Manual Fix

Once you've manually run the SQL:
1. Test signup works ✅
2. Then run: `git add -A && git commit -m "Applied manual signup fix"`
3. Everything will be in sync

---

## Still Getting 500 Error After This?

If signup still fails after running the manual fix, it means there's a different constraint violation. In that case:

1. Go to Supabase → **Project Settings** → **Logs**
2. Look for the signup request with the 500 error
3. Copy the full error message
4. Share it so we can identify the exact constraint that's failing

---

**File to Use**: `MANUAL_SIGNUP_FIX.sql`
**Time Required**: ~2 minutes
**Risk Level**: Low (read-only verification queries included)
