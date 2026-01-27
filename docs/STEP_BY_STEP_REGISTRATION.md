# Step-by-Step Registration System

## Overview

A modern, interactive, and user-friendly registration flow that guides users through profile setup step by step with the ability to skip optional fields.

## Features

### ✨ User Experience
- **Progressive Disclosure**: Users see one step at a time, reducing cognitive load
- **Visual Progress**: Progress bar and step indicators show completion status
- **Optional Fields**: Users can skip non-required steps and complete them later
- **Validation**: Real-time validation with helpful error messages
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Smooth Navigation**: Clear back/next buttons and visual step indicators

### 🎯 Registration Steps

#### 1. **Personal Information** (Required)
   - Full Name
   - ID Number
   - Phone Number
   
   **Purpose**: Captures essential identification and contact information

#### 2. **Location** (Required)
   - Select from predefined locations
   - Custom location option
   
   **Purpose**: Helps organize community members by area

#### 3. **Occupation** (Optional)
   - Occupation field
   - Employment Status (Employed, Self-employed, Unemployed, Student, Retired)
   - Student checkbox
   
   **Purpose**: Understands professional background and student status

#### 4. **Interests** (Optional)
   - Multiple selection: Education, Healthcare, Agriculture, Business, Technology, Sports, Arts & Culture, Environment, Community Development
   
   **Purpose**: Identifies areas of community interest

#### 5. **Education Level** (Optional)
   - Dropdown: Primary, Secondary, Certificate, Diploma, Bachelor's, Master's, PhD
   
   **Purpose**: Tracks education background

#### 6. **Additional Information** (Optional)
   - Free-text notes field
   
   **Purpose**: Captures any other relevant information users want to share

## Components

### Main Component
**File**: `src/components/auth/StepByStepRegistration.tsx`

The main registration component that manages:
- Step navigation and state
- Form data handling
- Validation logic
- Supabase integration
- UI rendering

### Props
```typescript
interface StepByStepRegistrationProps {
  user: {
    id: string;
    email?: string;
  };
}
```

### Form Data Structure
```typescript
interface FormData {
  fullName: string;
  idNumber: string;
  phone: string;
  location: string;
  otherLocation: string;
  occupation: string;
  employmentStatus: string;
  interests: string[];
  educationLevel: string;
  additionalNotes: string;
  isStudent: boolean;
}
```

## Custom Hook

### `useStepRegistration`
**File**: `src/hooks/useStepRegistration.ts`

Provides utility functions for registration:

#### Functions
- `saveProgress()`: Saves user data to Supabase
- `validateStep()`: Validates current step data
- `validateEmail()`: Email validation
- `validatePhone()`: Phone number validation (Kenyan format)
- `validateIdNumber()`: ID number validation
- `clearErrors()`: Clears validation errors
- `getErrorForField()`: Gets error for specific field

#### Usage
```typescript
const {
  isLoading,
  error,
  validationErrors,
  saveProgress,
  validateStep,
  getErrorForField,
} = useStepRegistration();
```

## Supabase Schema

### New Migration
**File**: `supabase/migrations/20260127_enhance_profiles_step_registration.sql`

Adds the following columns to `profiles` table:
- `employment_status`: VARCHAR (employed, self-employed, unemployed, student, retired)
- `interests`: TEXT[] (array of user interests)
- `education_level`: VARCHAR (education level)
- `additional_notes`: TEXT (user notes)
- `registration_completed_at`: TIMESTAMP (when registration finished)
- `registration_progress`: INTEGER (0-100 progress percentage)

### Indexes Added
- `idx_profiles_registration_completed`: For sorting by completion date
- `idx_profiles_employment_status`: For filtering by employment
- `idx_profiles_education_level`: For filtering by education

## Integration

### AuthFlow Update
The `AuthFlow.tsx` component has been updated to use:
- Old: `PostAuthDetailsForm`
- New: `StepByStepRegistration`

The registration is triggered when:
1. User signs up/signs in
2. Profile exists but incomplete (missing required fields)
3. AuthFlow detects `details-required` state

## Validation Rules

### Personal Information
- **Full Name**: Minimum 2 characters
- **Phone**: Kenyan format (+254XXXXXXXXX or 0XXXXXXXXX)
- **ID Number**: 6-8 characters

### Location
- Must select from list or provide custom location
- Required field

