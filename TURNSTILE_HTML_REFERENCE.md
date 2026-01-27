// Cloudflare Turnstile Widget - HTML/JSX Reference
// Location: src/components/auth/StepByStepRegistration.tsx (Lines ~560-580)

/* ========== JSX Rendering ========== */

// The widget is rendered in the personal-info step:
<div className="space-y-3 pt-4 border-t">
  {/* Label Section */}
  <div className="flex items-center gap-2">
    <Shield className="w-4 h-4 text-primary" />
    <Label className="text-sm font-semibold">Security Verification</Label>
    <span className="text-red-500">*</span>
  </div>

  {/* Turnstile Container - Widget Renders Here */}
  <div id="turnstile-container" className="flex justify-center py-2" />

  {/* Error Message (if any) */}
  {turnstileError && (
    <p className="text-xs text-red-500 flex items-center gap-1 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded">
      <AlertCircle className="w-3 h-3" />
      {turnstileError}
    </p>
  )}

  {/* Success Message (when completed) */}
  {!turnstileError && turnstileToken && (
    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded">
      <CheckCircle2 className="w-3 h-3" />
      Security verification completed
    </p>
  )}

  {/* Helper Text */}
  <p className="text-xs text-muted-foreground">
    This helps us keep your account secure
  </p>
</div>

/* ========== CSS Classes Used ========== */

// Tailwind classes for styling:
- space-y-3           // Vertical spacing
- pt-4 border-t       // Padding and border
- flex items-center   // Flex alignment
- gap-2               // Gap between items
- text-sm font-bold   // Text styling
- text-red-500        // Required indicator
- flex justify-center // Center widget
- py-2                // Vertical padding
- text-xs             // Small text
- bg-red-50           // Error background
- dark:bg-red-950/30  // Dark mode error
- px-3 py-2           // Padding
- rounded             // Border radius
- text-green-600      // Success text
- text-muted-fg       // Secondary text

/* ========== Widget Lifecycle ========== */

// useEffect in StepByStepRegistration.tsx (Lines ~187-202):

useEffect(() => {
  if (currentStep === 0) {
    // RENDER: First step - show Turnstile
    const timer = setTimeout(() => {
      renderCaptcha('turnstile-container').catch(err => {
        console.error('Failed to render Turnstile:', err);
        toast({
          title: 'Security Error',
          description: 'Failed to load security verification. Please refresh the page.',
          variant: 'destructive',
        });
      });
    }, 100);
    return () => clearTimeout(timer);
  } else {
    // REMOVE: Other steps - hide Turnstile
    removeCaptcha();
  }
}, [currentStep, renderCaptcha, removeCaptcha, toast]);

/* ========== Validation Logic ========== */

// In validateStep() function (Line 215):

if (!turnstileToken) {
  newErrors.turnstile = 'Please complete the security verification';
}

// This blocks progression to Step 2 unless:
// 1. Name is filled
// 2. Phone is filled (10+ chars)
// 3. ID number is filled
// 4. Turnstile token is obtained

/* ========== State Management ========== */

// From useTurnstile hook:
const {
  token: turnstileToken,           // The captcha token
  error: turnstileError,           // Error message if any
  renderCaptcha,                   // Function to render widget
  reset: resetCaptcha,             // Function to reset
  remove: removeCaptcha,           // Function to remove
} = useTurnstile();

// turnstileToken:
// - null → Widget not completed
// - string → Valid token from Cloudflare

// turnstileError:
// - null → No error
// - string → Error message to display

/* ========== Integration Points ========== */

1. IMPORT (Line 11):
   import { useTurnstile } from '@/hooks/useTurnstile';

2. STATE (Line 153):
   const { token: turnstileToken, error: turnstileError, renderCaptcha, ... } = useTurnstile();

3. LIFECYCLE (Lines 187-202):
   useEffect(() => { renderCaptcha or removeCaptcha })

4. VALIDATION (Line 215):
   if (!turnstileToken) newErrors.turnstile = 'Please complete...'

5. RENDERING (Lines 560-580):
   <div id="turnstile-container" />
   + error message UI
   + success message UI

/* ========== Turnstile Script ========== */

// Already in index.html (Line ~195):
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

// Environment variable (in .env):
VITE_CLOUDFLARE_SITE_KEY=0x4AAAAAACRFKckuFG5fhGU_

// Accessed in useTurnstile.ts (Line ~63):
const siteKey = import.meta.env.VITE_CLOUDFLARE_SITE_KEY;

/* ========== Visual Design ========== */

Layout:
┌─────────────────────────────────────┐
│ 🛡️ Security Verification       *    │  ← Header with icon
├─────────────────────────────────────┤
│                                     │
│   [Cloudflare Turnstile Widget]    │  ← Checkbox widget
│                                     │
├─────────────────────────────────────┤
│ ✅ Security verification completed │  ← Success message (green)
├─────────────────────────────────────┤
│ This helps us keep your account...  │  ← Helper text
└─────────────────────────────────────┘

/* ========== Mobile Responsive ========== */

// Classes handle mobile automatically:
- flex justify-center → Centers on all screens
- py-2 → Proper padding for touch targets
- text-xs → Readable on small screens
- rounded → Touch-friendly corners

// Turnstile automatically responds to:
- Screen size
- Device orientation
- Dark/light mode

/* ========== Accessibility ========== */

// Semantic HTML:
- <div id="turnstile-container" /> → Proper container ID
- <Label> component → Accessible label
- <span className="text-red-500">*</span> → Required indicator
- ARIA implicit via structure

// Keyboard navigation:
- Tab to widget
- Space to interact
- Tab to submit button

/* ========== Performance ========== */

// Optimizations:
- Lazy load (setTimeout 100ms)
- Clean up on unmount
- Remove widget when not needed
- No unnecessary re-renders

// Bundle impact:
- Hook: ~7KB
- Turnstile script: ~25KB (from CDN)
- Total impact: Minimal

/* ========== Browser Support ========== */

Tested on:
- Chrome/Chromium ✅
- Firefox ✅
- Safari ✅
- Edge ✅
- Mobile browsers ✅

Turnstile supports:
- ES2015+ JavaScript
- Progressive enhancement
- No Flash required
- Modern browsers only
