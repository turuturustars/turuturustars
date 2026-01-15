# TURUTURU STARS - PAYMENT FLOW DOCUMENTATION

## Overview

This document explains the complete end-to-end payment flow for Turuturu Stars CBO, supporting three payment categories and multiple payment methods (M-Pesa, Bank Transfer, Cash).

---

## 1. PAYMENT SYSTEM ARCHITECTURE

### 1.1 Payment Types (Foundation)

The system supports three payment categories:

```
PAYMENT TYPES
├── Regular Contributions (Monthly Dues, Registration Fees)
├── Event-Based Contributions (Fundraisers, Emergencies, Special Events)
└── Penalties / Arrears (Missed Contributions, Late Fees)
```

### 1.2 Payment Methods Supported

```
PAYMENT METHODS
├── M-Pesa (STK Push - Instant)
│   └── Best for: Immediate mobile payments
├── Bank Transfer
│   └── Best for: Larger amounts, records
└── Cash (Manual)
    └── Best for: In-person payments
```

### 1.3 Payment Actors

| Actor | Role | Actions |
|-------|------|---------|
| **Member** | Payer | Initiates payment, chooses method |
| **System** | Orchestrator | Records, validates, reconciles |
| **Admin/Treasurer** | Reviewer | Approves manual payments |
| **M-Pesa/Bank** | Provider | Processes transactions |

---

## 2. HIGH-LEVEL PAYMENT FLOW

```
MEMBER INITIATES PAYMENT
    ↓
SELECTS PAYMENT OBLIGATION
    ↓
CHOOSES PAYMENT METHOD
    ↓
PROVIDES PAYMENT DETAILS
    ↓
SYSTEM GENERATES REFERENCE ID
    ↓
PAYMENT PROVIDER PROCESSES
    ↓
SYSTEM RECEIVES CONFIRMATION
    ↓
STATUS UPDATED (CONFIRMED/PENDING)
    ↓
RECEIPT GENERATED
    ↓
AUDIT LOG RECORDED
```

---

## 3. DETAILED STEP-BY-STEP FLOW

### STEP 1: SYSTEM CREATES PAYMENT OBLIGATION

**When:** 
- New month starts
- Event is created
- Member misses a deadline

**What happens:**
```tsx
// Payment obligation created in contributions table
{
  member_id: "uuid",
  amount: 5000,
  due_date: "2026-02-14",
  payment_type: "regular|event|penalty",
  contribution_type: "monthly|welfare|registration|project",
  status: "PENDING",
  welfare_case_id: "uuid|null" // if event-based
}
```

**Status = PENDING** - Waiting for member action

---

### STEP 2: MEMBER VIEWS PAYMENT STATUS

**Where:** Dashboard → Payments section

**What they see:**
```
PAYMENT DASHBOARD SUMMARY
├── Total Due: KES 5,000
├── Total Paid: KES 20,000
├── Pending Obligations: 2
├── Payment Rate: 80%
│
PENDING OBLIGATIONS LIST
├── Obligation 1: Monthly Dues - KES 500 (Due in 3 days)
├── Obligation 2: Welfare Fund - KES 1,500 (OVERDUE 2 days)
└── [PAY NOW] buttons
```

**Information shown:**
- Amount due
- Breakdown per category
- Deadline & days remaining
- Overdue indicators

---

### STEP 3: MEMBER INITIATES PAYMENT

**Where:** Click [PAY NOW] button on obligation

**System generates:**
```
REFERENCE ID: PAY-1736854320-A7F9K2M1X
```

**Member selects payment method:**

#### Option A: M-Pesa
```tsx
INPUT FIELDS:
├── M-Pesa Number: +254700000000
└── [Shows visual feedback & security info]

SYSTEM ACTIONS:
├── Validates phone format (Kenyan numbers)
├── Initiates STK Push
└── Updates status → INITIATED
```

#### Option B: Bank Transfer
```tsx
INPUT FIELDS:
├── Bank Name: "KCB"
├── Account Number: "1234567890"
├── Account Holder: "John Doe"
└── [Upload proof of payment]

SYSTEM ACTIONS:
├── Validates account details
├── Updates status → INITIATED
└── Marks for manual verification
```

#### Option C: Cash
```tsx
INFORMATION:
├── Contact Treasurer: treasurer@turuturustars.org
├── Payment will be recorded in person
└── Receipt issued immediately

SYSTEM ACTIONS:
├── Creates payment record
├── Marks status → PENDING (awaiting admin confirmation)
└── Notifies treasurer
```

