# 🎨 Cloudflare Turnstile - Visual Implementation Guide

## 📊 User Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│                 REGISTRATION STEP 1                      │
│            Personal Information (Required)               │
│                                                          │
│  Let's start with your basic information               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  FORM FIELDS                                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Full Name *                                             │
│  [________________________]                              │
│                                                          │
│  ID Number *              │ Phone Number *              │
│  [_____________]          │ [_________________]         │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  🛡️ SECURITY VERIFICATION *                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│              ┌─────────────────────────┐                │
│              │ I'm not a robot         │                │
│              │ Cloudflare             │                │
│              │ [checkbox] ☑️           │                │
│              │ Privacy - Terms         │                │
│              └─────────────────────────┘                │
│                                                          │
│  ✅ Security verification completed                      │
│                                                          │
│  This helps us keep your account secure                 │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [< Back]  [Skip]  [Next >]                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 State Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  USER JOURNEY                            │
└─────────────────────────────────────────────────────────┘

1. PAGE LOAD
   ├─ Check authentication
   ├─ Load StepByStepRegistration
   └─ Render Step 1
      ↓

2. STEP 1 ACTIVE (currentStep === 0)
   ├─ useEffect triggered
   ├─ renderCaptcha('turnstile-container') called
   ├─ Turnstile script loads from CDN
   ├─ Widget renders in container
   └─ User sees checkbox
      ↓

3. USER INTERACTION
   ├─ User fills form fields
   │  ├─ Full Name
   │  ├─ ID Number
   │  └─ Phone Number
   │
   └─ User completes Turnstile
      ├─ Clicks checkbox
      ├─ Completes challenge (if needed)
      ├─ Token obtained from Cloudflare
      ├─ Hook callback triggered
      └─ turnstileToken stored in state
         ↓

4. USER CLICKS NEXT
   ├─ validateStep('personal-info') called
   ├─ Checks:
   │  ├─ fullName not empty ✓
   │  ├─ phone valid ✓
   │  ├─ idNumber not empty ✓
   │  └─ turnstileToken exists? ← KEY CHECK
   │
   ├─ IF ALL CHECKS PASS:
   │  ├─ setCurrentStep(1)
   │  └─ Proceed to Step 2
   │
   └─ IF TURNSTILE MISSING:
      ├─ setErrors({turnstile: '...'})
      ├─ Show toast: "Validation Error"
      └─ Stay on Step 1
         ↓

5. MOVING TO STEP 2 (currentStep !== 0)
   ├─ useEffect triggered again
   ├─ removeCaptcha() called
   └─ Widget cleaned up
      ↓

6. PROGRESSION CONTINUES
   └─ Steps 2-6 continue normally
      (No Turnstile on other steps)
```

---

## 🎭 UI States

### State 1: Initial Load
```
🛡️ Security Verification *
┌──────────────────────────────────┐
│  [Loading widget...]             │
│  ⌛ Please wait...                │
└──────────────────────────────────┘
This helps us keep your account secure
```

### State 2: Widget Ready
```
🛡️ Security Verification *
┌──────────────────────────────────┐
│                                  │
│   I'm not a robot               │
│   Cloudflare                    │
│   ☐ [checkbox]                   │
│                                  │
│   Privacy - Terms               │
│                                  │
└──────────────────────────────────┘
This helps us keep your account secure
```

### State 3: Completed (Success)
```
🛡️ Security Verification *
┌──────────────────────────────────┐
│                                  │
│   I'm not a robot               │
│   Cloudflare                    │
│   ☑️ [checked!]                   │
│                                  │
│   Privacy - Terms               │
│                                  │
└──────────────────────────────────┘
✅ Security verification completed
This helps us keep your account secure
```

### State 4: Error
```
🛡️ Security Verification *
┌──────────────────────────────────┐
│  [Error loading widget]          │
└──────────────────────────────────┘
⚠️ Captcha error. Please try again.
This helps us keep your account secure
```

### State 5: Missing (Validation Error)
```
🛡️ Security Verification *
┌──────────────────────────────────┐
│  [Empty - not verified]          │
└──────────────────────────────────┘
⚠️ Please complete the security verification
This helps us keep your account secure
```

---

## 🔗 Component Integration

```typescript
// IMPORT HOOK
import { useTurnstile } from '@/hooks/useTurnstile';

