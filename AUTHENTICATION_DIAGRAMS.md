# 🔐 Authentication System - Visual Diagrams & Flowcharts

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TURUTURU STARS AUTH SYSTEM                         │
└─────────────────────────────────────────────────────────────────────────────┘

FRONTEND LAYER (React/Vite)
┌──────────────────────────────────────────────────────────────────────────┐
│  Pages: /auth, /register, /dashboard                                   │
│  Components: Auth.tsx, StepByStepRegistration.tsx, ProtectedRoute.tsx  │
│  Hooks: useAuth.ts, useCaptcha.ts                                      │
└──────────────────────────────────────────────────────────────────────────┘
                                  ↑↓
BACKEND LAYER (Supabase)
┌──────────────────────────────────────────────────────────────────────────┐
│  Auth Service: Email/Password, OAuth (Google)                         │
│  Database: PostgreSQL                                                  │
│  Tables: auth.users, profiles                                         │
│  Functions: handle_new_user()                                         │
│  Triggers: on_auth_user_created                                       │
│  Edge Functions: create-profile, verify-turnstile, etc.              │
└──────────────────────────────────────────────────────────────────────────┘
                                  ↑↓
STORAGE LAYER
┌──────────────────────────────────────────────────────────────────────────┐
│  Session Storage: localStorage (sb-*-auth-token)                       │
│  Profile Data: profiles table (PostgreSQL)                             │
│  User Data: auth.users table (PostgreSQL)                              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Login Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                                      │
└─────────────────────────────────────────────────────────────────────────┘

[1] User visits /auth
      │
      ├─→ AuthFlow component renders
      ├─→ Checks if already authenticated
      │   └─→ If yes: Redirect to /dashboard
      │   └─→ If no: Show Auth.tsx (login form)
      │
[2] User fills form
      │
      ├─→ Email: test@example.com
      ├─→ Password: ••••••••
      ├─→ Click "Sign In"
      │
[3] Frontend validation
      │
      ├─→ Email format valid? ✓
      ├─→ Password length ≥ 6? ✓
      ├─→ No errors? Proceed
      │
[4] Send to Supabase
      │
      ├─→ POST /auth/v1/token
      ├─→ Body: {email, password}
      │
[5] Supabase authenticates
      │
      ├─→ Query auth.users WHERE email = 'test@example.com'
      ├─→ User found? ✓
      ├─→ Verify password hash
      ├─→ Password matches? ✓
      ├─→ Generate JWT token
      ├─→ Return token + user data
      │
[6] Frontend receives response
      │
      ├─→ Token stored in localStorage
      ├─→ useAuth hook updated
      ├─→ Session state changed
      │
[7] Fetch user profile
      │
      ├─→ Query profiles table
      ├─→ WHERE id = user.id
      ├─→ Check if full_name, phone, id_number exist
      │
[8] Check profile completion
      │
      ├─→ Profile complete? 
      │   └─→ YES: Navigate to /dashboard
      │   └─→ NO: Navigate to /register
      │
[9] Final state
      │
      ├─→ Dashboard shows user info
      ├─→ Session persisted (localStorage)
      ├─→ User can access protected pages
      │