### Optional Steps
- Can be skipped entirely
- Data is optional but validates if provided

## Data Flow

```
User Registration → AuthFlow → StepByStepRegistration
                        ↓
                  Check Profile
                        ↓
              Complete? → Dashboard
              Incomplete? → Step Registration
                        ↓
              User completes steps
                        ↓
            Save to Supabase (upsert)
                        ↓
                    Dashboard
```

## Usage Example

### In Auth Flow
```tsx
<StepByStepRegistration
  user={{ id: userId, email: userEmail }}
/>
```

### In Custom Code
```tsx
import StepByStepRegistration from '@/components/auth/StepByStepRegistration';

function MyRegistrationPage() {
  return (
    <StepByStepRegistration
      user={{
        id: 'user-uuid',
        email: 'user@example.com'
      }}
    />
  );
}
```

## Features in Detail

### Progressive Disclosure
Users focus on one question at a time, making the registration process less overwhelming.

### Smart Validation
- Real-time error detection
- Clear, actionable error messages
- Validation only on submit for current step

### Skip Functionality
- Optional steps can be skipped
- Users can come back to complete profile later
- "You can update anytime" messaging

### Visual Feedback
- Progress bar updates with each step
- Step indicators show completed steps in green
- Current step highlighted in primary color
- Icons for each step make it visually distinct

### Mobile Responsive
- Full-screen on mobile
- Step indicators collapse on smaller screens
- Touch-friendly buttons and inputs

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Clear error messages
- Focus management

## Configuration

### Location List
Edit in `StepByStepRegistration.tsx`:
```typescript
const LOCATIONS = [
  'Turuturu',
  'Gatune',
  // ... more locations
];
```

### Interest Options
Edit the interests array in the Interests step section

### Education Levels
Modify the Select component options

## Future Enhancements

1. **Profile Picture Upload**: Add photo upload during registration
2. **Email Verification**: Send verification code
3. **Phone Verification**: OTP verification for phone
4. **Social Media Links**: Optional social profile fields
5. **Bank Details**: For payment processing
6. **Document Upload**: ID photo or other documents
7. **Terms & Conditions**: Checkbox for T&C acceptance
8. **Auto-save**: Save progress automatically as user moves between steps
9. **Analytics**: Track completion rates per step
10. **Conditional Logic**: Show fields based on previous answers

## Troubleshooting

### Profile Not Saving
- Check Supabase connection
- Verify RLS policies allow upsert on profiles table
- Check browser console for errors

### Steps Not Showing
- Ensure all UI components are imported correctly
- Check that Supabase schema migration was applied
- Verify user authentication state

### Validation Not Working
- Check `useStepRegistration` hook implementation
- Verify regex patterns match expected formats
- Check browser console for validation errors

## Database Migration

To apply the schema changes:

1. Navigate to Supabase dashboard
2. Go to SQL Editor
3. Run the migration file:
   ```sql
   -- Content from: supabase/migrations/20260127_enhance_profiles_step_registration.sql
   ```

Or use Supabase CLI:
```bash
supabase db push
```

## Testing

### Manual Testing Checklist
- [ ] Navigate through all 6 steps
- [ ] Verify required field validation
- [ ] Test skip functionality on optional steps
- [ ] Check data saves to Supabase
- [ ] Verify back button works
- [ ] Test on mobile device
- [ ] Test with invalid phone/ID formats
- [ ] Verify progress bar updates correctly
- [ ] Check error messages display properly
- [ ] Confirm redirect to dashboard after completion

### Test Data
```
Name: John Doe
ID: 12345678
Phone: +254712345678
Location: Turuturu
Occupation: Software Engineer
Employment: Employed
Education: Bachelor's Degree
```

## Performance Considerations

- **Lazy Loading**: Components load only when needed
- **Memoization**: Steps are stable and don't re-render unnecessarily
- **Debouncing**: Validation runs after user finishes typing
- **Efficient Storage**: Only saves modified fields to database

## Security

- All data validated on client and server side
- No sensitive data in local state longer than necessary
- HTTPS enforced for all API calls
- RLS policies protect profile data
- User can only modify their own profile

## Support & Maintenance

For issues or improvements:
1. Check console logs for errors
2. Verify Supabase schema is up to date
3. Ensure all UI components are properly imported
4. Check authentication state is correct
