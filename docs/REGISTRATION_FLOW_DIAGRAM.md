# Registration Flow & Architecture

## 🔄 User Journey Map

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                     │
└─────────────────────────────────────────────────────────────┘

START
  │
  ├─► Sign In/Sign Up
  │
  ├─► AuthFlow Component
  │    └─► Check Auth State
  │
  ├─► Is User Authenticated?
  │
  ├─► YES: Check Profile Completion
  │   │
  │   ├─► Profile Complete?
  │   │   │
  │   │   ├─► YES: Redirect to Dashboard ✓
  │   │   │
  │   │   └─► NO: Show StepByStepRegistration
  │   │
  │   └─► Profile Incomplete State
  │
  └─► NO: Show Auth Page (Login/Signup)

┌─────────────────────────────────────────────────────────────┐
│           STEPBYSTEPRREGISTRATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

Step 1: Personal Information ⭐ REQUIRED
  │
  ├─► Input: Full Name
  ├─► Input: ID Number
  ├─► Input: Phone Number
  │
  ├─► Validate
  │   ├─► Name required?
  │   ├─► Phone valid format?
  │   └─► ID valid length?
  │
  └─► Next Step

Step 2: Location ⭐ REQUIRED
  │
  ├─► Select: Location
  ├─► Condition: If "Other" selected
  │   └─► Input: Custom location
  │
  ├─► Validate
  │   ├─► Location selected?
  │   └─► Custom location filled if "Other"?
  │
  └─► Next Step

Step 3: Occupation (OPTIONAL - can skip)
  │
  ├─► Input: Occupation
  ├─► Select: Employment Status
  ├─► Checkbox: Is Student?
  │
  └─► Next/Skip Step

Step 4: Interests (OPTIONAL - can skip)
  │
  ├─► Multi-Select: Interests
  │   ├─► Education
  │   ├─► Healthcare
  │   ├─► Agriculture
  │   ├─► Business
  │   ├─► Technology
  │   ├─► Sports
  │   ├─► Arts & Culture
  │   ├─► Environment
  │   └─► Community Development
  │
  └─► Next/Skip Step

Step 5: Education Level (OPTIONAL - can skip)
  │
  ├─► Select: Education Level
  │   ├─► Primary School
  │   ├─► Secondary School
  │   ├─► Certificate
  │   ├─► Diploma
  │   ├─► Bachelor's Degree
  │   ├─► Master's Degree
  │   └─► PhD
  │
  └─► Next/Skip Step

Step 6: Additional Information (OPTIONAL - can skip)
  │
  ├─► Textarea: Additional Notes
  │
  └─► Submit/Complete

┌─────────────────────────────────────────────────────────────┐
│              DATA VALIDATION & SAVING FLOW                    │
└─────────────────────────────────────────────────────────────┘

User Input
  │
  ├─► Validate Current Step
  │   │
  │   ├─► If Required Step
  │   │   └─► All validations pass?
  │   │       ├─► YES: Enable Next
  │   │       └─► NO: Show errors
  │   │
  │   └─► If Optional Step
  │       └─► Can skip or fill
  │
  ├─► On Next: Save to Supabase
  │   │
  │   ├─► Prepare Data
  │   ├─► Call Supabase upsert
  │   ├─► Update local state
  │   └─► Confirm save
  │
  └─► Move to Next Step

On Complete:
  │
  ├─► Validate final step
  ├─► Save all data to Supabase
  │   └─► profiles table
  │       ├─► id (user UUID)
  │       ├─► full_name
  │       ├─► phone
  │       ├─► id_number
  │       ├─► location
  │       ├─► occupation
  │       ├─► employment_status
  │       ├─► interests (array)
  │       ├─► education_level
  │       ├─► additional_notes
  │       ├─► is_student
  │       └─► registration_completed_at
  │
  ├─► Show Success Message
  ├─► Delay 1.5 seconds
  └─► Redirect to Dashboard

┌─────────────────────────────────────────────────────────────┐
│               COMPONENT ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────┘

App.tsx
  │
  └─► Router
      │
      └─► AuthFlow.tsx
          │
          ├─► Checks Auth State
          ├─► Checks Profile Completion
          │
          ├─► Is Authenticated & Incomplete?
          │   │
          │   └─► YES: Render
          │       │
          │       └─► StepByStepRegistration.tsx
          │           │
          │           ├─► State Management
          │           │   ├─► currentStep
          │           │   ├─► formData
          │           │   ├─► errors
          │           │   └─► isLoading
          │           │
          │           ├─► Hooks
          │           │   └─► useStepRegistration()
          │           │       ├─► saveProgress()
          │           │       ├─► validateStep()
          │           │       └─► Validators
          │           │
          │           ├─► UI Components (Shadcn)
          │           │   ├─► Card
          │           │   ├─► Button
          │           │   ├─► Input
          │           │   ├─► Select
          │           │   ├─► Textarea
          │           │   ├─► Checkbox
          │           │   ├─► Progress
          │           │   ├─► Label
          │           │   └─► Icons (Lucide)
          │           │
          │           └─► Supabase Integration
          │               ├─► Read profiles
          │               ├─► Upsert profiles
          │               └─► Error handling
          │
          └─► Is Authenticated & Complete?
              │
              └─► YES: Redirect to Dashboard