[END] ✓ Login successful
```

---

## Signup Flow (Detailed)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SIGNUP FLOW                                     │
└──────────────────────────────────────────────────────────────────────────┘

[1] User visits /auth?mode=signup
      │
      ├─→ Auth.tsx renders signup form
      │
[2] User fills form
      │
      ├─→ Email: newuser@example.com
      ├─→ Password: password123
      ├─→ Confirm: password123
      ├─→ Click "Create Account"
      │
[3] Frontend validation
      │
      ├─→ Email format valid? ✓
      ├─→ Password length ≥ 6? ✓
      ├─→ Passwords match? ✓
      ├─→ No errors? Proceed
      │
[4] Send to Supabase Auth
      │
      ├─→ POST /auth/v1/signup
      ├─→ Body: {email, password}
      │
[5] Supabase creates user
      │
      ├─→ Check if email already exists
      ├─→ Email unique? ✓
      ├─→ Hash password
      ├─→ Create user in auth.users
      ├─→ Return user + session
      │
[6] Database trigger fires
      │
      ├─→ Trigger: on_auth_user_created
      ├─→ Function: handle_new_user()
      ├─→ INSERT INTO profiles (id, email)
      ├─→ Profile row created ✓
      │
[7] Two scenarios:

      SCENARIO A: Email confirmation DISABLED
      │
      ├─→ Session created immediately
      ├─→ waitForProfile() polls for profile
      ├─→ Profile found ✓
      ├─→ Navigate to /register
      │
      SCENARIO B: Email confirmation REQUIRED
      │
      ├─→ No immediate session
      ├─→ Confirmation email sent
      ├─→ Store in localStorage
      ├─→ Navigate to /register
      ├─→ Show "Check your email" message
      ├─→ User clicks confirmation link
      ├─→ Profile created by trigger
      ├─→ Redirect to /register
      │
[8] Registration form (/register)
      │
      ├─→ StepByStepRegistration component
      ├─→ Step 1: Full Name
      ├─→ Step 2: Phone Number
      ├─→ Step 3: ID Number
      ├─→ ... more steps
      │
[9] User completes form
      │
      ├─→ All fields filled
      ├─→ Click "Complete Registration"
      │
[10] Save to database
      │
      ├─→ UPDATE profiles
      ├─→ WHERE id = user.id
      ├─→ SET full_name, phone, id_number, etc.
      ├─→ Profile complete ✓
      │
[11] Navigate to dashboard
      │
      ├─→ Redirect to /dashboard
      ├─→ Dashboard loads
      ├─→ User data displayed
      │
[END] ✓ Signup + Registration complete
```

---

## Registration Form Flow

```
┌────────────────────────────────────────────────────────────────┐
│            REGISTRATION FORM FLOW (/register)                │
└────────────────────────────────────────────────────────────────┘

User lands on /register
      │
      ├─→ Check authentication status
      │   │
      │   ├─→ If authenticated:
      │   │   ├─→ Load StepByStepRegistration
      │   │   └─→ Show interactive form
      │   │
      │   ├─→ If not authenticated:
      │   │   ├─→ Check localStorage for pending signup
      │   │   ├─→ If pending:
      │   │   │   └─→ Show "Confirm email" guidance
      │   │   ├─→ If not pending:
      │   │   │   └─→ Show "Create account first" message
      │   │
      ├─→ User sees form with steps:
      │   │
      │   ├─→ [Step 1] Full Name (required)
      │   ├─→ [Step 2] Phone Number (required)
      │   ├─→ [Step 3] ID Number (required)
      │   ├─→ [Step 4] Membership Number (optional)
      │   ├─→ [Step 5] Location (optional)
      │   ├─→ [Step 6] Occupation (optional)
      │   │
      ├─→ User navigates through steps
      │   │
      │   ├─→ Can skip optional steps
      │   ├─→ Can go back to previous steps
      │   ├─→ Shows progress bar
      │   │
      ├─→ User clicks "Complete Registration"
      │   │
      │   ├─→ Validate all required fields
      │   ├─→ No errors? Continue
      │   │
      ├─→ Submit form data
      │   │
      │   ├─→ POST /profiles (or UPDATE if exists)
      │   ├─→ Body: {full_name, phone, id_number, ...}
      │   │
      ├─→ Database saves profile
      │   │
      │   ├─→ UPDATE profiles SET (...)
      │   ├─→ WHERE id = user.id
      │   ├─→ Profile marked as complete ✓
      │   │
      ├─→ Frontend receives confirmation
      │   │
      │   ├─→ Show success message
      │   ├─→ Navigate to /dashboard
      │   │
[END] ✓ Registration complete
```

---

## Error Recovery Flowchart

