-- Temporarily disable the SMS OTP gate for new email signups.
-- Phone numbers are still collected and normalized on profiles, but auth.users
-- inserts should no longer require a phone_verification_token.

drop trigger if exists on_auth_user_require_verified_phone on auth.users;

comment on function public.enforce_signup_phone_verification() is
  'SMS signup OTP enforcement is disabled by migration 20260516090000_disable_sms_signup_otp.sql.';
