# Membership Fee System - Quick Reference

## System Summary
✅ **Automatic membership fee billing implemented**
- Fixed fee: **KES 200 per member per year**
- Automatic billing on registration
- Annual renewal on registration anniversary
- Full payment tracking system

---

## What Changed

### 1. Database Migration (`20260117_add_membership_fees.sql`)
- Added `membership_fees` table for tracking all fees
- Added fee columns to `profiles` table:
  - `membership_fee_amount` (default: 200)
  - `membership_fee_paid` (boolean)
  - `membership_fee_paid_at` (timestamp)
  - `next_membership_renewal_date` (timestamp)
- Created automatic triggers for fee initialization and renewal

### 2. Frontend Components

#### For Members
- **`MembershipFeeManagement.tsx`** - Member dashboard showing:
  - Current fee status
  - Registration date
  - Next renewal date (calculated)
  - Payment history
  - Option to record payments

#### For Treasurers
- **`TreasurerMembershipFees.tsx`** - Admin dashboard showing:
  - Statistics (collected, pending, overdue)
  - All member fees in searchable table
  - Payment recording interface
  - CSV export functionality
  - Status filters

### 3. Custom Hooks
- **`useMembershipFees.ts`** - React hook for fee data management
  - Real-time updates
  - Fee status calculations
  - Color coding helpers

### 4. Updated Components
- **`MembershipForm.tsx`** - Now displays fee information upon registration

---

## How Billing Works

### Registration (Day 1)
```
Member registers
    ↓
Profile created
    ↓
Trigger fires automatically
    ↓
Initial fee created (KES 200, Status: PENDING)
    ↓
Next renewal date set (registration date + 1 year)
```

### Payment Recording
```
Treasurer accesses Membership Fees
    ↓
Selects pending fee
    ↓
Enters payment reference (M-Pesa ID, check #, etc.)
    ↓
Confirms payment
    ↓
Fee marked as PAID
    ↓
Profile updated (if initial fee)
```

### Annual Renewal (Year 2+)
```
Registration anniversary date reached
    ↓
Renewal fee automatically created (KES 200, Status: PENDING)
    ↓
Member notified
    ↓
Treasurer records payment (same process as above)
```

---

## Member View

### In Member Dashboard
Members can see:
- **Membership Fee**: KES 200 (annual)
- **Registration Date**: When they joined
- **Next Renewal**: Date + countdown ("In X days")
- **Total Paid**: Sum of all paid fees
- **Payment History**: Table showing all fees with status

### In Payment Dialog
Members can:
- Record their own payment
- Enter payment reference
- Add optional notes
- Instant confirmation

---

## Treasurer View

### Dashboard Statistics
- **Outstanding**: Total pending amount
- **Collected**: Total paid amount
- **Overdue**: Count of past-due fees
- **Total Members**: Number of fee records

### Fee Management Table
Shows per member:
- Member name & email
- Fee type (Initial/Renewal)
- Amount (KES 200)
- Due date
- Status badge (Pending/Paid/Overdue)
- Paid date (if applicable)
- Payment reference
- Quick action button

### Filtering & Reporting
- Filter by status (Pending, Paid, Overdue, Cancelled)
- Filter by type (Initial, Renewal)
- Export to CSV for reports
- Real-time updates

---

## Status Definitions

| Status | Meaning | Next Action |
|--------|---------|------------|
| **Pending** | Due but not paid | Record payment or follow up |
| **Paid** | Payment recorded | None needed |
| **Overdue** | Past due date, not paid | Send reminder/follow up |
| **Cancelled** | Fee cancelled | None |

---

## Technical Details

### Automatic Trigger
When a new member profile is created:
1. `initialize_membership_fee()` function runs
2. Creates membership_fees record
3. Sets next_membership_renewal_date = joined_at + 1 year

### Real-time Updates
- Components use Supabase real-time subscriptions
- Changes appear instantly in all open tabs
- No page refresh needed

### Security
- Row Level Security (RLS) implemented
- Members only see their own fees
- Treasurers can see all fees
- Admins have full access

---

## Integration Points

### New Dashboard Pages/Sections

#### Member Dashboard
```
Dashboard → Settings/Account → Membership Fees
  - Show MembershipFeeManagement component
```

#### Treasurer Dashboard
```
Dashboard → Finances/Membership → All Membership Fees
  - Show TreasurerMembershipFees component
```

