# Registration System - API Reference

## 📚 Complete API Documentation

---

## Component: StepByStepRegistration

### Location
`src/components/auth/StepByStepRegistration.tsx`

### Props

```typescript
interface StepByStepRegistrationProps {
  user: {
    id: string;
    email?: string;
  };
}
```

**Parameters:**
- `user.id` (string, required): UUID of authenticated user
- `user.email` (string, optional): User's email address

### Usage

```tsx
import StepByStepRegistration from '@/components/auth/StepByStepRegistration';

function RegistrationPage() {
  const currentUser = { 
    id: 'uuid-here', 
    email: 'user@example.com' 
  };
  
  return <StepByStepRegistration user={currentUser} />;
}
```

### Internal State

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

### Features

- **Navigation**: Next, Back, Skip buttons
- **Validation**: Real-time field validation
- **Progress**: Visual progress bar
- **Responsiveness**: Mobile to desktop
- **Accessibility**: Keyboard + screen reader support
- **Dark Mode**: Full dark mode support

### Step Information

```typescript
interface RegistrationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  questions: string[];
}
```

---

## Hook: useStepRegistration

### Location
`src/hooks/useStepRegistration.ts`

### Return Value

```typescript
interface UseStepRegistrationReturn {
  isLoading: boolean;
  error: string | null;
  validationErrors: ValidationError[];
  saveProgress: (options: SaveProgressOptions) => Promise<boolean>;
  validateStep: (stepId: string, data: Partial<RegistrationFormData>) => boolean;
  clearErrors: () => void;
  getErrorForField: (fieldName: string) => string | null;
  validateEmail: (email: string) => boolean;
  validatePhone: (phone: string) => boolean;
  validateIdNumber: (idNumber: string) => boolean;
}
```

### Functions

#### saveProgress()

Saves user registration data to Supabase.

```typescript
const success = await saveProgress({
  userId: 'user-uuid',
  stepCompleted: 'personal-info',
  data: {
    fullName: 'John Doe',
    phone: '+254712345678',
    // ... other fields
  }
});
```

**Parameters:**
```typescript
interface SaveProgressOptions {
  userId: string;
  stepCompleted: string;
  data: Partial<RegistrationFormData>;
}
```

**Returns:**
- `true` if successful
- `false` if failed

**Throws:**
- Supabase connection errors
- RLS policy violations

#### validateStep()

Validates all fields for a given step.

```typescript
const isValid = validateStep('personal-info', {
  fullName: 'John Doe',
  phone: '+254712345678',
  idNumber: '12345678'
});
```

**Parameters:**
- `stepId` (string): ID of step to validate
- `data` (Partial<RegistrationFormData>): Fields to validate

**Returns:**
- `true` if all validations pass
- `false` if any validation fails

**Sets:**
- `validationErrors` state with detailed errors

#### validatePhone()

Validates Kenyan phone numbers.

```typescript
const isValid = validatePhone('+254712345678');
```

**Formats Accepted:**
- `+254XXXXXXXXX` (international)
- `0XXXXXXXXX` (local)
- `+254 7 1234 5678` (with spaces)

**Returns:**
- `true` if valid Kenyan phone
- `false` otherwise

#### validateEmail()

Validates email format.

```typescript
const isValid = validateEmail('user@example.com');
```

**Format:**
- Standard email format

**Returns:**
- `true` if valid email
- `false` otherwise

#### validateIdNumber()

Validates ID number format.

```typescript
const isValid = validateIdNumber('12345678');
```

**Constraints:**
- Length: 6-8 characters
- Must be numeric

**Returns:**
- `true` if valid ID
- `false` otherwise

#### clearErrors()

Clears all validation errors.

```typescript
clearErrors();
```

#### getErrorForField()

Gets validation error for specific field.

```typescript
const error = getErrorForField('phone');
```

**Returns:**
- Error message string if error exists
- `null` if no error

### Usage Example

```tsx
import { useStepRegistration } from '@/hooks/useStepRegistration';

function MyComponent() {
  const {
    isLoading,
    error,
    validationErrors,
    saveProgress,
    validateStep,
    validatePhone
  } = useStepRegistration();

  const handleNext = async () => {
    if (validateStep('personal-info', formData)) {
      await saveProgress({
        userId: userId,
        stepCompleted: 'personal-info',
        data: formData
      });
    }
  };

  return (
    <div>
      {error && <p>{error}</p>}
      {validationErrors.map(err => (
        <p key={err.field}>{err.message}</p>
      ))}
      <button onClick={handleNext} disabled={isLoading}>
        Next
      </button>
    </div>
  );
}
```

