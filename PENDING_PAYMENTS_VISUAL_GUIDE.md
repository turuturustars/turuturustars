# Pending Payments Feature - Visual Guide

## Feature Overview

When users are on the Contributions page, they can now click the "Pending Verification" card to see all their pending payments and pay them directly.

---

## Step-by-Step Visual Flow

### Screen 1: Contributions Dashboard
```
┌─────────────────────────────────────────────────────────┐
│                   MY CONTRIBUTIONS                       │
├─────────────────────────────────────────────────────────┤
│  [+ Add Contribution]                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Total        │  │ Pending ⭐   │  │ Total        │  │
│  │ Contributed  │  │ Verification │  │ Transactions │  │
│  │              │  │              │  │              │  │
│  │ KES 25,000   │  │ KES 5,000    │  │ 12           │  │
│  │              │  │ ← CLICK HERE │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                          ↓ (hover: shadow grows)        │
│                          ↓ (cursor changes to hand)     │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Contribution History                                 ││
│  │ [Table with all contributions]                       ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Screen 2: Pending Payments Modal (Opens on Click)
```
┌────────────────────────────────────────────────────────────┐
│ Pending Payments                                         [✕]│
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Total Pending Amount                                │  │
│  │  KES 5,000                                    ⏰      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ WELFARE                                    [Pending]  │  │
│  │ Jan 15, 2026                                         │  │
│  │                                         KES 2,000    │  │
│  │                                    [Pay Now Button]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MONTHLY                                    [Pending]  │  │
│  │ Jan 10, 2026                                         │  │
│  │                                         KES 3,000    │  │
│  │                                    [Pay Now Button]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
├────────────────────────────────────────────────────────────┤
│                                          [Close Button]     │
└────────────────────────────────────────────────────────────┘
```

### Screen 3: After Clicking "Pay Now"
```
Transition to PayWithMpesa Component

┌────────────────────────────────────────────────────────────┐
│ Payment Details                                          [✕]│
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Amount to Pay: KES 2,000                                  │
│                                                             │
│  Select Payment Method:                                    │
│  [📱 M-Pesa] [🏦 Bank] [💵 Cash]                          │
│                                                             │
│  M-Pesa Details:                                           │
│  Phone Number: [_______]                                  │
│                                                             │
│  [Cancel] [Pay KES 2,000]                                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Screen 4: Payment Confirmation
```
After successful M-Pesa payment

┌────────────────────────────────────────────────────────────┐
│ Payment Confirmation                                     [✕]│
├────────────────────────────────────────────────────────────┤
│                                                             │
│                          ✓ (green circle)                   │
│                                                             │
│                  Payment Successful!                        │
│                                                             │
│  Transaction: MPESA123456                                  │
│  Amount: KES 2,000                                         │
│  Date: Jan 17, 2026, 2:30 PM                              │
│                                                             │
│  [Download Receipt] [Close]                               │
│                                                             │
└────────────────────────────────────────────────────────────┘

↓ Return to Contributions Page (pending amount updated)
```

---

## Interactive Elements

### 1. Pending Verification Card (Clickable)
**Interaction:**
- Click anywhere on the card to open modal
- Hover shows shadow effect and pointer cursor
- Visual indication: slight background highlight

**Before Hover:**
```
┌─────────────────────────┐
│ Pending Verification    │
│ KES 5,000               │
└─────────────────────────┘
```

**On Hover:**
```
┌─────────────────────────┐
│ Pending Verification    │
│ KES 5,000               │ ← shadow expands, cursor → 👆
└─────────────────────────┘
```

### 2. Pay Now Button
**Interaction:**
- Available on each pending payment item
- Opens M-Pesa payment flow
- Pre-filled with correct amount

**States:**
```
Default:          Hover:            Pressed:
[Pay Now]         [Pay Now]         [Payment Processing...]
  ↓                 ↓                  ↓
  
Yellow bg      Light yellow bg    Disabled state
```

### 3. Close Button
**Interaction:**
- X button at top right closes modal
- Close button at bottom closes modal
- Both do the same thing

---

## Color Scheme

### Pending Payments Theme
```
Background:     #FEF3C7 (Yellow 50)
Border:         #FCD34D (Yellow 200)
Text:           #B45309 (Yellow 700)
Header Badge:   Yellow with border

Icons:
- Clock ⏰ (yellow)
- X button (gray on hover)
- Check ✓ (green, on success)
```

### Status Badges
```
Pending: 🟡 Yellow badge
Paid:    🟢 Green badge
Missed:  🔴 Red badge
```

---

## Responsive Behavior

### Desktop (Large Screen)
```
Modal Width: max-w-2xl (656px)
Positioned: center of screen
Side margins: automatic
```

### Tablet (Medium Screen)
```
Modal Width: 90% of viewport
Positioned: center with margins
Padding: comfortable for touch
```

### Mobile (Small Screen)
```
Modal Width: 95% of viewport
Positioned: full height with safe areas
Buttons: full width for easier tapping
Text: larger for readability
```

---

## Empty State

When user has NO pending payments:

```
┌────────────────────────────────────────────────────────────┐
│ Pending Payments                                         [✕]│
├────────────────────────────────────────────────────────────┤
│                                                             │
│                         ✓ (green)                          │
│                                                             │
│                  No Pending Payments!                       │
│                  You are all caught up                      │
│                                                             │
├────────────────────────────────────────────────────────────┤
│                                          [Close]            │
└────────────────────────────────────────────────────────────┘
```

---

## Data Display Format

### Total Amount
```
Format:   KES 5,000
Example:  KES 25,350
          KES 1,000,000
```

### Dates
```
Format:   Mon, Jan 15, 2026
Example:  Wed, Jan 17, 2026
          Mon, Dec 25, 2025
```

### Contribution Types
```
WELFARE  → Welfare contribution
MONTHLY  → Monthly contribution
PROJECT  → Project contribution
PENALTY  → Penalty/Arrears
```

---

## Animations

### Modal Open
```
Timing: 300ms
Effect: Smooth fade-in from center
Opacity: 0% → 100%
Scale: 95% → 100%
```

### Card Hover
```
Timing: 200ms
Effect: Shadow expansion
Shadow: 0 → lg
```

### Button Hover
```
Timing: 200ms
Effect: Color shift
Background: slight darkening
```

---

## Accessibility Features

✅ Proper heading hierarchy (DialogTitle)
✅ Close button both at top and bottom
✅ Keyboard navigable (Tab through buttons)
✅ Color not only indicator (text labels too)
✅ Sufficient contrast ratios
✅ Descriptive button text "Pay Now"
✅ Date formatting in natural language
✅ Loading states on buttons
✅ Error messages if payment fails

---

## User Journey Summary

1. **Land on Contributions Page**
   - See stats: Total Contributed, Pending, Total Transactions

2. **Notice Pending Card**
   - Yellow highlighting
   - Shows large pending amount
   - Clock icon suggests action needed

3. **Click Pending Card**
   - Modal smoothly opens
   - See total + all pending items
   - Each item shows details

4. **Choose Payment Item**
   - Click "Pay Now" on desired item
   - M-Pesa dialog opens

5. **Complete Payment**
   - Enter phone and confirm
   - Receive receipt
   - Return to contributions page

6. **Updated Balance**
   - Pending amount decreases
   - Card refreshes with new total

---

**Feature Status**: ✅ Live and Ready
**Last Updated**: January 17, 2026