---

### STEP 4: PAYMENT EXECUTION

#### A. M-Pesa Flow
```
MEMBER'S PHONE
    ↓
[STK PROMPT APPEARS]
    ↓
MEMBER ENTERS PIN
    ↓
M-PESA PROCESSES
    ↓
RETURNS: {
  TransactionID,
  Amount,
  PhoneNumber,
  Timestamp,
  ReceiptNumber
}
    ↓
SYSTEM RECEIVES VIA CALLBACK
```

#### B. Bank Transfer Flow
```
MEMBER INITIATES TRANSFER
├── Bank: Turuturu Stars CBO Account
├── Reference: PAY-1736854320-A7F9K2M1X
└── Amount: Exactly as specified
    ↓
UPLOAD PROOF
├── Screenshot or PDF
├── Shows reference ID
└── Shows timestamp
    ↓
SYSTEM RECEIVES PROOF
    ↓
MARKED FOR VERIFICATION
```

#### C. Cash Flow
```
MEMBER CONTACTS TREASURER
    ↓
ARRANGE MEETING/PICKUP
    ↓
MAKE PAYMENT IN PERSON
    ↓
TREASURER RECORDS IN SYSTEM
    ↓
RECEIPT ISSUED IMMEDIATELY
```

---

### STEP 5: SYSTEM VALIDATION

**Checks performed:**

```tsx
✓ Amount check
  └── Payment amount >= expected amount
  
✓ Reference ID check
  └── Reference ID exists in system
  
✓ Member check
  └── Member exists & is active
  
✓ Duplicate check
  └── No duplicate transaction for same obligation
  
✓ Status check
  └── Obligation not already paid
```

**Results:**

```
IF VALID:
  └── Payment status → RECEIVED

IF INVALID:
  ├── Reason logged
  ├── Payment status → FLAGGED
  └── Admin notified for manual review
```

---

### STEP 6: ADMIN/TREASURER REVIEW (Manual Payments Only)

**For Bank & Cash payments:**

```
TREASURER DASHBOARD
├── Pending Manual Payments
│   ├── Payment ID
│   ├── Member Name
│   ├── Amount
│   ├── Proof (if bank transfer)
│   └── [APPROVE] [REJECT] buttons
└── Actions:
    ├── [APPROVE] → Status: CONFIRMED
    └── [REJECT] → Status: REJECTED
```

---

### STEP 7: PAYMENT RECONCILIATION

**When status = CONFIRMED:**

```tsx
SYSTEM AUTOMATICALLY:
├── Links payment to obligation
├── Updates balances:
│   ├── Obligation: marked as PAID
│   ├── Member: balance updated
│   └── Welfare case: collected_amount += payment
├── Clears arrears if applicable
└── Updates member status (if required)

MEMBER SEES:
├── Payment moved to History
├── Balance updated
└── Next obligations displayed
```

---

### STEP 8: RECEIPT & AUDIT LOG

**Receipt generated:**

```
═══════════════════════════════════════════════════════════════
            TURUTURU STARS CBO - PAYMENT RECEIPT
═══════════════════════════════════════════════════════════════

Receipt Number: REC-1736854525
Date: January 14, 2026, 3:45 PM

MEMBER INFORMATION
═══════════════════════════════════════════════════════════════
Name: James Kipchoge
Membership Number: TS-00001

PAYMENT DETAILS
═══════════════════════════════════════════════════════════════
Amount Paid: KES 5,000
Payment Method: M-Pesa
Reference ID: PAY-1736854320-A7F9K2M1X
Status: CONFIRMED

PAYMENT BREAKDOWN
═══════════════════════════════════════════════════════════════
Payment Type: Regular Contribution
Category: Monthly Dues
Due Date: 2026-02-14
Payment Date: 2026-01-14

═══════════════════════════════════════════════════════════════
This is an automatically generated receipt.
For inquiries, contact: treasurer@turuturustars.org
═══════════════════════════════════════════════════════════════
```

**Immutable Audit Log:**

