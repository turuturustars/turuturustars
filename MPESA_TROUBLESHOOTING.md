# M-Pesa "Wrong Credentials" Error Troubleshooting

## Error: `500.001.1001 - Wrong credentials`

This error means M-Pesa is rejecting the authentication attempt. Here's how to fix it:

## Checklist

### ✅ Step 1: Verify Environment Variables in .env
Run this command to check your .env has the credentials:
```bash
cat .env | grep MPESA
```

Should show:
```
MPESA_CONSUMER_KEY=8yPjo6aJ2JCGV8e155feDHr9YPPpr4x6qogq90WVrTz4HR7K
MPESA_CONSUMER_SECRET=F3DBJSi4ciFAPOfADrx3ishO4SyUymooFF3J7xRHYv0EAOROQ5xzaU3OD5f6ADJg
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9a9182b6bca9d7f13458b6662
```

### ✅ Step 2: Update Supabase Secrets (CRITICAL)

Go to: **Supabase Dashboard → Your Project → Settings → Secrets**

Add or update these 4 secrets:

| Secret Name | Value |
|---|---|
| `MPESA_CONSUMER_KEY` | `8yPjo6aJ2JCGV8e155feDHr9YPPpr4x6qogq90WVrTz4HR7K` |
| `MPESA_CONSUMER_SECRET` | `F3DBJSi4ciFAPOfADrx3ishO4SyUymooFF3J7xRHYv0EAOROQ5xzaU3OD5f6ADJg` |
| `MPESA_SHORTCODE` | `174379` |
| `MPESA_PASSKEY` | `bfb279f9a9182b6bca9d7f13458b6662` |

**IMPORTANT**: Click "Save" after adding each secret.

### ✅ Step 3: Redeploy the Edge Function

Option A - Via Supabase Dashboard:
1. Go to **Functions → mpesa**
2. Click **Deploy** button
3. Wait for deployment to complete

Option B - Via CLI:
```bash
supabase functions deploy mpesa
```

### ✅ Step 4: Check Function Logs

After redeploying, go back to the page and try payment again.

Check logs at: **Supabase Dashboard → Functions → mpesa → Logs**

You should see:
```
M-Pesa Credentials Loaded:
- MPESA_CONSUMER_KEY: 8yPjo6aJ2JC...
- MPESA_CONSUMER_SECRET: F3DBJSi4ciF...
- MPESA_SHORTCODE: 174379
- MPESA_PASSKEY: bfb279f9...
- MPESA_BASE_URL: https://sandbox.safaricom.co.ke

Fetching M-Pesa access token...
- Using Consumer Key: 8yPjo6aJ2JCG...
- Credentials base64: ODyUam...

✓ Access token obtained successfully
```

If you see "Failed to obtain M-Pesa access token", the credentials are wrong.

### ✅ Step 5: Verify Credentials Format

Make sure credentials have NO extra spaces or quotes:
- ✅ CORRECT: `8yPjo6aJ2JCGV8e155feDHr9YPPpr4x6qogq90WVrTz4HR7K`
- ❌ WRONG: `"8yPjo6aJ2JCGV8e155feDHr9YPPpr4x6qogq90WVrTz4HR7K"` (has quotes)
- ❌ WRONG: `8yPjo6aJ2JCGV8e155feDHr9YPPpr4x6qogq90WVrTz4HR7K ` (has space)

## Testing Flow

1. **Credentials in .env** → Works for local testing with Supabase emulator
2. **Secrets in Supabase Dashboard** → Works for production and cloud functions
3. **Both updated** → Works everywhere

## If Still Getting Wrong Credentials Error

Try these additional steps:

### Check if Function is Using Old Code
```bash
supabase functions download mpesa
# Check if the downloaded file has the latest logging
```

### Clear Browser Cache
```bash
# Hard refresh browser
Ctrl+Shift+R  # Windows/Linux
Cmd+Shift+R   # Mac
```

### Test with Curl (if using local Supabase)
```bash
curl -X POST http://localhost:54321/functions/v1/mpesa \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stk_push",
    "phoneNumber": "254712345678",
    "amount": 100
  }'
```

### Check Supabase Logs
```bash
supabase functions list
supabase functions logs mpesa
```

## Expected Success Flow

Once credentials are correct, you should see:
1. ✓ Access token obtained
2. ✓ STK Push request sent to M-Pesa
3. ✓ M-Pesa returns CheckoutRequestID
4. ✓ Browser shows "Payment Initiated"
5. ✓ Phone receives M-Pesa prompt

## Sandbox Test Phone Numbers

For testing M-Pesa sandbox:
- **Phone**: `254708374149` or `254712345678`
- These are test numbers that will show M-Pesa prompt