```
┌────────────────────────────────────────────────────────────────┐
│              ERROR DIAGNOSIS & RECOVERY                       │
└────────────────────────────────────────────────────────────────┘

[PROBLEM] User gets error
      │
      ├─→ Error 1: "Invalid credentials"
      │   │
      │   ├─→ Cause: User doesn't exist
      │   ├─→ Solution: Create test user in Supabase
      │   └─→ Fix: Run SQL INSERT command
      │
      ├─→ Error 2: "Access denied to profiles"
      │   │
      │   ├─→ Cause: RLS policies too restrictive
      │   ├─→ Solution: Update RLS policies
      │   └─→ Fix: Run SQL policy update command
      │
      ├─→ Error 3: "Profile not found"
      │   │
      │   ├─→ Cause: Trigger didn't fire
      │   ├─→ Solution: Create database trigger
      │   └─→ Fix: Run SQL trigger creation command
      │
      ├─→ Error 4: "Stuck in registration"
      │   │
      │   ├─→ Cause: Profile incomplete
      │   ├─→ Solution: Complete profile fields
      │   └─→ Fix: Fill form or manually update DB
      │
      ├─→ Error 5: "Can't save form"
      │   │
      │   ├─→ Cause: Database or RLS issue
      │   ├─→ Solution: Check database & policies
      │   └─→ Fix: Run diagnostics first
      │
      └─→ Unknown error?
          │
          ├─→ Step 1: Visit /auth-diagnostics
          ├─→ Step 2: Run all tests
          ├─→ Step 3: Note any errors
          ├─→ Step 4: Check AUTH_FIXES_CHECKLIST.md
          └─→ Step 5: Follow the fix for your error
```

---

## Database Schema (Simplified)

```
┌───────────────────────────────────────┐
│          auth.users                   │
├───────────────────────────────────────┤
│ id (UUID, PK)                         │
│ email (string, unique)                │
│ encrypted_password (string)           │
│ email_confirmed_at (timestamp, null)  │
│ created_at (timestamp)                │
│ updated_at (timestamp)                │
│ ... (other auth fields)               │
└─────────────────┬─────────────────────┘
                  │ 1:1
                  │
                  ↓
┌───────────────────────────────────────┐
│        profiles (public)               │
├───────────────────────────────────────┤
│ id (UUID, PK, FK to auth.users)      │
│ email (string, optional)              │
│ full_name (string)                    │
│ phone (string)                        │
│ id_number (string)                    │
│ membership_number (string, optional)  │
│ status (enum: active/dormant/etc)    │
│ photo_url (string, optional)          │
│ location (string, optional)           │
│ occupation (string, optional)         │
│ created_at (timestamp)                │
│ updated_at (timestamp)                │
└───────────────────────────────────────┘
```

---

## State Management Flow

```
┌──────────────────────────────────────────────────────────┐
│           useAuth() Hook State Management               │
└──────────────────────────────────────────────────────────┘

Component mounts
      │
      ├─→ useAuth() hook initializes
      │   │
      │   ├─→ Call supabase.auth.getSession()
      │   ├─→ If session exists:
      │   │   ├─→ setUser(session.user)
      │   │   ├─→ Fetch profile
      │   │   ├─→ setProfile(profileData)
      │   │   └─→ Fetch roles
      │   │
      │   └─→ If no session:
      │       ├─→ setUser(null)
      │       └─→ setIsLoading(false)
      │
      ├─→ Subscribe to onAuthStateChange
      │   │
      │   ├─→ On SIGNED_IN:
      │   │   ├─→ setUser(user)
      │   │   ├─→ Fetch profile
      │   │   └─→ Fetch roles
      │   │
      │   ├─→ On SIGNED_OUT:
      │   │   ├─→ setUser(null)
      │   │   ├─→ setProfile(null)
      │   │   └─→ setRoles([])
      │   │
      │   └─→ On PASSWORD_RECOVERY:
      │       └─→ Update user state
      │
      ├─→ Return state to component:
      │   ├─→ user
      │   ├─→ session
      │   ├─→ profile
      │   ├─→ roles
      │   └─→ isLoading
      │
[READY] Component can use auth state
```

