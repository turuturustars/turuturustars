# Authentication Flow Explained

## Overview
Your project has **THREE separate but related flows**. Here's the difference:

---

## 1. **Authentication (Login)** - `/auth`
**What it is:** Sign in with an existing account
**File:** `src/pages/Auth.tsx`
**What happens:**
- User enters email & password
- Authenticates with Supabase Auth
- If valid, redirected to `/dashboard`

```
User enters credentials → Auth validates → Success → Dashboard
```

---

## 2. **Registration (Create Account)** - `/register`
**What it is:** Create a new user account
**File:** `src/pages/Register.tsx` + `src/components/auth/StepByStepRegistration.tsx`
**What happens:**
- User goes through 6-step guided registration
- Creates account in Supabase Auth
- Saves profile information (name, location, occupation, etc.)
- Redirected to `/dashboard`

**The 6 Steps:**
1. Personal Information (name, ID, phone) - REQUIRED
2. Location (where are you from) - REQUIRED
3. Occupation (job details) - OPTIONAL
4. Interests (areas of interest) - OPTIONAL
5. Education (education level) - OPTIONAL
6. Additional Info (extra notes) - OPTIONAL

```
User fills form → Creates Auth account → Saves profile → Dashboard
```

---

## 3. **Profile Setup** - `/profile-setup`
**What it is:** Complete profile after account creation
**File:** `src/pages/ProfileSetup.tsx`
**What happens:**
- User completes email verification
- Adds profile details (full name, phone, location, bio, profile image)
- Then can access dashboard

```
Email verified → Complete profile info → Dashboard
```

---

## The Complete User Journey

### **New User (Never seen before)**
```
Landing Page
    ↓
Click "Sign Up" → /register
    ↓
StepByStepRegistration (6-step form)
    ↓
Create account in Auth
    ↓
Save profile data
    ↓
→ /dashboard (Already has all info)
```

### **Returning User (Already has account)**
```
Landing Page
    ↓
Click "Sign In" → /auth
    ↓
Login Form (email + password)
    ↓
Auth validates
    ↓
→ /dashboard (Already authenticated)
```

---

## Key Differences

| Feature | Auth (Login) | Register | Profile Setup |
|---------|-----------|----------|----------------|
| **Purpose** | Sign in existing user | Create new account | Complete info after signup |
| **URL** | `/auth` | `/register` | `/profile-setup` |
| **Fields** | Email, Password | Multi-step form + profile fields | Profile image, bio, etc. |
| **Database** | Supabase Auth | Supabase Auth + Profiles table | Profiles table |
| **Next Step** | Dashboard | Dashboard | Dashboard |

---

## Registration vs Create Account

**These are the SAME THING:**
- "Registration" = User creates an account for the first time
- "Create Account" = Creating a new account during registration
- "Signup" = Same as registration

The `/register` page is where users create their account by filling out the 6-step form.

---

## Current Implementation Status

✅ **Auth (Login)** - `/auth` - WORKING
  - Email/password login
  - Redirect to dashboard if already logged in

✅ **Registration** - `/register` - WORKING
  - 6-step guided registration
  - Creates auth account
  - Saves profile to database
  - Auto-redirects to dashboard

✅ **Profile Setup** - `/profile-setup` - WORKING
  - Email verification
  - Profile completion with image upload

---

## How Users Get to Each Page

**Go to Auth (Login):**
- Click "Sign In" on homepage
- Existing users login here
- URL: `https://turuturustars.co.ke/auth`

**Go to Register (Create Account):**
- Click "Sign Up" on homepage
- New users create account here
- URL: `https://turuturustars.co.ke/register`

**Profile Setup (Auto-triggered):**
- Happens automatically after signup
- Only shown if profile not complete
- URL: `https://turuturustars.co.ke/profile-setup`

---

## Common Confusion Points

### ❌ "Why do I have both Auth and Register pages?"
✅ **Because they serve different users:**
- `/auth` = For people who already have accounts
- `/register` = For new people creating accounts

### ❌ "What's the difference between Register and Profile Setup?"
✅ **Register creates the account. Profile Setup adds extra details:**
- Register = Create login credentials
- Profile Setup = Add profile picture, bio, etc.

### ❌ "Can users skip the 6-step registration?"
✅ **Partially:**
- Steps 1-2 are REQUIRED (personal info + location)
- Steps 3-6 are OPTIONAL (can skip or fill later)

---

## Next Steps to Consider

1. **Email Verification** - Make sure users verify emails after registration
2. **Profile Image Upload** - Currently in ProfileSetup, could be in registration
3. **Onboarding Tour** - Guide new users after first login
4. **Forgot Password** - Already implemented, see `ForgotPassword.tsx`
