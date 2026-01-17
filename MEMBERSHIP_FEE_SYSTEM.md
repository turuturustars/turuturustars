# Membership Fee System Implementation

## Overview
The automatic membership fee system has been implemented to automatically bill members **KES 200** when they register and renew their membership annually.

---

## Key Features

### 1. Automatic Initial Fee
- **Amount**: KES 200
- **When**: Immediately upon account creation/registration
- **Status**: Set as "pending" until payment is recorded
- **Action Required**: Member or Treasurer must record the payment

### 2. Annual Renewal
- **Frequency**: Once per year on the anniversary of registration
- **Amount**: KES 200
- **Automatic Creation**: A renewal fee is automatically created on the renewal date
- **Due Date**: Same as the registration date + 1 year

### 3. Payment Tracking
- **Record Payment**: Treasurers can record payments with:
  - Payment Reference (M-Pesa transaction ID, check number, etc.)
  - Optional notes for additional context
  - Automatic timestamp of payment
  
### 4. Member Status Management
- Members can view their membership fee status in their dashboard
- Shows pending, paid, overdue, and renewal information
- Clear visibility of next renewal date

---

## Database Schema

### New Tables

#### `membership_fees`
```sql
CREATE TABLE public.membership_fees (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) DEFAULT 200,
  fee_type TEXT -- 'initial' or 'renewal'
  due_date DATE,
  paid_at TIMESTAMP,
  status TEXT -- 'pending', 'paid', 'overdue', 'cancelled'
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Profile Updates
Added to `profiles` table:
- `membership_fee_amount` - Amount of annual fee (default: 200)
- `membership_fee_paid` - Boolean flag for initial fee payment status
- `membership_fee_paid_at` - Timestamp of initial fee payment
- `next_membership_renewal_date` - Calculated as joined_at + 1 year

---

## How It Works

### Registration Flow (for new members)

1. Member submits registration form via `MembershipForm.tsx`
2. Member record is created in `members` table
3. When member is activated and profile is created:
   - Trigger `initialize_membership_fee()` fires
   - Initial membership fee (KES 200) is automatically created in `membership_fees` table
   - `next_membership_renewal_date` is set to registration date + 1 year
   - Status is set to "pending"

### Payment Recording Flow

1. Treasurer accesses "Membership Fees" section
2. Selects a pending fee
3. Clicks "Record Payment"
4. Enters:
   - Payment Reference (required) - e.g., M-Pesa transaction code
   - Optional notes
5. Confirms payment
6. Status is updated to "paid" with timestamp
7. If initial fee, profile's `membership_fee_paid` is set to true

### Renewal Flow

1. On the registration anniversary, a renewal fee is automatically created
2. Status is "pending" until payment is recorded
3. Process is same as payment recording
4. After payment, next renewal date is updated to current date + 1 year

---

## Components & Usage

### For Members

#### `MembershipFeeManagement` Component
```tsx
import MembershipFeeManagement from '@/components/dashboard/MembershipFeeManagement';

// In member dashboard
<MembershipFeeManagement />
```

**Features:**
- View membership fee amount (KES 200)
- See registration date
- View next renewal date with countdown
- View total fees paid
- Historical list of all fee transactions
- Record payment for pending fees
- Status badges (Paid, Pending, Overdue, Renewal Due)

### For Treasurers

#### `TreasurerMembershipFees` Component
```tsx
import TreasurerMembershipFees from '@/components/dashboard/TreasurerMembershipFees';

// In treasurer dashboard
<TreasurerMembershipFees />
```

**Features:**
- Dashboard statistics:
  - Total outstanding amounts
  - Total collected amounts
  - Overdue fees count
  - Total members with fees
- Filter by status (Pending, Paid, Overdue, Cancelled)
- Filter by type (Initial, Renewal)
- Complete member fee history table
- Record payments in bulk
- Export to CSV for reporting

### Hook: `useMembershipFees`

```tsx
import { useMembershipFees } from '@/hooks/useMembershipFees';

const MyComponent = ({ memberId }) => {
  const { fees, loading, error } = useMembershipFees(memberId);
  
  // fees: Array of MembershipFee objects
  // loading: Boolean
  // error: Error message if any
};
```

---

## Workflow Timeline

### Example: Member Registration on Jan 15, 2026

```
Jan 15, 2026
├─ Member registers
├─ Account created
├─ Profile created
├─ Initial fee (KES 200) created → Status: PENDING
└─ Next renewal set to: Jan 15, 2027

[Member pays via M-Pesa]

Jan 20, 2026
├─ Treasurer records payment
├─ Reference: MPESA REF12345
└─ Fee status → PAID

Jan 15, 2027
├─ Renewal fee automatically created (KES 200)
└─ Status: PENDING

[Member pays renewal]