---

## Database Schema

### profiles Table

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS:
  - employment_status TEXT
  - interests TEXT[]
  - education_level TEXT
  - additional_notes TEXT
  - registration_completed_at TIMESTAMP
  - registration_progress INTEGER
```

### Type Definition

```typescript
interface Profile {
  id: UUID;
  full_name: string;
  phone: string;
  id_number: string;
  email?: string;
  location?: string;
  occupation?: string;
  employment_status?: string;
  interests?: string[];
  education_level?: string;
  additional_notes?: string;
  is_student?: boolean;
  photo_url?: string;
  membership_number?: string;
  status?: 'active' | 'dormant' | 'pending' | 'suspended';
  registration_fee_paid?: boolean;
  registration_completed_at?: timestamp;
  registration_progress?: number;
  joined_at: timestamp;
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Queries

#### Get User Profile
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

#### Update Profile
```typescript
const { error } = await supabase
  .from('profiles')
  .update({
    full_name: 'John Doe',
    phone: '+254712345678',
    // ... other fields
  })
  .eq('id', userId);
```

#### List All Profiles
```typescript
const { data: profiles } = await supabase
  .from('profiles')
  .select('*');
```

#### Filter by Status
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('status', 'pending');
```

#### Filter by Education
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('education_level', 'bachelors');
```

#### Filter by Interests
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .contains('interests', ['Technology', 'Education']);
```

---

## Validation Rules

### Personal Information Step

```typescript
{
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: 'text with spaces allowed'
  },
  phone: {
    required: true,
    pattern: '+254XXXXXXXXX or 0XXXXXXXXX',
    minLength: 10,
    maxLength: 13
  },
  idNumber: {
    required: true,
    minLength: 6,
    maxLength: 8,
    pattern: 'numeric only'
  }
}
```

### Location Step

```typescript
{
  location: {
    required: true,
    pattern: 'predefined list or custom'
  },
  otherLocation: {
    required: 'if location === "Other"',
    minLength: 2,
    maxLength: 50
  }
}
```

### Optional Steps

```typescript
{
  occupation: { required: false },
  employmentStatus: { required: false },
  interests: { required: false },
  educationLevel: { required: false },
  additionalNotes: { required: false },
  isStudent: { required: false }
}
```

---

## Constants

### Locations

```typescript
const LOCATIONS = [
  'Turuturu',
  'Gatune',
  'Mutoho',
  'Githeru',
  'Kahariro',
  'Kiangige',
  'Daboo',
  'Githima',
  'Nguku',
  'Ngaru',
  'Kiugu',
  'Kairi',
  'Other'
];
```

### Interests

```typescript
const INTERESTS = [
  'Education',
  'Healthcare',
  'Agriculture',
  'Business',
  'Technology',
  'Sports',
  'Arts & Culture',
  'Environment',
  'Community Development'
];
```

### Employment Status

```typescript
const EMPLOYMENT_STATUS = [
  'Employed',
  'Self-employed',
  'Unemployed',
  'Student',
  'Retired'
];
```

### Education Levels

```typescript
const EDUCATION_LEVELS = [
  'Primary School',
  'Secondary School',
  'Certificate',
  'Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD'
];
```

### Registration Steps

```typescript
const REGISTRATION_STEPS = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Let\'s start with your basic information',
    icon: <User className="w-5 h-5" />,
    required: true,
    questions: ['Full Name', 'ID Number', 'Phone Number']
  },
  // ... other steps
];
```

---

## Error Handling

### ValidationError

```typescript
interface ValidationError {
  field: string;
  message: string;
}
```

### Common Errors

```typescript
// Empty field
{ field: 'fullName', message: 'Full name is required' }

// Invalid phone
{ field: 'phone', message: 'Please enter a valid phone number' }

// Invalid ID
{ field: 'idNumber', message: 'Please enter a valid ID number' }

// Location not selected
{ field: 'location', message: 'Please select a location' }

