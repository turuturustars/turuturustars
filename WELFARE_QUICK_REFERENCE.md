# Welfare Transaction Management - Quick Reference

## For Treasury Officials (Admin, Treasurer, Chairperson)

### Quick Access
1. Open Dashboard
2. Look for **"Welfare Management"** in your sidebar
3. Click to open transaction management interface

---

## Recording a Contribution

### Steps:
1. **Select Case**: Click a welfare case in the left sidebar
2. **Click Button**: "Record Transaction" button in case details
3. **Choose Type**: Select "Contribution" (default)
4. **Enter Amount**: Type amount in KES (e.g., 5000)
5. **Add M-Pesa Code** (Optional): Paste the M-Pesa transaction ID
   - Format: Usually 10 characters like "LIL51IRF52"
   - Where to find: Check M-Pesa confirmation message or statement
6. **Add Notes** (Optional): Context about the payment
   - Example: "Received from M-Pesa", "Cash during meeting", etc.
7. **Submit**: Click "Record Transaction"
8. **Verify**: Case total updates immediately

---

## Issuing a Refund

### Prerequisites:
- You must have **refund_welfare** permission
- Reason for refund (e.g., "Over-collected", "Case resolved")

### Steps:
1. **Select Case**: Choose the welfare case
2. **Click**: "Record Transaction"
3. **Select Type**: Click "Refund" button
4. **Enter Amount**: Refund amount in KES
5. **Add Notes**: Why the refund is being issued
6. **Submit**: Click "Record Transaction"
7. **Verify**: Collected amount decreases by refund amount

---

## Removing a Mistaken Transaction

### Scenario:
- You accidentally recorded 50000 instead of 5000
- Wrong M-Pesa code was entered
- Duplicate entry was made

### Steps:
1. **Find Transaction**: Locate it in the Transaction History section
2. **Click "Show Details"**: Expand to see full information
3. **Click Button**: Red "Remove Transaction" button
4. **Confirm**: Confirm you want to remove (cannot be undone)
5. **Verify**: Case total is adjusted back
6. **Re-record**: Enter the correct amount if needed

---

## Understanding the Dashboard

### Left Panel - Case List
- Shows all **active** welfare cases
- Click any case to view details
- Cases are clickable cards with:
  - Case type icon (❤️ bereavement, 🏥 medical, 👥 education, 💰 other)
  - Case title
  - Beneficiary name
  - Progress bar showing collection status

### Middle Panel - Case Details
When you select a case, you see:

#### Financial Summary Box (Blue)
- **Collected**: How much money is in this case
- **Target**: Goal amount for the case
- **Remaining**: Still need to collect
- **Progress Bar**: Visual percentage funded

#### Action Buttons
- **Record Transaction**: Add contribution, refund, or record payment

### Right Panel - Transaction History
Shows all contributions and refunds for the case:

**For Each Transaction:**
- Transaction icon (🔼 green for contribution, 🔄 orange for refund)
- Type: "Contribution" or "Refund"
- M-Pesa code badge (if present)
- Who recorded it
- When it was recorded
- Amount (green if contribution, orange if refund)
- Status badge

**Expandable Details:**
- Click "Show Details" to see M-Pesa code and notes
- "Remove Transaction" button appears (if authorized)

---

## Common Tasks & Solutions

### Task: Track M-Pesa Payments
**Solution:**
1. When member sends M-Pesa, they share code with you
2. Record as contribution with M-Pesa code
3. Notes can reference the member's name
4. System tracks the M-Pesa code for audit trail

### Task: Record Cash Contributions
**Solution:**
1. Record as contribution
2. Leave M-Pesa code blank
3. Add note: "Cash contribution from [name]"
4. Amount updates same as M-Pesa

### Task: Fix Over-Collection
**Solution:**
1. Case goal was 50,000 but you collected 55,000
2. Record refund of 5,000 with note "Excess funds - goal reached"
3. Remaining shows 0
4. Track who received the refund in notes

### Task: Handle Multiple Contributors
**Solution:**
1. Record each contribution separately
2. System automatically sums all contributions
3. Progress bar shows total collected
4. Each transaction is dated and attributed