// GET HOOK VALUES
const {
  token: turnstileToken,           ← Token from widget
  error: turnstileError,           ← Error message
  renderCaptcha,                   ← Render function
  reset: resetCaptcha,             ← Reset function
  remove: removeCaptcha,           ← Remove function
} = useTurnstile();

// LIFECYCLE MANAGEMENT
useEffect(() => {
  if (currentStep === 0) {
    renderCaptcha('turnstile-container');
  } else {
    removeCaptcha();
  }
}, [currentStep, renderCaptcha, removeCaptcha]);

// VALIDATION
const validateStep = (stepId) => {
  if (stepId === 'personal-info') {
    if (!turnstileToken) {
      newErrors.turnstile = 'Please complete...';
    }
  }
};

// UI RENDERING
{currentStepData.id === 'personal-info' && (
  <div>
    <div id="turnstile-container" />
    {turnstileError && <ErrorMessage>{turnstileError}</ErrorMessage>}
    {turnstileToken && <SuccessMessage>Verified</SuccessMessage>}
  </div>
)}
```

---

## 🌓 Dark Mode Support

### Light Mode
```
┌──────────────────────────────┐
│ 🛡️ Security Verification    │  ← Icon in primary color
│                              │
│   [Cloudflare Widget]        │  ← Light background
│                              │
│ ✅ Security verification...  │  ← Green checkmark
│                              │
│ This helps us keep...        │  ← Gray text
└──────────────────────────────┘
```

### Dark Mode
```
┌──────────────────────────────┐
│ 🛡️ Security Verification    │  ← Icon in primary color
│                              │
│   [Cloudflare Widget]        │  ← Dark background
│                              │
│ ✅ Security verification...  │  ← Light green checkmark
│                              │
│ This helps us keep...        │  ← Light gray text
└──────────────────────────────┘
```

---

## 📱 Mobile Responsive

```
DESKTOP (>768px)          TABLET (640-768px)     MOBILE (<640px)
┌───────────────────┐    ┌──────────────────┐   ┌─────────────┐
│                   │    │                  │   │             │
│  Full Name        │    │   Full Name      │   │ Full Name   │
│  [____________]   │    │   [___________]  │   │ [_________] │
│                   │    │                  │   │             │
│  ID # │ Phone #   │    │   ID Number      │   │ ID Number   │
│  [__] │ [_______] │    │   [___________]  │   │ [_________] │
│                   │    │                  │   │             │
│                   │    │   Phone Number   │   │ Phone #     │
│ 🛡️ Security      │    │   [___________]  │   │ [_________] │
│ ┌───────────────┐ │    │                  │   │             │
│ │   [Widget]    │ │    │ 🛡️ Security     │   │ 🛡️Security │
│ └───────────────┘ │    │ ┌────────────┐  │   │┌──────────┐  │
│                   │    │ │ [Widget]   │  │   ││[Widget] │  │
│                   │    │ └────────────┘  │   │└──────────┘  │
│ [Back] [Next]     │    │                  │   │             │
│                   │    │ [Back] [Next]    │   │[B] [Skip][N]│
└───────────────────┘    └──────────────────┘   └─────────────┘
```

---

## 🔀 Error Handling Flow

```
renderCaptcha('container')
        ↓
    ┌───────────────┐
    │ Is VITE_KEY   │
    │ configured?   │
    └───────┬───────┘
            ↓
       NO → Throw error
            │
            └→ "Site key not configured"

        YES ↓
    ┌───────────────┐
    │ Wait for      │
    │ Turnstile API │
    └───────┬───────┘
            ↓
       FAIL → Throw error
            │
            └→ "Turnstile script failed to load"

       SUCCESS ↓
    ┌───────────────┐
    │ Render widget │
    │ in container  │
    └───────┬───────┘
            ↓
       SUCCESS → token stored in state
            │
            └→ UI shows ✅

       ERROR → error stored in state
            │
            └→ UI shows ⚠️ message