Jan 22, 2027
├─ Treasurer records renewal payment
└─ Next renewal set to: Jan 15, 2028
```

---

## Fee Status Definitions

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| **Pending** | Fee is due but not yet paid | Record payment |
| **Paid** | Payment has been recorded | None |
| **Overdue** | Due date has passed, not paid | Follow-up required |
| **Cancelled** | Fee has been cancelled | None (archived) |

---

## Permissions & Access Control

### Member Access
- Can view own membership fees
- Can see payment history
- Can record payments for their own fees

### Treasurer Access
- View all member fees
- Record payments for all members
- Filter and search fees
- Export fee records
- Generate reports

### Admin Access
- Full access to all fee management
- Can modify fee amounts
- Can create ad-hoc fees
- Can adjust renewal dates

---

## Integration Points

### 1. Member Registration (MembershipForm.tsx)
- User sees message: "A membership fee of KES 200 will be billed"
- Upon signup, initial fee is queued

### 2. Member Dashboard
- New "Membership Fees" section added
- Shows current fee status
- Displays renewal countdown
- Option to record payments

### 3. Treasurer Dashboard
- New "Membership Fees" management page
- Bulk payment recording
- Fee statistics and reporting

### 4. Admin Settings
- Can configure fee amount
- Can adjust renewal frequency
- Can view all fee transactions

---

## Database Functions

### `initialize_membership_fee()`
Automatically called when a new profile is created.
```
Triggers:
- After INSERT on profiles table
Actions:
- Creates membership_fees record
- Sets fee_type to 'initial'
- Sets status to 'pending'
- Sets next_membership_renewal_date
```

### `create_renewal_fee(member_id)`
Manually called to create a renewal fee.
```
Parameters:
- member_id: UUID of member
Returns:
- BOOLEAN (success/failure)
Actions:
- Creates new membership_fees record with type 'renewal'
- Updates next_membership_renewal_date
```

---

## Row Level Security (RLS) Policies

### `membership_fees` Table

1. **View Policy**
   - Users can view their own fees
   - Treasurers and admins can view all fees

2. **Insert Policy**
   - Only system (via triggers) or admins can create fees

3. **Update Policy**
   - Only treasurers and admins can update fees

---

## Notifications & Reminders

### Recommended Additions (Future)
1. **Payment Reminder**: 7 days before due date
2. **Overdue Notice**: When fee becomes overdue
3. **Renewal Reminder**: 30 days before renewal
4. **Payment Confirmation**: When payment is recorded

---

## Reporting & Analytics

### Available Metrics
- Total fees collected
- Pending fees amount
- Overdue fees
- Payment compliance rate
- Monthly collection trends
- Per-member payment history

### Export Functionality
- CSV export of all visible fees
- Includes member name, email, amount, dates, status

---

## Configuration

### Default Settings
- **Fee Amount**: KES 200
- **Fee Type**: One-time + Annual renewal
- **Renewal Frequency**: 12 months from registration date
- **Currency**: KES (Kenyan Shilling)

### To Change Fee Amount
Update in migration file before deployment:
```sql
DEFAULT 200 → DEFAULT [new_amount]
```

---

## Testing Checklist

- [ ] Member registration creates initial fee
- [ ] Membership fee appears in member dashboard
- [ ] Treasurer can see all member fees
- [ ] Treasurer can record payment
- [ ] Payment status updates correctly
- [ ] Renewal fee calculation is accurate
- [ ] Next renewal date is set correctly
- [ ] Export functionality works
- [ ] Filters work as expected
- [ ] Real-time updates function properly

---

## Troubleshooting

### Fee Not Appearing After Registration
- Check if profile was created successfully
- Verify database trigger is active
- Check RLS policies allow data access

### Payment Not Recording
- Ensure payment reference is provided
- Check user has treasurer role
- Verify fee status is not already "paid"

### Wrong Renewal Date
- Verify joined_at field is correct
- Check calculation: joined_at + 365 days
- Confirm timezone handling for dates

---

## Future Enhancements

1. **Automated Billing Integration**
   - Direct M-Pesa API integration for auto-billing
   - Payment links sent via SMS/email

2. **Dormancy Rules**
   - Automatic dormancy after 3 missed payments
   - Notification system for warnings

3. **Penalty & Late Fees**
   - Additional charges for overdue payments
   - Interest calculation

4. **Payment Plans**
   - Split payment options
   - Installment arrangements

5. **Reporting Dashboard**
   - Real-time analytics
   - Payment trends
   - Member compliance reports

---

## Support & Maintenance

### Common Operations

**Record a Payment:**
1. Go to Membership Fees page
2. Filter by "Pending" status
3. Click "Record Payment"
4. Enter M-Pesa reference or check number
5. Add notes if needed
6. Confirm

**Export Fee Records:**
1. Go to Membership Fees page
2. Apply filters as needed
3. Click "Export CSV"
4. File downloads automatically

**Check Member Fee Status:**
1. Go to member's profile
2. Open "Membership Fees" section
3. View all transactions and status

---

## Contact & Questions
For questions about the membership fee system, contact the Treasurer or Administrator.