---

## Session Lifecycle

```
┌──────────────────────────────────────────────────┐
│           SESSION LIFECYCLE                     │
└──────────────────────────────────────────────────┘

[1] Login successful
      │
      ├─→ Access token generated
      ├─→ Refresh token generated
      ├─→ Stored in localStorage:
      │   └─→ sb-{project-id}-auth-token
      │
[2] Session active
      │
      ├─→ User can access /dashboard
      ├─→ Token included in all API requests
      ├─→ Supabase validates token
      │
[3] Session state
      │
      ├─→ Token remains valid for ≈ 1 hour
      ├─→ When near expiry:
      │   ├─→ Refresh token used
      │   ├─→ New access token issued
      │   └─→ Session continues seamlessly
      │
[4] Page reload
      │
      ├─→ localStorage persists session
      ├─→ useAuth checks for existing session
      ├─→ User stays logged in ✓
      │
[5] Browser close
      │
      ├─→ localStorage preserved (even after close)
      ├─→ User's session remains active
      ├─→ Reopen app → Still logged in ✓
      │
[6] Logout clicked
      │
      ├─→ User clicks logout button
      ├─→ Call supabase.auth.signOut()
      ├─→ Token revoked
      ├─→ localStorage cleared
      ├─→ Redirect to /auth
      │
[END] ✓ Session ended
```

---

## Protection Layer Diagram

```
┌────────────────────────────────────────────────┐
│        ROUTE PROTECTION LAYERS                │
└────────────────────────────────────────────────┘

Public Routes
├─ /                    No auth required
├─ /about               No auth required
├─ /auth                No auth required (redirects to dashboard if authenticated)
├─ /register            No auth required (but shows different UI based on state)
└─ /careers             No auth required

Protected Routes (All under /dashboard)
├─ /dashboard/home      Requires: Authentication ✓
├─ /dashboard/profile   Requires: Authentication ✓
├─ /dashboard/finance/* Requires: Authentication ✓
└─ ... all others       Requires: Authentication ✓

Role-Based Routes
├─ /dashboard/roles/admin            Requires: admin role
├─ /dashboard/roles/treasurer        Requires: treasurer role
├─ /dashboard/roles/secretary        Requires: secretary role
└─ ... others                        Requires: specific role

Flow for protected route:
┌─────────────────┐
│ User visits     │
│ /dashboard      │
└────────┬────────┘
         │
         ├─→ ProtectedRoute component
         │   │
         │   ├─→ Is user authenticated?
         │   │   ├─→ YES: Continue to /dashboard
         │   │   └─→ NO: Redirect to /auth
         │   │
         │   ├─→ Does user have required role?
         │   │   ├─→ YES: Show dashboard
         │   │   └─→ NO: Show "Access Denied"
         │   │
         └─→ Component renders with auth check ✓
```

---

## Summary Flow

```
USER JOURNEY MAP
═══════════════════════════════════════════════════════════

[Visit App]
    ↓
[Authenticated?]
    ├─→ YES: Profile complete?
    │         ├─→ YES: /dashboard ✓
    │         └─→ NO: /register
    │
    └─→ NO: /auth (login/signup)

[From /auth]
    ├─→ Login path:
    │   ├─→ Verify credentials
    │   ├─→ Check profile
    │   └─→ /dashboard or /register
    │
    └─→ Signup path:
        ├─→ Create account
        ├─→ Auto-create profile (trigger)
        └─→ /register (complete profile)

[From /register]
    ├─→ Complete form
    ├─→ Save to database
    └─→ /dashboard ✓

[In /dashboard]
    ├─→ Access all features
    ├─→ View profile
    ├─→ Manage contributions
    └─→ ... other features
```

---

**Last Updated:** January 31, 2026