### Task: Close Out a Case
**Solution:**
1. All refunds have been issued
2. Close case in main welfare page (different section)
3. Closed cases appear in separate list
4. Transaction history remains viewable

---

## Permissions You Should Have

### All Three Roles (Admin, Treasurer, Chairperson):
✅ **manage_welfare_transactions**
- View all welfare cases
- Add contributions
- Remove mistaken transactions

✅ **refund_welfare**
- Issue refunds to members
- Reverse contribution entries

✅ **record_welfare_payment**
- Record M-Pesa codes
- Enter manual payment information

---

## Important Notes

### What You CAN Do:
- ✅ Record contributions from any source
- ✅ Track M-Pesa unique codes
- ✅ Issue refunds to beneficiaries
- ✅ Remove transactions if incorrect
- ✅ See who recorded each transaction
- ✅ Add context notes for audit trail

### What You CANNOT Do:
- ❌ Change the beneficiary of a case
- ❌ Change the case title or type
- ❌ Delete entire welfare cases (use main welfare page)
- ❌ View other officials' passwords or personal data
- ❌ Alter transaction dates once recorded

### Audit Trail:
Every action creates a record showing:
- **WHO**: Your name (from recorded_by field)
- **WHAT**: Amount, type, M-Pesa code if provided
- **WHEN**: Exact timestamp
- **WHY**: Notes field provides context

---

## Troubleshooting

### Case Doesn't Appear in List
- **Check Status**: Only "active" cases show
- **Filter**: If case is closed, it's in different section
- **Refresh**: Reload page if newly created

### Transaction Shows Wrong Amount
- **Remove & Re-Record**: Use "Remove Transaction" then re-enter
- **Check Notes**: Click "Show Details" to verify what happened
- **Ask Owner**: See who recorded it and check their notes

### Can't Record Refund
- **Check Permission**: You may need "refund_welfare" permission
- **Contact Admin**: Ask admin to grant refund permission
- **Temporary**: Use contribution with negative value as workaround

### M-Pesa Code Not Showing
- **Re-check Details**: Click "Show Details" to expand
- **Check Format**: Code should be alphanumeric (LIL51IRF52)
- **Re-record**: May need to remove and record with code

---

## Keyboard Shortcuts
- **ESC**: Close transaction dialog
- **Tab**: Navigate between form fields
- **Enter**: Submit form (when focused on input)

---

## Getting Help

### For Technical Issues:
- Check that you're logged in
- Refresh page (F5)
- Check browser console for errors

### For Permission Issues:
- Confirm your role (Treasurer, Chairperson, Admin)
- Ask admin to verify permissions
- Check that "Welfare Management" link appears in sidebar

### For Data Questions:
- Click "Show Details" on any transaction for full information
- Check created date and recorded_by for who made the entry
- Review notes field for context

---

## Best Practices

1. **Always Add Notes**
   - Write what the contribution is for
   - Example: "M-Pesa from member, bereavement case"

2. **Record M-Pesa Codes**
   - Helps match with bank statements
   - Provides audit trail
   - Can be verified if disputes arise

3. **Catch Mistakes Early**
   - Review case after each transaction
   - Total should make sense
   - Remove immediately if wrong

4. **Regular Verification**
   - Weekly: Check cases are progressing toward target
   - Monthly: Reconcile with M-Pesa statements
   - Quarterly: Audit trail review

5. **Communication**
   - Notify member when contribution received
   - Inform when case goal is reached
   - Announce refunds or closures

---

## Summary

| Action | Who Can | Permission | How Long |
|--------|---------|-----------|----------|
| View Transactions | Admin, Treasurer, Chair | manage_welfare | Immediate |
| Record Contribution | Admin, Treasurer, Chair | record_welfare_payment | Immediate |
| Issue Refund | Admin, Treasurer, Chair | refund_welfare | Immediate |
| Remove Entry | Admin, Treasurer, Chair | manage_welfare | Immediate |
| See Transaction History | All authenticated users | None | Immediate |

---

**Last Updated**: January 2024
**Version**: 1.0
**Support**: Contact Admin for permission or technical issues
