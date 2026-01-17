# Welfare Transaction Management System

## Overview

This document outlines the complete welfare transaction management system that allows treasury officials (admin, treasurer, chairperson) to manage welfare case contributions, refunds, and payment tracking.

## Features

### 1. **Transaction Management Interface**
- **Location**: `/dashboard/members/welfare-management`
- **Access**: Admin, Treasurer, Chairperson roles only
- **Features**:
  - View all active welfare cases in a sidebar
  - Select a case to view detailed transaction history
  - Add new contributions or refunds
  - Remove mistaken transactions
  - Record M-Pesa payment codes
  - Track collected vs. target amounts

### 2. **Permission-Based Controls**

The system uses three primary permissions defined in `rolePermissions.ts`:

```typescript
- 'manage_welfare_transactions'  // View and manage all welfare contributions
- 'refund_welfare'               // Issue refunds for contributions
- 'record_welfare_payment'       // Record M-Pesa payments manually
```

**Roles with permissions:**
- **Admin**: All 3 permissions
- **Chairperson**: All 3 permissions
- **Treasurer**: All 3 permissions
- **Secretary/Patron**: Can create/manage welfare but NOT transaction controls
- **Members**: Can view own welfare cases only

### 3. **Transaction Types**

#### Contribution
- Records money received for a welfare case
- Increases the `collected_amount` field
- Can be linked to M-Pesa unique code (e.g., "LIL51IRF52")
- Optional notes for additional context

#### Refund
- Records money returned to a member
- Decreases the `collected_amount` field
- Requires `refund_welfare` permission
- Typically includes reason in notes

### 4. **Key Features**

#### Add Transaction
1. Select a welfare case from the sidebar
2. Click "Record Transaction" button
3. Choose transaction type (Contribution/Refund)
4. Enter amount in KES
5. (Optional) Enter M-Pesa unique code
6. (Optional) Add notes
7. Submit to record

#### Remove Transaction
1. Select a welfare case
2. View transaction in history
3. Click "Show Details" to expand
4. Click "Remove Transaction" (red button)
5. Confirm deletion
6. Transaction is removed and amount is reversed in case total

#### M-Pesa Code Entry
- Format: Alphanumeric transaction ID from M-Pesa (e.g., "LIL51IRF52")
- Used to track manual payment entries
- Helps correlate with M-Pesa statements
- Optional field - not required for all transactions

### 5. **Financial Summary**

Each welfare case displays:
- **Collected**: Amount successfully received
- **Target**: Goal amount for the case
- **Remaining**: Amount still needed
- **Progress**: Visual bar showing percentage funded

### 6. **Database Schema**

#### welfare_transactions table
```sql
- id: UUID (primary key)
- welfare_case_id: UUID (references welfare_cases)
- amount: Numeric (12,2) - Amount in KES
- transaction_type: Text ('contribution' | 'refund')
- mpesa_code: Text (nullable) - M-Pesa unique ID
- recorded_by_id: UUID - User who recorded transaction
- notes: Text (nullable) - Additional context
- status: Text - 'completed', 'pending', 'failed'
- created_at: Timestamp - When transaction was recorded
- updated_at: Timestamp - When last updated
```

#### Indexes
- `welfare_case_id` - Fast lookup by case
- `recorded_by_id` - Track who made changes
- `created_at` - Time-based queries

#### Row Level Security (RLS)
- All authenticated users can VIEW transactions
- Only admin/chairperson/treasurer can INSERT transactions
- Only admin/chairperson/treasurer can DELETE transactions

### 7. **Use Cases**

#### Scenario 1: Recording a Contribution
1. Member makes M-Pesa payment to group account
2. Treasurer opens Welfare Management
3. Selects the welfare case (e.g., "Bereavement - John's Father")
4. Enters amount: 5000 KES
5. Enters M-Pesa code: "LIL51IRF52"
6. Adds note: "Received from M-Pesa on Jan 24"
7. System updates case: collected_amount increases by 5000

#### Scenario 2: Recording a Manual Payment
1. Member wants to contribute but didn't use M-Pesa
2. Treasurer records contribution
3. Enters amount: 3000 KES
4. Leaves M-Pesa code blank
5. Adds note: "Cash payment from member during meeting"
6. System records transaction without M-Pesa code

#### Scenario 3: Fixing a Mistake
1. Treasurer accidentally recorded 5000 as 50000
2. Opens transaction detail
3. Clicks "Remove Transaction"
4. Confirms deletion
5. System reverses the incorrect entry
6. Treasurer re-enters correct amount: 5000

