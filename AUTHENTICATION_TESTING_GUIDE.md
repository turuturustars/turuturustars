# Authentication Flow Testing Guide

## Quick Start Testing

### Test 1: New User Signup Flow
**Objective**: Verify new users are prompted to complete profile after signup

**Steps**:
1. Navigate to `http://localhost:5173/auth`
2. Click "Sign up"
3. Fill in signup form:
   - Email: `testuser+signup@example.com`
   - Password: `TestPassword123!`
   - Confirm Password: `TestPassword123!`
4. Click "Sign up" button

**Expected Results**:
- ✅ Signup completes
- ✅ Loading spinner appears briefly
- ✅ Profile form displays with title "Complete Your Profile"
- ✅ Form shows required fields: Full Name, Phone, ID Number
- ✅ Form shows optional fields: Occupation, Location

**What to Check**:
- Form fields are editable
- Labels are visible
- Icons appear next to fields (User, Phone, MapPin, Briefcase)
- "Complete Profile" and "Skip for Now" buttons are present

---

### Test 2: Fill and Submit Profile Form
**Objective**: Verify profile data is saved correctly

**Setup**: Complete Test 1 first (user at profile form)

**Steps**:
1. Fill "Full Name": `John Doe`
2. Fill "Phone": `0712345678`
3. Fill "ID Number": `123456789`
4. Fill "Occupation": `Software Engineer` (optional)
5. Select "Location": `Turuturu`
6. Click "Complete Profile" button

**Expected Results**:
- ✅ Form shows loading state (button disabled, spinner visible)
- ✅ Success screen appears with checkmark
- ✅ "Profile Completed Successfully" message displayed
- ✅ After 2 seconds, auto-redirects to `/dashboard`

**What to Check**:
- Data was saved to database (check Supabase profiles table)
- User can access dashboard after redirect
- Profile page shows saved information

---

### Test 3: Skip Profile Form
**Objective**: Verify "Skip for Now" button works

**Setup**: Complete Test 1 first (user at profile form)

**Steps**:
1. Click "Skip for Now" button without filling form
2. Observe redirect

**Expected Results**:
- ✅ Immediately redirects to `/dashboard`
- ✅ No validation errors shown
- ✅ User can access dashboard despite incomplete profile

**What to Check**:
- Dashboard loads successfully
- User can still access dashboard features
- Can return to complete profile later

---

### Test 4: Returning User with Complete Profile
**Objective**: Verify returning users with complete profiles skip the form

**Setup**: 
- Use account created in Test 2 (profile complete)
- Make sure you're logged out first

**Steps**:
1. Navigate to `http://localhost:5173/auth`
2. Click "Log in"
3. Enter:
   - Email: `testuser+signup@example.com`
   - Password: `TestPassword123!`
4. Click "Log in" button

**Expected Results**:
- ✅ Login completes
- ✅ Loading spinner appears
- ✅ **No profile form shown**
- ✅ Auto-redirects directly to `/dashboard`

**What to Check**:
- Form never appears
- Redirect happens quickly
- Dashboard is accessible

---

### Test 5: Returning User with Incomplete Profile
**Objective**: Verify returning users with incomplete profiles see the form

**Setup**:
- Create new test account and use "Skip for Now" (incomplete profile)
- Make sure you're logged out

**Steps**:
1. Navigate to `http://localhost:5173/auth`
2. Click "Log in"
3. Enter:
   - Email: `testuser+incomplete@example.com`
   - Password: `TestPassword123!`
4. Click "Log in" button

**Expected Results**:
- ✅ Login completes
- ✅ Loading spinner appears
- ✅ Profile form displays (not dashboard)
- ✅ Can now complete profile or skip again

**What to Check**:
- Form appears every time until profile is complete
- Clicking "Complete Profile" saves data
- Clicking "Skip" allows dashboard access anyway

---

### Test 6: Validation Errors
**Objective**: Verify form validation works correctly

**Setup**: User at profile form (Test 1-3)

**Steps**:
1. Leave "Full Name" empty, fill other fields
2. Click "Complete Profile"

**Expected Results**:
- ✅ Error message appears under Full Name field
- ✅ Form submission blocked
- ✅ User can correct and resubmit

**Repeat for each field**:
- Full Name: Min 2 characters
- Phone: Min 10 characters
- ID Number: Min 6 characters
- Location: Must select one

---

### Test 7: Custom Location
**Objective**: Verify custom location input works

**Setup**: User at profile form

**Steps**:
1. Select "Other" from Location dropdown
2. Observe new text field appears
3. Enter custom location: `My Custom Town`
4. Fill other required fields
5. Click "Complete Profile"

**Expected Results**:
- ✅ Text field appears when "Other" selected
- ✅ Can type in custom location field
- ✅ Custom location is required when "Other" is selected
- ✅ Profile saves with custom location

---

### Test 8: Loading State
**Objective**: Verify loading states are shown correctly

**Setup**: User at profile form

**Steps**:
1. Fill all required fields
2. Click "Complete Profile"
3. Quickly observe button state