```tsx
{
  id: "log-uuid",
  action: "PAYMENT_CONFIRMED",
  payment_id: "payment-uuid",
  member_id: "member-uuid",
  amount: 5000,
  method: "mpesa",
  status_before: "RECEIVED",
  status_after: "CONFIRMED",
  confirmed_by: "admin-uuid",
  timestamp: "2026-01-14T15:45:30Z",
  details: {
    reference_id: "PAY-1736854320-A7F9K2M1X",
    mpesa_receipt: "LIB0987654",
    phone_number: "+254700000000"
  }
}
```

---

## 4. PAYMENT STATES (Critical)

Every payment has exactly ONE state at any time:

```
PENDING
├── Meaning: Obligation created, awaiting member action
├── Duration: Until member initiates payment
└── Actions: Member pays

      ↓

INITIATED
├── Meaning: Member started payment process
├── Duration: A few seconds to minutes
└── Actions: Payment provider processes
         System waits for callback

      ↓

RECEIVED
├── Meaning: System got confirmation from provider
├── Duration: Until admin verifies (manual) or auto-confirmed
└── Actions: For M-Pesa: Auto-confirm
         For Bank/Cash: Await admin review

      ↓

CONFIRMED
├── Meaning: Payment verified and reconciled
├── Duration: Final state, permanent
└── Status: Obligation PAID

      ↓

ALTERNATIVE PATHS:

REJECTED
├── Meaning: Payment invalid, wrong amount, or duplicate
├── Reason: Validation failed
└── Next: Member must re-pay

REFUNDED
├── Meaning: Payment reversed (future feature)
├── Reason: Member request, duplicate, or error
└── Next: Obligation reopened
```

---

## 5. PARTIAL PAYMENTS FLOW

**If partial allowed:**

```tsx
// Member pays part of obligation
Payment 1: KES 2,000 of KES 5,000
  ↓
System records:
├── Paid amount: 2,000
├── Remaining balance: 3,000
└── Status: PARTIAL

// Deadline still enforced
Remaining KES 3,000 still due by deadline

// Notifications sent
"You have KES 3,000 still due by Feb 14"

// Member pays rest
Payment 2: KES 3,000
  ↓
System marks obligation as PAID
Balance = 0
Status → CONFIRMED
```

---

## 6. FAILURE & EDGE CASES

### Case 1: Duplicate Payment Detected
```
SCENARIO: Member pays twice for same obligation

SYSTEM DETECTS:
├── Same obligation_id
├── Same amount (or similar)
└── Within 24 hours

ACTION:
├── Flag payment as DUPLICATE
├── Notify admin
└── Create refund record (future feature)
```

### Case 2: Overpayment
```
SCENARIO: Member pays KES 6,000 for KES 5,000 obligation

OPTIONS:
├── A) Carry forward KES 1,000 to next obligation
├── B) Issue refund
└── C) Ask member preference

SYSTEM:
├── Records full amount as paid
├── Creates credit entry
└── Applies to future obligations automatically
```

### Case 3: Missed Deadline
```
SCENARIO: Payment not made by due date

SYSTEM:
├── Obligation status → OVERDUE
├── Sends reminder notification
├── Calculates penalty (if configured)
├── Creates new penalty obligation
└── Marks member for review
```

### Case 4: Wrong Reference ID
```
SCENARIO: Bank transfer with incorrect/missing reference

ACTION:
├── Payment marked as RECEIVED (but flagged)
├── Requires manual reconciliation
├── Treasurer matches payment to member manually
└── Once matched → CONFIRMED
```

### Case 5: Network Failure During M-Pesa
```
SCENARIO: STK push initiated but callback fails to arrive

SYSTEM:
├── Waits 15 minutes
├── Retries polling M-Pesa API
└── If still missing: Manual verification required
```

---

## 7. PAYMENT HISTORY & REPORTING

**Member view:**

```
PAYMENT HISTORY
├── Date | Reference | Amount | Method | Status
├── 2026-01-14 | PAY-...A1 | 5,000 | M-Pesa | CONFIRMED
├── 2026-01-07 | PAY-...B2 | 3,000 | Bank | CONFIRMED
├── 2025-12-31 | PAY-...C3 | 500 | Cash | CONFIRMED
└── Total Paid: KES 8,500

OUTSTANDING DUES
├── Monthly Dues (2026-02) | KES 500 | Due in 3 days
└── Welfare Fund | KES 1,500 | OVERDUE 2 days
```

**Admin view:**