```

---

## 📊 Data Flow

```
TURNSTILE HOOK STATE:
┌────────────────────────────────┐
│ token: string | null           │  ← Current captcha token
│ isLoading: boolean             │  ← Widget loading state
│ error: string | null           │  ← Error message
│ widgetIdRef: current widget ID │  ← Internal reference
│ containerIdRef: container ID   │  ← Internal reference
│ isScriptLoadedRef: loaded?     │  ← Internal flag
└────────────────────────────────┘
         ↓ (passed to component)
┌────────────────────────────────┐
│ turnstileToken                 │  ← Used in validation
│ turnstileError                 │  ← Displayed in UI
│ renderCaptcha()                │  ← Called in useEffect
│ removeCaptcha()                │  ← Called in useEffect
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ validateStep() checks token    │  ← Validation logic
│ if (!turnstileToken)           │
│   newErrors.turnstile = '...'  │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ UI renders:                    │
│ • Error message (if error)     │  ← Red background
│ • Success message (if token)   │  ← Green background
│ • Widget (in container)        │  ← Centered
└────────────────────────────────┘
```

---

## 🎯 Validation Logic Flowchart

```
USER CLICKS "NEXT" BUTTON
        ↓
validateStep('personal-info')
        ↓
    ┌─────────────────────────┐
    │ Check:                  │
    ├─────────────────────────┤
    │ ✓ Full Name not empty   │─→ NO → Add error
    │ ✓ Phone valid (10+ ch)  │─→ NO → Add error
    │ ✓ ID Number not empty   │─→ NO → Add error
    │ ✓ TURNSTILE TOKEN ✓     │─→ NO → Add error
    └─────────────────────────┘
            ↓
    ALL ERRORS?
        ↓
    ┌─────────────┬─────────────┐
    ↓             ↓
   YES           NO
    ↓             ↓
  Show       setCurrentStep(+1)
  Toast      ↓
    ↓     Proceed to
  Stay on   Step 2
  Step 1
```

---

## 🎬 Animation Timeline

```
STEP 1 BECOMES ACTIVE (currentStep = 0):
├─ 0ms:   useEffect triggers
├─ 100ms: setTimeout calls renderCaptcha
├─ 150ms: Wait for Turnstile API
├─ 200ms: Widget renders in container
├─ 300ms: Widget displays with fade-in
└─ >300ms: Widget interactive

USER COMPLETES TURNSTILE:
├─ Click: Checkbox becomes checked
├─ Process: Cloudflare verifies
├─ Response: Token returned
├─ Update: turnstileToken stored
├─ Render: Success message appears (fade-in)
└─ Ready: User can click Next

MOVING TO STEP 2 (currentStep = 1):
├─ 0ms:   useEffect triggers
├─ 10ms:  removeCaptcha() called
├─ 50ms:  Widget removed from DOM
└─ 100ms: Step 2 renders
```

---

## 🎓 Reference

**For complete documentation**, see:
- `TURNSTILE_IMPLEMENTATION.md` - Implementation details
- `TURNSTILE_QUICK_REFERENCE.md` - API reference
- `TURNSTILE_HTML_REFERENCE.md` - HTML/JSX structure
- `src/hooks/useTurnstile.ts` - Hook source code
- `src/components/auth/TurnstileExamples.tsx` - Code examples

---

**Visualization Guide**: January 27, 2026 ✅