┌─────────────────────────────────────────────────────────────┐
│              DATA FLOW (REDUX-STYLE)                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│  User Input  │
│ (e.g., name) │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ handleChange()       │ ◄─── Updates React State
│ Updates formData     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Real-time display    │
│ Input field updates  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ User clicks Next     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ validateStep()       │
│ Check current step   │
└──────┬───────────────┘
       │
       ├─► Errors Found?
       │   └─► YES: showErrorMessages()
       │
       └─► NO: Proceed
           │
           ▼
       ┌──────────────────────┐
       │ setCurrentStep(+1)    │ ◄─── Move to next step
       └──────┬───────────────┘
              │
              ▼
          ┌──────────────────────┐
          │ Save to Supabase     │
          │ (upsert)             │
          └──────┬───────────────┘
                 │
                 ▼
          ┌──────────────────────┐
          │ Update complete!     │
          │ Show next step       │
          └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           VALIDATION RULES REFERENCE                         │
└─────────────────────────────────────────────────────────────┘

Full Name:
  └─► Required
  └─► Min 2 characters

Phone Number:
  └─► Required
  └─► Format: +254XXXXXXXXX or 0XXXXXXXXX
  └─► Length: 10-13 characters

ID Number:
  └─► Required
  └─► Length: 6-8 characters

Location:
  └─► Required
  └─► Must select from list or specify

Custom Location (if Other selected):
  └─► Required if Location = "Other"
  └─► Min 2 characters

Occupation: (Optional)
  └─► No validation if empty

Employment Status: (Optional)
  └─► No validation if empty

Education Level: (Optional)
  └─► No validation if empty

Interests: (Optional)
  └─► No validation if empty

Additional Notes: (Optional)
  └─► No validation if empty

┌─────────────────────────────────────────────────────────────┐
│          STATE MANAGEMENT SUMMARY                            │
└─────────────────────────────────────────────────────────────┘

Component State:
  ├─► currentStep (number) - Current step index (0-5)
  ├─► isLoading (boolean) - Loading state on page load
  ├─► isSaving (boolean) - Saving to Supabase
  ├─► formData (object) - All form inputs
  │   ├─► fullName
  │   ├─► idNumber
  │   ├─► phone
  │   ├─► location
  │   ├─► otherLocation
  │   ├─► occupation
  │   ├─► employmentStatus
  │   ├─► interests []
  │   ├─► educationLevel
  │   ├─► additionalNotes
  │   └─► isStudent
  │
  ├─► errors (object) - Validation errors
  │   └─► { fieldName: "error message" }
  │
  └─► skippedSteps (Set<string>) - Tracked skipped steps

┌─────────────────────────────────────────────────────────────┐
│            DATABASE SCHEMA OVERVIEW                          │
└─────────────────────────────────────────────────────────────┘

profiles table:
├─► id (UUID) - PRIMARY KEY
├─► full_name (TEXT)
├─► phone (TEXT)
├─► id_number (TEXT)
├─► location (TEXT)
├─► occupation (TEXT) - NEW
├─► employment_status (TEXT) - NEW
├─► interests (TEXT[]) - NEW (Array)
├─► education_level (TEXT) - NEW
├─► additional_notes (TEXT) - NEW
├─► is_student (BOOLEAN) - NEW
├─► email (TEXT)
├─► photo_url (TEXT)
├─► status (member_status)
├─► membership_number (TEXT)
├─► registration_fee_paid (BOOLEAN)
├─► joined_at (TIMESTAMP)
├─► created_at (TIMESTAMP)
├─► updated_at (TIMESTAMP)
├─► registration_completed_at (TIMESTAMP) - NEW
└─► registration_progress (INTEGER) - NEW

Indexes:
├─► idx_profiles_registration_completed
├─► idx_profiles_employment_status
└─► idx_profiles_education_level

┌─────────────────────────────────────────────────────────────┐
│              ERROR HANDLING FLOW                             │
└─────────────────────────────────────────────────────────────┘

Error Detected
  │
  ├─► Validation Error
  │   ├─► Show error message below field
  │   ├─► Highlight field with red border
  │   ├─► Toast notification
  │   └─► Disable Next button
  │
  ├─► Supabase Connection Error
  │   ├─► Show error toast
  │   ├─► Log to console
  │   ├─► Allow user to retry
  │   └─► Save locally (optional)
  │
  ├─► Network Error
  │   ├─► Show connection error
  │   ├─► Suggest retry
  │   └─► Check connection status
  │
  └─► Unknown Error
      ├─► Log full error
      ├─► Show generic message
      └─► Allow user to contact support

┌─────────────────────────────────────────────────────────────┐
│          NEXT BUTTON STATE LOGIC                            │
└─────────────────────────────────────────────────────────────┘

Next Button is:
├─► DISABLED if:
│   ├─► Required fields are empty
│   ├─► Validation failed
│   ├─► Currently saving
│   └─► Loading state
│
├─► ENABLED if:
│   ├─► All required fields valid
│   ├─► (Optional fields don't need to be filled)
│   └─► Not in loading state
│
└─► Shows:
    ├─► "Next →" on steps 1-5
    └─► "Complete Registration ✓" on step 6

┌─────────────────────────────────────────────────────────────┐
│           SKIP BUTTON AVAILABILITY                          │
└─────────────────────────────────────────────────────────────┘

Skip Button is:
├─► VISIBLE on:
│   └─► Optional steps (3-6)
│
└─► HIDDEN on:
    └─► Required steps (1-2)

When clicked:
├─► Mark step as skipped
├─► Move to next step
├─► Show "You can fill this in later" toast
└─► Do NOT save partial data

---

This architecture provides a smooth, intuitive registration experience!