```
PAYMENT ANALYTICS
├── Daily totals
├── Monthly summaries
├── Per-member payment history
├── Outstanding balances
├── Welfare disbursement mapping
├── Audit trails
└── Pending manual verifications
```

---

## 8. SECURITY & TRUST GUARANTEES

```
GUARANTEE 1: Immutable Audit Logs
├── Every action logged with timestamp
├── No modification possible
├── Who, What, When, Why recorded
└── Accessible only to admins

GUARANTEE 2: Role-Restricted Access
├── Members: See only their own payments
├── Treasurer: See all unverified payments
├── Admin: Full access + analytics
└── System: Automated processing only

GUARANTEE 3: No Payment Deletion
├── Payments never deleted
├── Only corrections via reversal entries
├── Full history preserved
└── Traceable for audit

GUARANTEE 4: Timestamp Everything
├── Payment initiation time
├── Confirmation time
├── Admin action time
├── Receipt generation time
└── Audit log creation time

GUARANTEE 5: Encryption
├── SSL for all data in transit
├── Phone numbers masked in UI
├── Reference IDs never exposed to third parties
└── Member IDs encrypted in logs
```

---

## 9. INTEGRATION GUIDE

### 9.1 Add Payment Dashboard to Main App

**In [App.tsx](App.tsx):**

```tsx
import PaymentDashboard from '@/components/dashboard/PaymentDashboard';

// Add route
<Route path="/dashboard/payments" element={<PaymentDashboard />} />

// Or add to Dashboard sidebar
<NavLink to="/dashboard/payments">
  <DollarSign className="w-4 h-4" />
  Payments
</NavLink>
```

### 9.2 Add M-Pesa Payment Button to Obligations

**In [ContributionsPage.tsx](ContributionsPage.tsx):**

```tsx
import PayWithMpesa from '@/components/dashboard/PayWithMpesaEnhanced';

// In component
<PayWithMpesa
  contributionId={contribution.id}
  defaultAmount={contribution.amount}
  paymentType={contribution.contribution_type}
  onPaymentSuccess={(refId) => {
    // Refresh contributions list
    fetchContributions();
    toast({
      title: 'Payment Initiated',
      description: `Reference: ${refId}`
    });
  }}
/>
```

### 9.3 Add Notification on Payment Status Change

**In [notificationService.ts](notificationService.ts):**

```tsx
// When payment confirmed
await sendNotification({
  userId: member_id,
  title: 'Payment Confirmed',
  message: `KES ${amount} payment confirmed. Ref: ${reference_id}`,
  type: 'contribution',
  actionUrl: '/dashboard/payments'
});
```

### 9.4 Create Payment Obligations Automatically

**In database trigger or scheduled job:**

```sql
-- Every month, create obligations for active members
INSERT INTO contributions (
  member_id, 
  amount, 
  contribution_type, 
  due_date, 
  status
)
SELECT 
  p.id,
  500, -- Monthly amount
  'monthly',
  DATE_TRUNC('month', NOW()) + INTERVAL '14 days', -- Due 14 days into month
  'pending'
FROM profiles p
WHERE p.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM contributions c
  WHERE c.member_id = p.id
  AND c.contribution_type = 'monthly'
  AND DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', NOW())
);
```

---

## 10. PAYMENT DATABASE SCHEMA

### Contributions Table
```sql
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES profiles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  contribution_type TEXT NOT NULL, -- registration, welfare, monthly, project
  status TEXT DEFAULT 'pending', -- pending, initiated, received, confirmed, rejected
  reference_number TEXT UNIQUE, -- PAY-xxx-xxx
  paid_at TIMESTAMP,
  due_date TIMESTAMP,
  notes TEXT,
  welfare_case_id UUID REFERENCES welfare_cases(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### M-Pesa Transactions Table
```sql
CREATE TABLE mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES profiles(id),
  contribution_id UUID REFERENCES contributions(id),
  phone_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  checkout_request_id TEXT UNIQUE,
  mpesa_receipt_number TEXT,
  transaction_type TEXT, -- stk_push, callback, confirmation
  status TEXT, -- pending, initiated, confirmed, failed
  result_desc TEXT,
  initiated_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Payment Audit Log Table
