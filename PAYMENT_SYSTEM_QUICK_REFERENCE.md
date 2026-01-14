# PAYMENT SYSTEM - QUICK REFERENCE GUIDE

## 📊 Payment Dashboard

**Location:** `/dashboard/payments`

### What it shows:
- ✅ **Total Due** - Sum of all pending obligations
- ✅ **Total Paid** - Sum of all confirmed payments
- ✅ **Pending Count** - How many obligations await payment
- ✅ **Payment Rate** - Percentage of obligations paid

### Payment Obligations Tab
- Lists all pending payments with:
  - Amount due
  - Payment type (Regular / Event / Penalty)
  - Due date with countdown
  - Overdue indicator (red if past due)
  - [PAY NOW] button

### Payment History Tab
- Shows all confirmed payments with:
  - Payment method (M-Pesa / Bank / Cash)
  - Reference ID
  - Amount
  - Date
  - Status badge

---

## 💳 M-Pesa Payment Flow

### Step 1: Click [PAY NOW]
```
Opens payment dialog with obligation details
```

### Step 2: Select M-Pesa
```
Shows M-Pesa form with:
- Phone number input (masked for privacy)
- Eye icon to show/hide
- Validation feedback
```

### Step 3: Enter Details
```
Phone: +254700000000 (Kenyan format)
Amount: Auto-filled from obligation
Reference: Generated automatically
```

### Step 4: Click [Pay KES X,XXX]
```
Status changes to "Processing"
Countdown timer: 30 seconds
```

### Step 5: M-Pesa Prompt Arrives
```
On member's phone:
1. STK popup appears
2. Member enters M-Pesa PIN
3. Payment processes
4. M-Pesa confirmation received
```

### Step 6: Success Screen
```
✓ Payment Successful
Reference ID displayed
Receipt available
Can view payment history
```

---

## 🏦 Bank Transfer Flow

### Step 1: Click [PAY NOW]
```
Opens payment dialog
```

### Step 2: Select Bank Transfer
```
Shows form with:
- Bank Name (e.g., KCB, Equity)
- Account Number
- Account Holder Name
```

### Step 3: Complete Transfer
```
Transfer details:
- To: Turuturu Stars CBO
- Amount: KES X,XXX
- Reference: PAY-XXXX-XXXX (shown in app)
```

### Step 4: Upload Proof
```
Upload screenshot/PDF showing:
- Your bank transfer
- Amount
- Reference ID
- Timestamp
```

### Step 5: Treasurer Verification
```
Status: PENDING
Treasurer receives notification
Reviews proof and confirms within 24 hours
```

### Step 6: Confirmation
```
Treasurer approves
Payment marked as CONFIRMED
Receipt generated
Money reflected in account
```

---

## 💵 Cash Payment Flow

### Step 1: Click [PAY NOW]
```
Opens payment dialog
```

### Step 2: Select Cash
```
Shows instructions:
- Contact Treasurer: treasurer@turuturustars.org
- Reference ID to mention
- Payment amount
```

### Step 3: Contact Treasurer
```
Email or call to arrange:
- Pickup from treasurer
- Payment delivery location
- Preferred date/time
```

### Step 4: Make Payment
```
Pay exact amount in person
Hand reference ID to treasurer
Get receipt immediately
```

### Step 5: System Update
```
Treasurer records payment
Status: CONFIRMED
Receipt issued
Payment reflected in dashboard
```

---

## 📱 Payment Methods Comparison

| Feature | M-Pesa | Bank | Cash |
|---------|--------|------|------|
| Speed | Instant | 2-3 hours | Immediate |
| Reference | Auto-generated | Manual + upload | In-person |
| Verification | Automatic | Treasurer | Treasurer |
| Receipt | Instant | Instant | In-person |
| Best for | Quick payments | Large amounts | Preferring cash |

---

## 🔔 Payment Statuses