### API Endpoints Used
- `supabase.from('membership_fees').select()`
- `supabase.from('membership_fees').update()`
- `supabase.from('profiles').update()`

---

## Payment Flow Example

**Scenario**: John registers on January 15, 2026

```
JAN 15, 2026
├─ John completes registration
├─ Profile created automatically
├─ Initial fee generated: KES 200, Status: PENDING
└─ Renewal date set: JAN 15, 2027

JAN 20, 2026
├─ John records payment via dashboard
├─ Reference: "MPESA123456"
├─ Fee updated: Status: PAID, paid_at: Jan 20
└─ Member sees: "Payment received - Thank you"

JAN 15, 2027
├─ Renewal date automatic reached
├─ Renewal fee generated: KES 200, Status: PENDING
├─ Member notified via email (optional)
└─ Renewal date updated: JAN 15, 2028

JAN 22, 2027
├─ Treasurer records renewal payment
├─ Reference: "MPESA654321"
├─ Fee updated: Status: PAID
└─ Cycle continues annually
```

---

## Key Features

✅ **Automatic**: No manual fee creation needed after registration
✅ **Accurate**: Renewal dates calculated automatically
✅ **Flexible**: Treasurers can record any payment method
✅ **Transparent**: Members see complete fee history
✅ **Reportable**: Export fees for accounting
✅ **Real-time**: Live updates across all views
✅ **Auditable**: Full payment reference trail

---

## Member Communication

### Upon Registration
**Message**: "Welcome! A membership fee of KES 200 will be billed annually."

### Before Renewal
**Recommendation**: Send email "Your membership renewal (KES 200) is due on [DATE]"

### Payment Confirmation
**Message**: "Thank you! Your membership fee payment has been recorded."

---

## Treasurer Actions

### Daily
- Check pending fees
- Record received payments
- Follow up on overdue fees

### Monthly
- Generate fee report
- Identify non-payers
- Send reminders

### Annually
- Review total collected
- Verify renewal accuracy
- Plan budgets based on collection

---

## Customization

### To Change Fee Amount
Edit migration file (before deployment):
```sql
membership_fee_amount DECIMAL(10,2) DEFAULT 200  -- Change 200 to new amount
```

### To Change Renewal Frequency
Edit trigger function in migration:
```sql
NEW.next_membership_renewal_date := NEW.joined_at + INTERVAL '1 year';
-- Change '1 year' to desired interval
```

### To Add Additional Fees
- Create new records in `membership_fees`
- Use same payment recording workflow
- Can set different amounts if needed

---

## Database Queries (for admins)

### View all pending fees
```sql
SELECT * FROM membership_fees WHERE status = 'pending';
```

### Calculate total outstanding
```sql
SELECT SUM(amount) FROM membership_fees WHERE status = 'pending';
```

### Find overdue fees
```sql
SELECT * FROM membership_fees 
WHERE status = 'pending' AND due_date < CURRENT_DATE;
```

### Member fee history
```sql
SELECT * FROM membership_fees 
WHERE member_id = 'member-uuid'
ORDER BY created_at DESC;
```

---

## Files Modified/Created

### Database
- ✅ `migrations/20260117_add_membership_fees.sql` - New migration

### Components
- ✅ `components/dashboard/MembershipFeeManagement.tsx` - Member view
- ✅ `components/dashboard/TreasurerMembershipFees.tsx` - Treasurer view
- ✅ `components/MembershipForm.tsx` - Updated with fee info

### Hooks
- ✅ `hooks/useMembershipFees.ts` - Fee data management

### Documentation
- ✅ `MEMBERSHIP_FEE_SYSTEM.md` - Full documentation
- ✅ `MEMBERSHIP_FEE_QUICK_REFERENCE.md` - This file

---

## Next Steps

### To Deploy
1. Apply database migration
2. Add components to dashboard routes
3. Update navigation menus
4. Test with sandbox members

### To Enhance
1. Add automated email reminders
2. Implement payment method selection
3. Add partial payment tracking
4. Create suspension rules for non-payers

---

## Support

For questions about:
- **Member fees**: Contact Treasurer
- **System setup**: Contact Administrator
- **Payment processing**: Check with Finance team

---

**System Status**: ✅ Ready for deployment
**Last Updated**: January 17, 2026
**Version**: 1.0