**Expected Results**:
- ✅ Button text changes to show loading (if implemented)
- ✅ Button is disabled during submission
- ✅ Loading spinner appears on button
- ✅ Form inputs are disabled

---

### Test 9: Error Handling
**Objective**: Verify error messages are shown on failure

**Setup**: User at profile form

**Steps**:
1. Fill form with valid data
2. Interrupt network (in DevTools: Network → Offline)
3. Click "Complete Profile"
4. Resume network connection

**Expected Results**:
- ✅ Error toast notification appears
- ✅ Form data is preserved
- ✅ User can retry submission
- ✅ No automatic redirect on error

---

### Test 10: Responsive Design
**Objective**: Verify form is responsive across devices

**Setup**: Open `/auth` in dev mode

**Mobile (< 640px)**:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Set to mobile view
4. Navigate through profile form

**Expected Results**:
- ✅ Form is single column
- ✅ Fields are properly spaced
- ✅ Buttons are full width
- ✅ Labels and inputs are readable
- ✅ Touch-friendly input sizes

**Tablet (640-1024px)**:
1. Set device to tablet size
2. Navigate through profile form

**Expected Results**:
- ✅ Form may be two columns (if implemented)
- ✅ Proper spacing maintained
- ✅ All fields visible without scrolling (if possible)

---

## Database Verification

### Check Profile Was Saved
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Run query:
```sql
SELECT id, full_name, phone, id_number, occupation, location 
FROM profiles 
WHERE full_name = 'John Doe';
```

**Expected Results**:
```
id           | full_name | phone      | id_number | occupation           | location
-------------|-----------|------------|-----------|----------------------|----------
[user_id]   | John Doe  | 0712345678 | 123456789 | Software Engineer    | Turuturu
```

---

## Browser Console Checks

### Check for Errors
1. Open DevTools (F12)
2. Go to Console tab
3. Complete signup flow
4. Verify no errors appear

**Expected Results**:
- ✅ No red error messages
- ✅ Auth state changes logged (optional)
- ✅ No network errors

---

## Performance Checks

### Check Load Times
1. Open DevTools (F12)
2. Go to Network tab
3. Navigate to `/auth`
4. Complete signup flow

**Expected Results**:
- ✅ Auth page loads < 2 seconds
- ✅ Profile form loads < 1 second
- ✅ Submit completes < 3 seconds
- ✅ No failed requests

---

## Common Issues & Solutions

### Issue: Form doesn't appear after signup
**Solution**:
1. Check browser console for errors
2. Verify Supabase connection
3. Check if profiles table has required columns
4. Clear browser cache and refresh

### Issue: Profile form shows validation errors incorrectly
**Solution**:
1. Check Zod schema in PostAuthDetailsForm.tsx
2. Verify field names match schema
3. Clear form data and try again

### Issue: Auto-redirect doesn't work
**Solution**:
1. Check React Router configuration in App.tsx
2. Verify routing is correctly set up
3. Check for JavaScript errors in console
4. Try manual navigation to /dashboard

### Issue: Database save fails silently
**Solution**:
1. Check Supabase RLS policies allow inserts
2. Verify user has correct permissions
3. Check for validation errors in form
4. Check database connection

---

## Test Checklist

### Critical Path Tests (Must Pass)
- [ ] Test 1: New user signup shows profile form
- [ ] Test 2: Profile form saves data correctly
- [ ] Test 4: Returning user with complete profile skips form
- [ ] Test 5: Returning user with incomplete profile sees form

### Validation Tests (Must Pass)
- [ ] Test 6: Required field validation works
- [ ] Test 7: Custom location field works

### UX Tests (Should Pass)
- [ ] Test 3: Skip button works
- [ ] Test 8: Loading state is visible
- [ ] Test 9: Error handling shows messages
- [ ] Test 10: Responsive design works

### Data Integrity Tests (Must Pass)
- [ ] Database verification: Profile data saved correctly
- [ ] No duplicate profiles created
- [ ] Profile data persists across sessions

---

## Build Verification

**Current Build Status**: ✅ PASSING

```bash
$ npm run build

# Result:
vite v5.4.19 building for production...
✓ 2978 modules transformed
✓ built in 27.55s
```

All tests can proceed with confidence that code compiles correctly.

---

## Testing Environments

### Local Development
```bash
npm run dev
# Opens at http://localhost:5173
```

### Production Build Testing
```bash
npm run build
npm run preview
# Preview at http://localhost:4173
```

### Test Accounts
Create fresh test accounts for each test scenario:
- Test 1 & 2: `testuser+signup@domain.com`
- Test 4: `testuser+existing@domain.com` (with complete profile)
- Test 5: `testuser+incomplete@domain.com` (skip form)

---

## Notes

- Clear browser cache between tests if needed
- Use incognito/private mode for fresh session testing
- Check browser DevTools for detailed error information
- Supabase real-time listeners may take 1-2 seconds
- All form data is persisted on database, not just in state

