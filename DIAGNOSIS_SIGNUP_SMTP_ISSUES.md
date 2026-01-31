# 🔍 Diagnosis: Signup 500 Error & Brevo SMTP Issues

## Problem Statement

You're experiencing:
1. **Signup 500 Error**: "Database error saving new user" persists despite migration fixes
2. **Brevo SMTP**: Emails were reaching Brevo initially but now they're not in logs

---

## Root Cause Analysis

### For Signup 500 Error:

The error suggests the database transaction is still failing. Since we've already:
- ✅ Made `phone` nullable
- ✅ Added defaults to `full_name`
- ✅ Added error handling to trigger
- ✅ Made membership generation robust

The issue might be:

**Option A: Migration not applied to remote database**
- Local migration file shows `20260131_comprehensive_signup_fix.sql`
- But Supabase might not have applied it yet
- Or there's a conflict with an older version of the migration

**Option B: Different constraint violation**
- A foreign key constraint we haven't identified
- A unique constraint (like `membership_number` UNIQUE)
- An RLS policy blocking the service_role insert
- A database function error (membership generation)

**Option C: The trigger itself is broken**
- Syntax error in the trigger definition
- Permission issue (service_role can't insert)
- The trigger is disabled or was never created

### For Brevo SMTP Stopped Working:

**Most likely causes:**

1. **API credentials expired** - Brevo SMTP key/password rotated
2. **Rate limit hit** - Exceeded quota, account suspended
3. **Email sender domain issue** - `noreply@turuturustars.co.ke` domain not verified in Brevo
4. **Supabase SMTP config reset** - Settings got cleared or reverted
5. **Email confirmation toggled off** - Someone disabled email confirmation in Auth settings

---

## Immediate Actions Needed

### Step 1: Verify Supabase Auth Settings
1. Go to Supabase Dashboard
2. **Authentication** → **Providers**
3. Check **Email** provider:
   - Is "Confirm email" toggle **ON**? ✓
   - Is SMTP provider set to **Custom SMTP**? ✓
4. Click **Email Templates** and verify Brevo templates are showing

### Step 2: Check Brevo Account
1. Go to https://app.brevo.com/
2. Check account status - any alerts/warnings?
3. Dashboard → Email → Check if there are delivery errors
4. SMTP settings → Verify SMTP relay is still active
5. Check email sender domain (`noreply@turuturustars.co.ke`):
   - Is domain verified? ✓
   - What's the sender reputation?

### Step 3: Verify Brevo SMTP Credentials in Supabase
In Supabase Dashboard → **Project Settings** → **Auth** → **Email Configuration**:
- [ ] SMTP Host: `smtp-relay.brevo.com`
- [ ] SMTP Port: `587`
- [ ] SMTP User: (check if this matches Brevo)
- [ ] SMTP Password/Key: (might be expired - regenerate in Brevo)
- [ ] Sender Email: `noreply@turuturustars.co.ke`
- [ ] Sender Name: `Turuturu Stars`

### Step 4: Check Database Trigger
Run this SQL in Supabase Query Editor to verify the trigger is working:

```sql
-- Check if the comprehensive fix migration exists
SELECT version, name, statements 
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%comprehensive_signup_fix%' OR version LIKE '20260131%'
ORDER BY version DESC;

-- Check if phone column is nullable
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'phone';

-- Check if full_name has default
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'full_name';

-- List all INSERT triggers on auth.users
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
AND tgtype::integer & 8 > 0;  -- BEFORE INSERT triggers
```

### Step 5: Test Signup Manually
Try creating an auth user directly via SQL (service_role):

```sql
-- First, test if the trigger works by manually creating an auth user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'test-trigger-' || now()::text || '@example.com',
  crypt('TestPassword123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) RETURNING id, email;

-- Check if profile was auto-created
SELECT id, email, full_name, phone, membership_number
FROM public.profiles
WHERE email LIKE 'test-trigger-%'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Solutions

### If Signup Still Fails:
1. Check the exact SQL error from Supabase logs
2. Disable and recreate the trigger:
   ```sql
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   ```
3. Run the comprehensive migration again
4. Verify each field has proper defaults

### If Brevo Not Sending:
1. **Regenerate SMTP credentials in Brevo:**
   - Go to Brevo → Account → SMTP settings
   - Generate new SMTP password
   - Update Supabase → Project Settings → Auth → Email with new credentials

2. **Verify domain is confirmed:**
   - Check `noreply@turuturustars.co.ke` is verified in Brevo
   - May need SPF/DKIM records added to DNS

3. **Re-enable email confirmation:**
   - Supabase Dashboard → Authentication → Providers
   - Toggle "Email" → "Confirm email" to ON
   - Save

---

## Next Steps

Please provide:
1. **Screenshot of Supabase Auth settings** (Email provider section)
2. **Brevo dashboard status** - Any error messages or account alerts?
3. **Last successful email send date/time** - When did emails stop arriving?
4. **Error message from browser console** - Full error, not just the 500

Then I can provide targeted fixes.
