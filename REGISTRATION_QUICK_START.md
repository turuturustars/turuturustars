# Quick Start: Step-by-Step Registration

## 🚀 Getting Started in 5 Minutes

### Step 1: Apply Database Migration
Run in your Supabase project:

```bash
# Using Supabase CLI
supabase db push
```

Or copy-paste the SQL from:
`supabase/migrations/20260127_enhance_profiles_step_registration.sql`

### Step 2: No Code Changes Needed!
The registration system is already integrated into your auth flow. When users sign up, they'll automatically see the step-by-step registration.

### Step 3: Test It Out
1. Run your dev server:
   ```bash
   npm run dev
   ```

2. Create a new account
3. You should see the 6-step registration form

### Step 4: Deploy
```bash
# Build for production
npm run build

# Deploy to Cloudflare Pages
# (or use your deployment method)
```

## 📝 What Users Will See

### Flow:
1. Sign Up → Personal Info
2. → Where Are You From?
3. → About Your Work (optional, can skip)
4. → Your Interests (optional, can skip)
5. → Education Level (optional, can skip)
6. → Additional Information (optional, can skip)
7. → Complete & Go to Dashboard

## 🎯 Key Features

✅ **Skip Optional Steps**: Users can skip non-required fields
✅ **Go Back**: Navigate to previous steps
✅ **See Progress**: Visual progress bar shows completion
✅ **Validation**: Real-time validation with helpful errors
✅ **Mobile Friendly**: Works great on all devices
✅ **Auto-Save**: Data saves as users progress
✅ **Resume Later**: Users can update profile anytime

## 🔧 Customization Options

### Change Locations
File: `src/components/auth/StepByStepRegistration.tsx`
Search for: `const LOCATIONS = [`

### Change Interests
File: `src/components/auth/StepByStepRegistration.tsx`
Search for: `const interests = [`

### Modify Questions
File: `src/components/auth/StepByStepRegistration.tsx`
Search for: `const REGISTRATION_STEPS = [`

### Adjust Validation Rules
File: `src/hooks/useStepRegistration.ts`
Methods:
- `validatePhone()`
- `validateIdNumber()`
- `validateEmail()`

## 📊 User Data Storage

All user data is stored in the `profiles` table:

```sql
SELECT * FROM profiles WHERE id = 'user-id';
```

Available fields:
- `full_name` - Full name
- `phone` - Phone number
- `id_number` - ID number
- `location` - Location
- `occupation` - Occupation
- `employment_status` - Employment status
- `interests` - Array of interests
- `education_level` - Education level
- `additional_notes` - User notes
- `is_student` - Is student flag
- `registration_completed_at` - Completion time
- `registration_progress` - Progress percentage

## 🧪 Testing

### Test User Data
```
Name: John Doe
Phone: +254712345678
ID: 12345678
Location: Turuturu
```

### Test Skip Feature
Try clicking "Skip" on optional steps

### Test Back Button
Navigate back and verify data is saved

### Test Mobile
Open dev tools (F12) and toggle device toolbar

## ✅ Deployment Checklist

- [ ] Applied database migration
- [ ] Tested registration on dev
- [ ] Tested on mobile device
- [ ] Verified data saves to Supabase
- [ ] Tested skip functionality
- [ ] Ready for production build
- [ ] Deployed to Cloudflare Pages

## 🆘 Common Issues & Solutions

### Issue: "Cannot find module" errors
**Solution**: Ensure all imports are correct:
```typescript
import StepByStepRegistration from '@/components/auth/StepByStepRegistration';
```

### Issue: Registration form not showing
**Solution**: Check if profile is already complete. Clear auth state and try again.

### Issue: Data not saving to Supabase
**Solution**: 
1. Check Supabase connection
2. Verify RLS policies allow updates
3. Check browser console for errors

### Issue: Validation errors on valid input
**Solution**: Check the validation functions in `useStepRegistration.ts`

## 📖 Documentation Files

Full documentation available in:
- `docs/STEP_BY_STEP_REGISTRATION.md` - Comprehensive guide
- `REGISTRATION_IMPLEMENTATION_SUMMARY.md` - Implementation details
- This file - Quick start guide

## 🎨 Styling & Customization

### Colors
Uses your existing theme:
- Primary color for active steps
- Green for completed steps
- Muted for inactive steps

### Fonts & Typography
Uses existing Shadcn/ui styling

### Dark Mode
Fully supported! Automatically adapts.

## 🔐 Security

✅ Already configured:
- Form validation on client and server
- Secure Supabase RLS policies
- HTTPS only
- User data encryption

## 📞 Support

For help:
1. Check browser console (F12)
2. Review documentation
3. Check Supabase dashboard for errors
4. Verify database migration was applied

## 🎉 You're Ready!

Your step-by-step registration system is production-ready. Users will have a smooth onboarding experience!

---

**Questions?** Check the full documentation in:
- `docs/STEP_BY_STEP_REGISTRATION.md`
- `REGISTRATION_IMPLEMENTATION_SUMMARY.md`
