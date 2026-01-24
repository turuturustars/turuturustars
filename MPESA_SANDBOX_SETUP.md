# M-Pesa Sandbox 3.0 Setup Guide

## Credentials Configuration

### Environment Variables Added
The following credentials have been added to `.env` and `.env.production`:

```env
# M-Pesa Sandbox Credentials
MPESA_CONSUMER_KEY=8yPjo6aJ2JCGV8e155feDHr9YPPpr4x6qogq90WVrTz4HR7K
MPESA_CONSUMER_SECRET=F3DBJSi4ciFAPOfADrx3ishO4SyUymooFF3J7xRHYv0EAOROQ5xzaU3OD5f6ADJg
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9a9182b6bca9d7f13458b6662
```

### Supabase Secrets
You also need to update these secrets in your Supabase dashboard (Settings → Secrets):

1. **MPESA_CONSUMER_KEY**: `8yPjo6aJ2JCGV8e155feDHr9YPPpr4x6qogq90WVrTz4HR7K`
2. **MPESA_CONSUMER_SECRET**: `F3DBJSi4ciFAPOfADrx3ishO4SyUymooFF3J7xRHYv0EAOROQ5xzaU3OD5f6ADJg`
3. **MPESA_SHORTCODE**: `174379`
4. **MPESA_PASSKEY**: `bfb279f9a9182b6bca9d7f13458b6662`

## Configuration Details

- **Base URL**: `https://sandbox.safaricom.co.ke` (automatically configured)
- **Shortcode**: 174379 (test shortcode for sandbox)
- **Passkey**: bfb279f9a9182b6bca9d7f13458b6662 (test passkey for sandbox)

## Testing the Integration

### Local Testing
1. Ensure `.env` has all credentials (already added)
2. Start Supabase local: `supabase start`
3. Run dev server: `npm run dev`
4. Test M-Pesa payment flow

### Production Testing
1. Update secrets in Supabase dashboard
2. Redeploy Edge Functions
3. Test payment initiation

## Troubleshooting

If you still get "Wrong credentials" error:

1. **Check console logs**: The Edge Function now logs detailed errors
2. **Verify credentials**: Ensure both .env AND Supabase secrets are updated
3. **Restart services**: 
   - Stop/start the dev server
   - Redeploy Supabase functions
4. **Check auth token**: Monitor function logs for "Access token obtained successfully" message

## File Updates Made

- ✅ `.env` - Added M-Pesa credentials
- ✅ `.env.production` - Added M-Pesa credentials  
- ✅ `supabase/functions/mpesa/index.ts` - Enhanced error logging in getAccessToken()

## Next Steps

1. Update Supabase secrets in dashboard with the credentials above
2. Redeploy the mpesa edge function
3. Test the payment flow
4. Monitor browser console and Supabase logs for any errors