| Status | Meaning | Duration | Action |
|--------|---------|----------|--------|
| **PENDING** | Obligation created, waiting | Until you pay | Click [PAY NOW] |
| **INITIATED** | You started payment | A few seconds | Wait for prompt |
| **RECEIVED** | System got confirmation | 1-24 hours | Wait for auto-confirm or treasurer |
| **CONFIRMED** | Payment verified | Final ✓ | View receipt |
| **REJECTED** | Payment invalid | Awaiting retry | Try payment again |
| **REFUNDED** | Payment reversed | Final | Check your account |

---

## 💡 Key Features

### 1. **Reference IDs**
```
Format: PAY-1736854320-A7F9K2M1X
Auto-generated on payment initiation
Used to match payments across methods
Never expires
Tracked in audit log
```

### 2. **Phone Masking**
```
Your phone number is protected:
Display: +254 7XX XXX ***
Shows only last 4 digits
Click eye icon to reveal when entering PIN
```

### 3. **Overdue Tracking**
```
Days until due: GREEN (>3 days)
Days until due: YELLOW (≤3 days)
Days past due: RED (overdue)
Penalties may apply if overdue
```

### 4. **Amount Validation**
```
Minimum: KES 1
Maximum: KES 150,000
Must be whole number (no cents)
Range check: 1-150,000
```

### 5. **Receipt Generation**
```
Generated after payment confirmed
Shows:
  - Receipt Number
  - Date & Time
  - Member details
  - Payment amount
  - Reference ID
  - Payment method
Downloadable as text file
```

---

## ⚙️ Payment Settings

### As a Member:

**Notification Preferences:**
- Go to: Dashboard → Settings → Notifications
- Enable/disable:
  - Payment reminders
  - Due date alerts
  - Overdue warnings
  - Confirmation receipts

**Payment History:**
- View all your payments
- Filter by date range
- Filter by payment method
- Download receipt (any time)

---

## ❌ Common Issues & Solutions

### M-Pesa: STK Not Arriving

**Check:**
1. Phone number format correct (+254 7XX XXX XXX)
2. M-Pesa account active & has credit
3. Phone has signal/network
4. Try waiting 1-2 minutes

**Solutions:**
1. Retry initiation
2. Try bank transfer instead
3. Try cash payment
4. Contact treasurer

---

### Bank: Payment Stuck as "Pending"

**Check:**
1. Did you send exact amount?
2. Did you include reference ID?
3. Did you upload proof?
4. Is treasurer notified?

**Solutions:**
1. Check if treasurer got notification
2. Upload clearer proof image
3. Contact treasurer directly
4. Wait up to 24 hours

---

### Cash: Can't Reach Treasurer

**Solutions:**
1. Email: treasurer@turuturustars.org
2. Call/WhatsApp: [Treasurer's number]
3. Contact admin for help
4. Come to office: [Location]

---

## 🎯 Payment Tips

✅ **DO:**
- Review obligation amount before paying
- Keep your reference ID safe
- Note payment method used
- Check receipt after payment
- Contact treasurer if any issues
- Pay before due date (avoid penalties)

❌ **DON'T:**
- Share M-Pesa PIN with anyone
- Pay different amount (unless agreed)
- Lose reference ID (keep copy)
- Try duplicate payments
- Ignore overdue warnings

---

## 📞 Need Help?

### For M-Pesa Issues:
- M-Pesa Support: *344# (Free)
- Check balance: *156#
- Reset PIN: Safaricom shop

### For Bank Issues:
- Contact your bank directly
- Have reference ID ready
- Show bank transfer proof

### For Payment App Issues:
- Treasurer: treasurer@turuturustars.org
- Admin: admin@turuturustars.org
- Support: support@turuturustars.org

---

## 🔒 Security Notes

✓ Your data is encrypted (SSL)  
✓ Phone numbers are masked  
✓ Payment records are permanent  
✓ No data is ever deleted  
✓ All actions are logged  
✓ Only you see your payments  
✓ Treasurers can't delete records  

---

## 📊 Payment Analytics (Admin)

Admins can view:
- Daily/Monthly payment totals
- Per-member payment history
- Outstanding balances
- Pending manual verifications
- Welfare fund collections
- Payment method breakdown
- Overdue member list

---

**Last Updated:** January 14, 2026  
**Version:** 1.0  
**Support:** treasurer@turuturustars.org
