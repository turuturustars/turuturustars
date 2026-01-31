# 🔐 Authentication System - Quick Reference Guide

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN/SIGNUP PAGE                       │
│                     (Auth.tsx)                             │
│                                                             │
│  ┌──────────────────────┐      ┌──────────────────────┐   │
│  │ Login Form           │      │ Signup Form          │   │
│  │ - Email              │      │ - Email              │   │
│  │ - Password           │      │ - Password           │   │
│  │ - Google OAuth       │      │ - Confirm Password   │   │
│  └──────────┬───────────┘      └──────────┬───────────┘   │
│             │                             │                │
│             ▼                             ▼                │
│        Supabase Auth                Supabase Auth         │
│   signInWithPassword()           signUp()                 │
│                                                             │
└─────────────────────┬───────────────────────┬──────────────┘
                      │                       │
                      ▼                       ▼
           ┌─────────────────┐      ┌──────────────────┐
           │  Dashboard      │      │  Registration    │
           │  (protected)    │      │  Form            │
           │                 │      │ (/register)      │
           │ If profile OK   │      │                  │
           │                 │      │ If profile needs │
           │                 │      │ completion       │
           └─────────────────┘      └────────┬─────────┘
                                             │
                                             ▼
                                    Save Profile to DB
                                    Complete ✓
                                    Redirect to Dashboard
```

---

## 🎯 Current Status & Next Steps

### What I've Created For You:

1. **📄 AUTH_TROUBLESHOOTING.md** - Complete troubleshooting guide
2. **✅ AUTH_FIXES_CHECKLIST.md** - Step-by-step checklist to fix issues
3. **🧪 /auth-diagnostics** - Diagnostic tool (new route!)
4. **💾 SQL_TROUBLESHOOTING_COMMANDS.sql** - Ready-to-run SQL fixes

### ⚡ What You Need To Do Now:

**Step 1: Run Diagnostics (5 min)**
```
1. npm run dev
2. Visit: http://localhost:5173/auth-diagnostics
3. Click "Run All Tests"
4. Take screenshot of any ERRORS or WARNINGS
```

**Step 2: Check Your Specific Error**
- Open `AUTH_FIXES_CHECKLIST.md`
- Find your error in the checklist
- Follow the fix instructions

**Step 3: If Still Stuck**
- Check `AUTH_TROUBLESHOOTING.md` for more details
- Try SQL commands from `SQL_TROUBLESHOOTING_COMMANDS.sql`

---

## 🔴 Most Common Issues (90% of problems):

### Issue #1: "Invalid login credentials"
**Cause:** User doesn't exist in Supabase
**Fix:** 
- Create test user in Supabase Dashboard
- Or use SQL command: `INSERT INTO auth.users...`

### Issue #2: Profile not created after signup
**Cause:** Database trigger missing or not firing
**Fix:**
- Run SQL: Create `on_auth_user_created` trigger
- Check trigger in Supabase → SQL Editor

### Issue #3: "Access denied" when saving profile
**Cause:** RLS policies too restrictive
**Fix:**
- Add RLS policies from SQL_TROUBLESHOOTING_COMMANDS.sql
- Or disable RLS temporarily for testing

### Issue #4: "Redirects to /register but should go to /dashboard"
**Cause:** Profile incomplete (missing full_name, phone, id_number)
**Fix:**
- Complete all fields in registration form
- Or manually update profile via SQL

---

## 🧬 How Authentication Works (Detailed)

### Login Flow:
```typescript
// User clicks "Sign In" with email + password

1. handleSubmit() in Auth.tsx validates form
2. Calls: supabase.auth.signInWithPassword(email, password)
3. Supabase:
   - Looks up user in auth.users table
   - Verifies password hash
   - Creates session token
4. On success:
   - Stores session in localStorage
   - useAuth hook detects session change
   - Fetches user profile
   - Redirects to /dashboard
5. On error:
   - Shows error toast
   - User can retry
```

### Signup Flow:
```typescript
// User clicks "Create Account" with email + password

1. handleSignup() in Auth.tsx validates form
2. Calls: supabase.auth.signUp(email, password)
3. Supabase:
   - Checks if email already exists
   - Creates new user in auth.users
   - Sends confirmation email (if required)