#### Scenario 4: Issuing a Refund
1. Beneficiary received more than needed for medical case
2. Chairperson opens Welfare Management
3. Selects the case
4. Clicks "Record Transaction"
5. Selects "Refund" type
6. Enters refund amount: 2000 KES
7. Adds note: "Excess funds returned - medical case resolved"
8. System decreases collected_amount by 2000

### 8. **Component Structure**

**File**: `src/pages/dashboard/WelfareManagement.tsx`

Key sections:
- **Cases List Panel**: Sidebar showing all active welfare cases
- **Case Details Panel**: Full information about selected case
- **Financial Summary**: Collected vs. Target breakdown
- **Record Transaction Dialog**: Form to add contributions/refunds
- **Transaction History**: List of all transactions with expand/collapse

**Component Props**:
- Uses `useAuth()` hook for user context
- Uses `hasPermission()` for authorization checks
- Queries Supabase for cases and transactions
- Real-time updates using Supabase subscriptions

### 9. **Hook: useWelfareTransactions**

Located: `src/hooks/useWelfareTransactions.ts`

Methods:
```typescript
const {
  transactions,        // Array of transactions for case
  isLoading,          // Loading state
  fetchTransactions,  // Refresh transactions
  addTransaction,     // Record new transaction
  removeTransaction,  // Delete transaction
} = useWelfareTransactions(caseId);
```

### 10. **Audit Trail**

Every transaction records:
- **Who**: `recorded_by_id` tracks the official who made the entry
- **When**: `created_at` timestamp shows when recorded
- **What**: Transaction type, amount, and M-Pesa code
- **Why**: Notes field for context

This enables full audit compliance for financial accountability.

### 11. **Permissions Flow**

```
User
  ├─ Has role (admin/treasurer/chairperson)
  │  ├─ Check hasPermission('manage_welfare_transactions')
  │  │  ├─ Can view transactions: ✓
  │  │  ├─ Can remove transactions: ✓
  │  │  └─ Can see refund button: ✓
  │  ├─ Check hasPermission('refund_welfare')
  │  │  └─ Can select "Refund" type: ✓
  │  └─ Check hasPermission('record_welfare_payment')
  │     ├─ Can record payment: ✓
  │     └─ Can enter M-Pesa code: ✓
  └─ Other roles
     └─ No transaction management buttons shown
```

### 12. **Integration Points**

1. **DashboardSidebar.tsx**
   - Added navigation link for Treasurer, Chairperson, Admin
   - Link: `/dashboard/members/welfare-management`

2. **App.tsx**
   - Route: `/dashboard/members/welfare-management` → WelfareManagement
   - Lazy loaded for performance

3. **rolePermissions.ts**
   - Defined 3 new permission types
   - Assigned to appropriate roles
   - Used in hasPermission() checks

4. **Database**
   - New migration: `welfare_transactions` table
   - RLS policies for data security
   - Linked to `welfare_cases` table

### 13. **Error Handling**

- All database operations wrapped in try-catch
- User-friendly error messages via toast notifications
- Form validation before submission
- Confirmation dialogs for destructive operations

### 14. **UI/UX Features**

- **Case Selection**: Click to select, visual highlight
- **Progress Indicators**: Color-coded progress bars
- **Case Type Icons**: Visual identifiers (❤️ bereavement, 🏥 medical, 👥 education)
- **Expandable Details**: Show/hide additional context
- **Status Badges**: Color-coded status indicators
- **Responsive Design**: Works on mobile and desktop
- **Loading States**: Spinner during async operations

### 15. **Testing Checklist**

- [ ] Admin can access welfare management
- [ ] Treasurer can access welfare management
- [ ] Chairperson can access welfare management
- [ ] Secretary cannot access welfare management
- [ ] Can record contribution with M-Pesa code
- [ ] Can record contribution without M-Pesa code
- [ ] Can issue refund (if canRefund)
- [ ] Can remove transaction (if canManageTransactions)
- [ ] Transaction reverses collected amount correctly
- [ ] Case progress bar updates after transaction
- [ ] Historical transactions are sortable by date
- [ ] M-Pesa codes are visible in transaction list

### 16. **Future Enhancements**

- [ ] Bulk transaction import from M-Pesa statement
- [ ] Transaction status tracking (pending, completed, failed)
- [ ] Notification to member when contribution received
- [ ] Export transaction history to CSV
- [ ] Transaction search and filtering
- [ ] Refund approval workflow
- [ ] Transaction reconciliation with M-Pesa statements
- [ ] Monthly welfare distribution schedule
