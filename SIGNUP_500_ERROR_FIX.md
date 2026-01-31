# Signup 500 Error Fix - Database error saving new user

## Problem
Users were getting a **POST /auth/v1/signup 500 Internal Server Error** with message:
```
"Database error saving new user"
```

## Root Cause
When Supabase creates a new auth user, it triggers the `handle_new_user()` function which attempts to:
1. Insert a new profile record
2. Assign a default 'member' role
3. Create a contribution tracking record

**The issue**: The `phone` field in the `profiles` table is defined as:
```sql
phone TEXT NOT NULL
```

But the `handle_new_user()` trigger function was inserting an **empty string** when phone metadata wasn't provided:
```sql
COALESCE(NEW.raw_user_meta_data ->> 'phone', '')
```

This violates the NOT NULL constraint, causing the entire signup transaction to fail with a 500 error.

## Solution Applied
Modified the migration to:

### 1. Allow `phone` to be NULL
```sql
ALTER TABLE public.profiles
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN phone SET DEFAULT NULL;
```

### 2. Updated `handle_new_user()` function to use NULL instead of empty string
```sql
NULLIF(NEW.raw_user_meta_data ->> 'phone', '')  -- Returns NULL if phone is empty
```

## Implementation Steps
1. Apply the new migration: `20260131_fix_phone_not_null.sql`
2. Push changes to Supabase: `supabase push`
3. Test signup flow again - users should now be able to register without providing a phone number

## Files Modified
- Created: `supabase/migrations/20260131_fix_phone_not_null.sql`

## Testing
After applying the migration, try signing up with:
- Email: test@example.com
- Password: TestPassword123

You should see immediate success without the 500 error.

## Related Files
- `src/components/auth/AuthenticationForm.tsx` - signup form (no changes needed)
- `src/hooks/useAuth.ts` - auth hook (no changes needed)
- `supabase/migrations/20260119122313_...sql` - original handle_new_user function
