# Registration System - Testing Guide

## 🧪 Test Scenarios & Expected Results

### Test 1: Complete Registration Successfully ✅

**Steps:**
1. Sign up with new email
2. Enter all information correctly across all steps
3. Click "Complete Registration" on final step

**Expected:**
- Data saves to Supabase
- Success message shows
- Redirects to dashboard after 1.5 seconds
- Profile shows all entered data

**Test Data:**
```
Full Name: John Doe
ID Number: 12345678
Phone: +254712345678
Location: Turuturu
Occupation: Software Engineer
Employment Status: Employed
Education: Bachelor's Degree
Interests: Technology, Education
Notes: Happy to contribute
```

---

### Test 2: Skip Optional Fields ⏭️

**Steps:**
1. Sign up with new email
2. Complete required steps (1-2)
3. Click "Skip" on step 3 (Occupation)
4. Click "Skip" on step 4 (Interests)
5. Click "Skip" on step 5 (Education)
6. Fill only step 6 or skip it too
7. Complete registration

**Expected:**
- "Step Skipped" toast appears
- Move to next step
- Skip button doesn't save data
- Can complete registration with only required fields
- Profile saved with NULL values for skipped fields

---

### Test 3: Validation - Empty Required Fields ❌

**Steps:**
1. Sign up
2. Leave Full Name empty
3. Try to click Next

**Expected:**
- Error message: "Name is required"
- Field highlights in red
- Next button disabled/stays disabled
- Cannot proceed

---

### Test 4: Validation - Invalid Phone Format ❌

**Steps:**
1. Complete first step with:
   - Valid name ✓
   - Valid ID ✓
   - Invalid phone: "123" (too short)
2. Try to click Next

**Expected:**
- Error message: "Please enter a valid phone number"
- Phone field highlights
- Cannot proceed
- Stays on same step

---

### Test 5: Validation - Invalid ID Format ❌

**Steps:**
1. Complete first step with:
   - Valid name ✓
   - Invalid ID: "123" (too short)
   - Valid phone ✓
2. Try to click Next

**Expected:**
- Error message: "Please enter a valid ID number"
- ID field highlights
- Cannot proceed

---

### Test 6: Back Navigation 🔙

**Steps:**
1. Complete steps 1-2 successfully
2. Fill step 3 with occupation data
3. Click "Back" button
4. Click "Back" again to step 1

**Expected:**
- Data preserved when navigating back
- Form fields still populated
- Can review and edit previous answers
- Step indicator shows current position

---

### Test 7: Custom Location ✏️

**Steps:**
1. Complete steps 1-2
2. On Location step, select "Other"
3. Input custom location: "Mombasa"
4. Try to proceed without custom location filled first

**Expected:**
- Custom location field appears
- Required if "Other" is selected
- Error if trying to skip with "Other" selected
- Saves custom location to database

---

### Test 8: Step Progress Indicator 📊

**Steps:**
1. Sign up
2. Navigate through all steps
3. Check progress bar and step indicators

**Expected:**
- Progress bar increases with each step
- Shows "Step X of 6"
- Shows percentage completion
- Completed steps show green checkmarks
- Current step highlighted in primary color
- Can click on completed steps to return to them

---

### Test 9: Mobile Responsiveness 📱

**Steps:**
1. Open registration on mobile device or use dev tools (F12 → Toggle device toolbar)
2. Navigate through all steps
3. Try on different screen sizes (iPhone, iPad, Android)

**Expected:**
- Responsive layout works
- Buttons are touch-friendly
- Forms are readable
- No overflow/horizontal scrolling
- Step indicators work or collapse appropriately

---

### Test 10: Dark Mode 🌙

**Steps:**
1. Enable dark mode in system settings
2. Navigate through registration

**Expected:**
- All text is readable in dark mode
- Colors contrast properly
- Form fields visible
- Buttons accessible
- Icons visible

---

### Test 11: Data Persistence 💾

**Steps:**
1. Fill steps 1-3
2. Open DevTools (F12)
3. Check Application → Local Storage
4. Navigate back
5. Return to form

**Expected:**
- Form data preserved in React state
- Can navigate back and forward
- Data persists on same page
- Data resets if page refresh (unless implemented)

---

### Test 12: Loading States ⏳

**Steps:**
1. Complete registration
2. Observe the button state
3. Watch for spinner/loader

**Expected:**
- Button shows spinner while saving
- Button text changes to "Creating Profile..."
- Button disabled during save
- After save: redirects with success message

---

### Test 13: Error Recovery 🔄

**Steps:**
1. Intentionally disconnect internet
2. Try to complete registration
3. Reconnect internet
4. Retry

**Expected:**
- Shows connection error
- User can retry
- After reconnection, can proceed
- Data doesn't duplicate

---

### Test 14: Interest Multi-Selection 🎯

**Steps:**
1. Navigate to Interests step
2. Select multiple interests (e.g., Technology, Education, Agriculture)
3. Deselect one
4. Complete registration

**Expected:**
- Can select/deselect multiple
- Selected items highlight
- Array saved correctly to database
- Can view in admin/user profile

---

### Test 15: Employment Status & Student Checkbox ✓

**Steps:**
1. Select "Student" in Employment Status
2. Check "I am a student" checkbox
3. Complete registration

