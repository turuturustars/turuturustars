# M-Pesa CBO Contribution Payments Setup

This setup adds a full STK + Till payment workflow with callback audit logging and treasurer approvals.

## 1) Required Secrets / Env Variables

Set these in Supabase Edge Function secrets (and local `.env` for local testing):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL`
- `MPESA_BASE_URL` (set `https://sandbox.safaricom.co.ke` for sandbox)

Optional hardening / extensions:

- `MPESA_CALLBACK_SIGNATURE_SECRET` (enables callback signature verification)
- `MPESA_PULL_VERIFICATION_URL` (optional external pull verification endpoint for till receipts)

## 2) Apply DB Migration

```bash
supabase db push
```

This migration creates:

- `payments`
- `till_submissions`
- `approvals`
- `mpesa_callback_audit`

It also adds:

- RLS policies for members and admin/treasurer finance access
- Replay protection (unique receipt and checkout request IDs)
- Completed payment immutability trigger

## 3) Deploy Edge Functions

```bash
supabase functions deploy stk-push
supabase functions deploy stk-callback
supabase functions deploy till-submit
supabase functions deploy verify-till
supabase functions deploy approve-payment
supabase functions deploy mpesa-confirmation
supabase functions deploy mpesa-validation
```

## 4) Register Daraja Callback URLs

For STK Push callbacks, Daraja should call:

- `MPESA_CALLBACK_URL` -> `/functions/v1/stk-callback`

For C2B flow (Till confirmations):

- Confirmation URL -> `/functions/v1/mpesa-confirmation`
- Validation URL -> `/functions/v1/mpesa-validation`

## 5) Frontend Integration

The dashboard payments page now includes:

- Member STK push form
- Manual till submission form
- Auto-verification feedback
- Treasurer approval queue (for treasurer/admin)

Main files:

- `src/lib/mpesaContributionsApi.ts`
- `src/components/payment/CboMpesaMemberPanel.tsx`
- `src/components/payment/CboTreasurerApprovalPanel.tsx`
- `src/components/payment/CboMpesaWorkspace.tsx`
- `src/pages/dashboard/PaymentsManagement.tsx`

## 6) Minimal Verification Test Plan

1. Member triggers STK push and approves on phone.
2. Confirm `payments.status` changes `pending -> completed` via callback.
3. Submit a till receipt in the member form.
4. If receipt appears in callback audit, payment should be created as `awaiting_approval`.
5. Treasurer approves/rejects from approval tab.
6. Confirm `approvals` row exists and payment final status is immutable after `completed`.

## 7) Inline Function Tests

Run shared helper tests locally:

```bash
deno test supabase/functions/_shared/mpesa.test.ts
```