```sql
CREATE TABLE payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- PAYMENT_INITIATED, PAYMENT_CONFIRMED, PAYMENT_REJECTED
  payment_id UUID REFERENCES contributions(id),
  member_id UUID NOT NULL,
  amount DECIMAL(10,2),
  status_before TEXT,
  status_after TEXT,
  actor_id UUID, -- Who performed action (member, admin, system)
  actor_type TEXT, -- 'member', 'admin', 'system'
  details JSONB, -- Additional context
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 11. RLS POLICIES

```sql
-- Members can only see their own payments
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own contributions"
  ON contributions FOR SELECT
  USING (auth.uid() = member_id);

-- Admins see all
CREATE POLICY "Admins see all contributions"
  ON contributions FOR SELECT
  USING (is_official(auth.uid()));

-- Only contribute to own record
CREATE POLICY "Users can create own contributions"
  ON contributions FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Treasurers can update status
CREATE POLICY "Treasurers update contribution status"
  ON contributions FOR UPDATE
  USING (has_role(auth.uid(), 'treasurer'))
  WITH CHECK (true);
```

---

## 12. API ENDPOINTS NEEDED

```
POST /api/payments/initiate
├── Initiates payment for obligation
├── Generates reference ID
└── Returns: { reference_id, status, message }

POST /api/payments/mpesa/callback
├── Receives M-Pesa confirmation
├── Validates signature
└── Updates payment status

GET /api/payments/obligations
├── Lists pending obligations for member
└── Returns: [ { id, amount, due_date, ... } ]

GET /api/payments/history
├── Returns payment history
└── Supports filtering and pagination

POST /api/payments/verify/bank
├── Verifies bank transfer proof
├── Manual review flag
└── Marks for treasurer action

PATCH /api/payments/{id}/confirm
├── Admin confirms manual payment
├── Updates status to CONFIRMED
└── Generates receipt
```

---

## 13. NOTIFICATION TRIGGERS

```
WHEN                          NOTIFY                     TO
──────────────────────────────────────────────────────────
Payment initiated             Show processing state      Member
Payment confirmed             Show success               Member
Payment received (manual)     For manual verification    Treasurer
Payment due tomorrow          Payment reminder           Member
Payment overdue               Overdue warning            Member
Payment failed                Error message              Member
Penalty created               New penalty due            Member
Refund processed              Refund confirmation        Member
```

---

## 14. FUTURE ENHANCEMENTS

```
✓ PHASE 1 (Current)
  ├── M-Pesa STK Push
  ├── Bank Transfer
  ├── Cash Payments
  └── Manual verification

○ PHASE 2
  ├── Multiple payment providers (Stripe, Pesapal)
  ├── Card payments
  ├── USSD support
  └── Auto-refunds

○ PHASE 3
  ├── Subscription payments
  ├── Installment plans
  ├── Group payments
  └── Payment reminders (SMS)

○ PHASE 4
  ├── International payments
  ├── Cryptocurrency (future)
  ├── Biometric verification
  └── AI fraud detection
```

---

## 15. TROUBLESHOOTING

### Issue: M-Pesa STK not arriving

**Diagnosis:**
- Check phone number format is correct
- Verify M-Pesa account has credit
- Check network connectivity
- Look at mpesa_transactions table for error code

**Solution:**
```
1. Retry initiation after 30 seconds
2. Try bank transfer instead
3. Contact M-Pesa support if persistent
4. Admin can verify manually
```

### Issue: Bank transfer marked as unverified

**Diagnosis:**
- Reference ID doesn't match
- Amount incorrect
- Proof quality too low

**Solution:**
```
1. Verify reference ID in transaction
2. Confirm amount matches
3. Re-upload clearer proof image
4. Contact treasurer for manual match
```

### Issue: Payment shows as "Pending" but was confirmed

**Diagnosis:**
- Callback from M-Pesa delayed
- Manual verification still pending
- System processing in background

**Solution:**
```
1. Refresh page to reload from server
2. Check notifications for updates
3. Wait up to 24 hours for manual confirmation
4. Contact treasurer if delayed
```

---

## 16. CONTACT & SUPPORT

**For Payment Issues:**
- Treasurer: treasurer@turuturustars.org
- Admin: admin@turuturustars.org
- Support: support@turuturustars.org

**For M-Pesa Issues:**
- M-Pesa Support: *344# (Free)
- Check M-Pesa balance: *156#

**For Bank Issues:**
- Contact your bank directly
- Keep receipt/reference for dispute

---

**Document Version:** 1.0  
**Last Updated:** January 14, 2026  
**Maintained By:** Turuturu Stars Finance Team
