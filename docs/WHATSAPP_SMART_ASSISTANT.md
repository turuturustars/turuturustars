# WhatsApp Smart Assistant

The `whatsapp-bot` Supabase Edge Function turns the Turuturu Stars WhatsApp number into a registered-member assistant.

It can:

- Verify Meta WhatsApp webhook setup requests.
- Accept WhatsApp Cloud API inbound messages.
- Match the sender phone number against `profiles.phone`.
- Greet registered members by name when the number is recognized.
- Ask registered members to rate the chat with emoji choices `😍 😊 😐 🙁 😡` and store those ratings.
- Guide unknown numbers through a registration-interest flow:
  confirm the WhatsApp number, collect email, send an email OTP, and store the verified request.
- Understand natural English, Kiswahili, and mixed Kenyan phrasing.
- Answer member queries about profile status, contributions, wallet balance, announcements, meetings, and welfare cases.
- Record member transaction/contribution notices as `contributions.status = pending`.
- Let treasurers/admins record expenditures as `expenditures.status = pending_approval`.
- Unlock official/admin actions by the registered sender number and roles, including creating welfare cases.
- Keep an audit trail in `whatsapp_sessions`, `whatsapp_messages`, and `whatsapp_actions`.
- Keep service feedback in `whatsapp_conversation_ratings`.
- Keep registration leads in `whatsapp_registration_requests` for admin review or conversion.

## Required Secrets

Set these Supabase Edge Function secrets:

```bash
supabase secrets set WHATSAPP_VERIFY_TOKEN="long-random-token"
supabase secrets set WHATSAPP_ACCESS_TOKEN="meta-cloud-api-token"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="meta-phone-number-id"
supabase secrets set WHATSAPP_REGISTRATION_OTP_PEPPER="long-random-otp-pepper"
supabase secrets set WHATSAPP_NOTIFICATIONS_JOB_SECRET="long-random-job-secret"
supabase secrets set BREVO_API_KEY="brevo-api-key" BREVO_SENDER_EMAIL="support@turuturustars.co.ke"
```

Recommended:

```bash
supabase secrets set WHATSAPP_APP_SECRET="meta-app-secret"
supabase secrets set WHATSAPP_ABANDONMENT_MINUTES="3"
```

Optional AI intent extraction:

```bash
supabase secrets set OPENAI_API_KEY="openai-api-key"
supabase secrets set OPENAI_MODEL="gpt-4o-mini"
```

Without `OPENAI_API_KEY`, the function still works using the local English/Kiswahili parser.

## Meta Webhook

Deploy the function, then set this callback URL in the Meta WhatsApp app:

```text
https://<project-ref>.functions.supabase.co/whatsapp-bot
```

Use the same `WHATSAPP_VERIFY_TOKEN` as the Meta verify token.

Subscribe to the WhatsApp `messages` webhook field.

## Example Messages

Members can write naturally:

```text
Niko na deni gani?
Nimelipa 500 welfare ref QJD123ABC
Record transaction 1000 membership fee ref QJD123ABC
Wallet balance?
Matangazo mapya?
Mkutano ujao ni lini?
```

Officials/admins get role-aware actions from the registered phone number:

```text
Add welfare case medical for Mary target 20000
Open welfare case for TS-00034 school fees target 15000
Record expense 1200 fare to Nyeri ref BUS12
Tumetumia 3500 kununua stationery kwa office
```

Contribution records created from WhatsApp are pending until finance verifies them. Expenditures created from WhatsApp remain pending approval through the normal governance workflow. Welfare cases created from WhatsApp are opened as active cases and linked to the official who created them.

Unknown numbers are not allowed into member-priority actions. They are prompted to reply `REGISTER`, confirm the number they are messaging from, provide an email, then reply with the OTP sent to that email. Verified requests stay locked out of member features until an admin approves or converts the registration.

After registered-member replies, the assistant appends:

```text
Rate this chat: 😍 😊 😐 🙁 😡
```

When the member replies with one of those emojis, the rating is saved and the bot sends a short thank-you without starting a new command.

## Conversation Pauses

When the assistant is waiting for a reply, such as registration OTP, missing transaction amount, or welfare case title, it marks the session as awaiting response. The `whatsapp-notification-worker` job also checks those sessions. If the user has not replied after `WHATSAPP_ABANDONMENT_MINUTES` minutes, default `3`, it sends one warm pause message with a day/evening/night wish and stops nudging.

Run the `whatsapp-notification-worker` job frequently with `WHATSAPP_NOTIFICATIONS_JOB_SECRET`. The same worker still processes queued WhatsApp notifications. The included GitHub workflow runs it every 5 minutes; use Supabase Scheduled Functions or another scheduler at about 1-minute frequency when you need the pause message to land as close as possible to the 3-minute mark.

When the user comes back, the bot recognizes the paused session and sends a varied welcome-back message that mentions where the conversation stopped before continuing with the new message.