4. Scenario A: Email confirmation disabled
   - Session created immediately
   - waitForProfile() polls for profile creation
   - Database trigger creates profile row
   - Redirect to /register to complete info
5. Scenario B: Email confirmation required
   - No session yet
   - Store in localStorage for later
   - Redirect to /register with "confirm email" message
   - User clicks link in email
   - Profile created by trigger
   - User returns to /register
6. Registration Form:
   - User fills in required fields
   - Submits profile data
   - Saves to profiles table
   - Redirect to /dashboard
```

### Protection Layer:
```typescript
// Every protected route checks:

1. Is user authenticated? (useAuth hook)
2. Does user have a profile? (check profiles table)
3. Is profile complete? (required fields present)
4. If YES to all → Show dashboard
5. If NO → Redirect to /register or /auth
```

---

## 🛠️ Quick Fix Commands

### Terminal:
```bash
# Start dev server
npm run dev

# Check logs
npm run build  # See build errors

# Test connection
curl https://mkcgkfzltohxagqvsbqk.supabase.co/auth/v1/settings
```

### Browser DevTools Console:
```javascript
// Test Supabase connection
import { supabase } from '@/integrations/supabase/client';
supabase.auth.getSession().then(s => console.log(s));

// Get current user
supabase.auth.getUser().then(u => console.log(u.data.user));

// Get user profile
supabase.from('profiles').select('*').eq('id', 'user-id').single();

// Clear auth (fresh start)
localStorage.clear(); location.reload();
```

### Supabase Dashboard:
```
1. Project: "Turuturu Stars"
2. SQL Editor → Run SQL commands
3. Table Editor → View/edit data
4. Logs → Check for errors
5. Authentication → Manage users
```

---

## ✨ How to Know It's Fixed

✅ **All of these should work:**
- [ ] Can log in with test user
- [ ] Gets redirected to /dashboard
- [ ] Can see profile info on dashboard
- [ ] Can sign up with new email
- [ ] New user gets profile row created
- [ ] Can complete registration form
- [ ] Form data saves to database
- [ ] Session persists after page reload
- [ ] Can log out and log back in

---

## 📞 Support Path

If you're stuck:

1. **First:** Run `/auth-diagnostics` and note any errors
2. **Second:** Check `AUTH_FIXES_CHECKLIST.md` for your error
3. **Third:** Try SQL fixes from `SQL_TROUBLESHOOTING_COMMANDS.sql`
4. **Finally:** Share with team:
   - Diagnostic test results
   - Exact error message
   - Steps to reproduce
   - Screenshot of console errors

---

## 📚 File Reference

| File | Purpose | When to Use |
|------|---------|-----------|
| AUTH_TROUBLESHOOTING.md | Detailed explanations | Understanding the system |
| AUTH_FIXES_CHECKLIST.md | Step-by-step fixes | Actually fixing issues |
| AuthDiagnostics.tsx | Automated test tool | Identify problems fast |
| SQL_TROUBLESHOOTING_COMMANDS.sql | Database fixes | Fix database layer |
| src/pages/Auth.tsx | Login/signup form | Frontend code |
| src/hooks/useAuth.ts | Auth state management | How auth state works |
| src/components/auth/ | Auth components | Component code |

---

## 🚀 Success Workflow

```
1. npm run dev
   ↓
2. Visit /auth-diagnostics
   ↓
3. Run tests → Identify issue
   ↓
4. Open AUTH_FIXES_CHECKLIST.md
   ↓
5. Follow the specific fix
   ↓
6. Run tests again
   ↓
7. All green? ✓ Done!
   ↓
8. Still errors? → Try SQL commands
   ↓
9. All working? ✓ Deploy!
```

---

## 🎓 Learning Path

**If you want to understand the code:**

1. Read `AUTH_TROUBLESHOOTING.md` Overview section
2. Look at `src/pages/Auth.tsx` - Login/Signup forms
3. Check `src/hooks/useAuth.ts` - Auth state
4. Read `src/components/auth/ProtectedRoute.tsx` - Protection
5. Explore `src/components/auth/StepByStepRegistration.tsx` - Registration

---

**Last Updated:** January 31, 2026  
**Status:** Ready for troubleshooting