**Expected:**
- Both fields independent
- Both save correctly
- User can be student and employed simultaneously
- Data accessible in profile

---

### Test 16: Database Verification 🗄️

**Steps:**
1. Complete registration
2. Check Supabase dashboard
3. Navigate to profiles table
4. Find your test user

**Expected:**
- All filled fields saved
- Skipped fields are NULL
- Timestamps correct
- Data matches what was entered
- ID matches auth user ID

---

## 📋 Validation Test Matrix

| Field | Test Value | Expected Result |
|-------|------------|-----------------|
| Full Name | "" (empty) | ❌ Error: "Name is required" |
| Full Name | "Jo" | ✅ Valid (≥2 chars) |
| Full Name | "John Doe" | ✅ Valid |
| Phone | "" (empty) | ❌ Error: "Phone required" |
| Phone | "123" | ❌ Error: "Invalid format" |
| Phone | "+254712345678" | ✅ Valid |
| Phone | "0712345678" | ✅ Valid |
| ID | "" (empty) | ❌ Error: "ID required" |
| ID | "123" | ❌ Error: "Invalid ID" |
| ID | "12345678" | ✅ Valid |
| Location | "Turuturu" | ✅ Valid |
| Location | "Other" (no custom) | ❌ Error: "Specify location" |
| Location | "Other" + "Nairobi" | ✅ Valid |

---

## 🎬 Complete User Journey Test

```
1. NEW USER SIGN UP
   ↓
2. ENTER PERSONAL INFO
   - Name: Jane Smith
   - Phone: +254798765432
   - ID: 87654321
   - Click Next ✓
   ↓
3. SELECT LOCATION
   - Location: Gatune
   - Click Next ✓
   ↓
4. WORK INFO (Optional)
   - Occupation: Teacher
   - Employment: Employed
   - Student: No
   - Click Next ✓
   ↓
5. INTERESTS (Optional)
   - Select: Education, Healthcare
   - Click Next ✓
   ↓
6. EDUCATION (Optional)
   - Level: Diploma
   - Click Next ✓
   ↓
7. ADDITIONAL INFO (Optional)
   - Notes: "Looking forward to community involvement"
   - Click Complete Registration ✓
   ↓
8. SUCCESS
   - See: "Profile Completed!" message
   - 1.5 second delay
   - Redirects to Dashboard ✓
   ↓
9. VERIFY
   - Check Supabase: Data saved
   - Check Profile: All fields show
   - Success! ✓
```

---

## 🐛 Browser Console Checks

**What to look for:**

✅ **No errors:**
```
✓ No red error messages in console
```

✅ **Supabase connection working:**
```
[Supabase] Connected to project: mkcgkfzltohxagqvsbqk
```

✅ **Form validation working:**
```
console.log("Validation passed")
console.log("Saving to Supabase...")
```

❌ **Issues to watch:**
```
✗ Error: "Cannot find module"
✗ Error: "Supabase is not defined"
✗ Error: "RLS policy violation"
✗ CORS errors
```

---

## 📊 Performance Testing

### Page Load
- [ ] Registration form loads within 2 seconds
- [ ] No lag when typing
- [ ] Progress bar smooth

### Step Navigation
- [ ] Next/Back buttons respond instantly
- [ ] No freezing during transitions
- [ ] Smooth animations

### Saving
- [ ] Save completes within 3-5 seconds
- [ ] Loading spinner shows immediately
- [ ] Redirect happens after save completes

---

## ♿ Accessibility Testing

- [ ] Keyboard navigation works (Tab, Shift+Tab, Enter)
- [ ] Screen reader compatible
- [ ] Focus visible on all interactive elements
- [ ] Error messages clear and informative
- [ ] Color not only way to convey info (error text + icon)
- [ ] Required field indicators visible to all users

---

## 📝 Test Results Template

```markdown
## Registration Test - [Date]

**Tester:** [Name]
**Browser:** [Chrome/Firefox/Safari]
**Device:** [Desktop/Mobile/Tablet]
**Environment:** [Development/Production]

### Test Cases
- [x] Test 1: Complete Registration - PASSED
- [ ] Test 2: Skip Optional Fields - [Status]
- [ ] Test 3: Empty Field Validation - [Status]
- [ ] Test 4: Invalid Phone - [Status]
- [ ] Test 5: Invalid ID - [Status]

### Issues Found
1. [Issue description] - [Severity: Critical/High/Medium/Low]
2. ...

### Browser Console Errors
- [Error 1]
- [Error 2]

### Recommendations
1. [Recommendation]
2. [Recommendation]

### Overall Status
**PASS** / **FAIL** / **PASS WITH ISSUES**
```

---

## 🚀 Pre-Production Testing Checklist

- [ ] All 16 test scenarios passed
- [ ] No browser console errors
- [ ] Mobile responsive on 3+ devices
- [ ] Dark mode working
- [ ] Data verified in Supabase
- [ ] Back button works correctly
- [ ] Skip buttons work on optional steps
- [ ] All validations working
- [ ] Loading states visible
- [ ] Success message shows
- [ ] Redirect to dashboard works
- [ ] Accessibility basic checks pass
- [ ] Performance acceptable
- [ ] No security issues observed

---

**Once all tests pass, you're ready for production deployment!** 🎉