// Custom location required
{ field: 'otherLocation', message: 'Please specify your location' }
```

### Error Handling in Component

```tsx
if (errors[field]) {
  return (
    <p className="text-xs text-red-500 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      {errors[field]}
    </p>
  );
}
```

---

## Events & Callbacks

### Form Events

```typescript
// When user types
handleChange(fieldName: string, value: string | string[] | boolean)

// When user clicks Next
handleNext()

// When user clicks Back
handlePrevious()

// When user skips optional step
handleSkipStep()

// When user completes registration
handleSubmit()

// When form is submitted
form.onSubmit(handleSubmit)
```

### Supabase Events

```typescript
// On successful save
toast({
  title: 'Success',
  description: 'Profile saved'
})

// On error
toast({
  title: 'Error',
  description: 'Failed to save',
  variant: 'destructive'
})
```

---

## Styling & Customization

### CSS Classes Used

- `min-h-screen` - Full height
- `bg-gradient-to-br` - Background gradient
- `rounded-lg` - Border radius
- `border-2` - Borders
- `text-primary` - Primary color
- `text-red-500` - Error color
- `text-green-500` - Success color
- `animate-spin` - Loading spinner
- `dark:` - Dark mode prefix

### Theme Integration

```typescript
// Primary color
<Button className="bg-primary text-primary-foreground">

// Muted background
<div className="bg-muted">

// Foreground text
<p className="text-foreground">

// Dark mode
<div className="dark:bg-slate-900">
```

---

## Performance

### Optimization Techniques

- **Lazy Loading**: Components load on demand
- **Memoization**: Prevent unnecessary re-renders
- **Debouncing**: Validate after user stops typing
- **Efficient State**: Only store necessary data
- **Indexed Queries**: Database optimization

### Load Time Targets

- Page load: < 2 seconds
- Form interaction: Instant
- Save operation: 3-5 seconds
- Navigation: < 200ms

---

## Testing

### Unit Test Example

```typescript
describe('useStepRegistration', () => {
  it('should validate phone number', () => {
    const { validatePhone } = useStepRegistration();
    
    expect(validatePhone('+254712345678')).toBe(true);
    expect(validatePhone('123')).toBe(false);
  });
});
```

### Component Test Example

```typescript
describe('StepByStepRegistration', () => {
  it('should show next button on first step', () => {
    render(<StepByStepRegistration user={mockUser} />);
    
    expect(screen.getByText(/Next/)).toBeInTheDocument();
  });
});
```

---

## Browser Compatibility

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Mobile browsers (iOS Safari, Chrome Android)

---

## Accessibility

### WCAG 2.1 Compliance

- Level A: ✅ Full compliance
- Level AA: ✅ Full compliance
- Level AAA: ✅ Partial (color contrast)

### Features

- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ Focus visible
- ✅ Screen reader support
- ✅ Color + text indicators
- ✅ Form labels associated

---

## Security

### Data Protection

- ✅ Encrypted in transit (HTTPS)
- ✅ Encrypted in Supabase
- ✅ RLS policies enforced
- ✅ User can only modify own data
- ✅ Input validation
- ✅ SQL injection prevention

### Best Practices

```typescript
// ✅ Good - Use prepared statements
await supabase
  .from('profiles')
  .update(data)
  .eq('id', userId)

// ✗ Bad - String concatenation
// Avoid building queries with strings
```

---

## Rate Limiting

### Supabase Limits

- Save calls: 1 per step
- Query calls: Limited by plan
- Auth calls: Standard rate limits

### Recommended Practices

- Debounce API calls
- Batch updates when possible
- Cache data locally
- Implement retry logic

---

## Maintenance

### Database Maintenance

```sql
-- Analyze query performance
ANALYZE profiles;

-- Vacuum for performance
VACUUM ANALYZE profiles;
```

### Monitoring

- Track registration completion rates
- Monitor error rates
- Check average completion time
- Analyze step dropout rates

---

## Deployment

### Requirements

- Node.js 16+
- npm/yarn
- Supabase account
- Cloudflare Pages (or similar)

### Environment Variables

```env
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-key
VITE_API_URL=your-api-url
```

### Build & Deploy

```bash
npm run build
# Deploy dist/ folder to Cloudflare Pages
```

---

*API Reference v1.0 - January 27, 2026*
