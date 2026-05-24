-- Recover WhatsApp registrations that saved an email but stayed on the email
-- step because OTP delivery was unavailable. Email is optional, so these
-- members should continue into required profile details instead of getting
-- stuck.

WITH recovered AS (
  UPDATE public.whatsapp_registration_requests
     SET status = 'profile_started',
         email_verified_at = NULL,
         email_otp_hash = NULL,
         email_otp_expires_at = NULL,
         email_otp_attempts = 0,
         email_otp_sent_at = NULL,
         profile_progress = GREATEST(profile_progress, 20),
         notes = COALESCE(notes, '') ||
           CASE
             WHEN COALESCE(notes, '') = '' THEN ''
             ELSE E'\n'
           END ||
           'Recovered by migration: continued registration without blocking on email OTP.',
         updated_at = now()
   WHERE status = 'awaiting_email'
     AND email IS NOT NULL
     AND email_otp_hash IS NULL
  RETURNING whatsapp_phone, registration_phone, email
)
UPDATE public.whatsapp_sessions AS session
   SET state =
       COALESCE(session.state, '{}'::jsonb) ||
       jsonb_build_object(
         'registration',
         COALESCE(session.state -> 'registration', '{}'::jsonb) ||
         jsonb_build_object(
           'step', 'awaiting_profile_required',
           'registration_phone', recovered.registration_phone,
           'email', recovered.email,
           'updated_at', now()::text
         ),
         'updated_at', now()::text
       ),
       last_intent = 'registration',
       awaiting_response = true,
       awaiting_response_since = COALESCE(session.awaiting_response_since, now()),
       updated_at = now()
  FROM recovered
 WHERE session.phone = recovered.whatsapp_phone;
