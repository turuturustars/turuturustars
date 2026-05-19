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
- Offer an M-Pesa-style numbered menu while still accepting normal conversation.
- Answer member queries about profile status, contributions, wallet balance, receipts, notifications, jobs, announcements, meetings, kitties, refunds, voting status, and welfare cases.
- Start wallet top-ups by M-Pesa STK push using the main `wallets` and `wallet_transactions` ledger.
- Let members list active kitties and contribute to a kitty by M-Pesa or from their wallet.
- Record member transaction/contribution notices as `contributions.status = pending`.
- Let treasurers/admins record expenditures as `expenditures.status = pending_approval`.
- Unlock official/admin actions by the registered sender number and roles, including creating welfare cases.
- Answer trainable support questions from `ai_knowledge_base`, with optional Groq/OpenAI wording when configured.
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
supabase secrets set MPESA_CONSUMER_KEY="..." MPESA_CONSUMER_SECRET="..." MPESA_SHORTCODE="..." MPESA_PASSKEY="..." MPESA_BASE_URL="https://api.safaricom.co.ke"
supabase secrets set MPESA_CALLBACK_URL="https://<project-ref>.functions.supabase.co/functions/v1/mpesa-callback"
```

Optional AI intent extraction and knowledge replies:

```bash
supabase secrets set WHATSAPP_AI_PROVIDER="groq"
supabase secrets set GROQ_API_KEY="your-rotated-groq-api-key"
supabase secrets set WHATSAPP_AI_TIMEOUT_MS="8000"
supabase secrets set GROQ_REGISTRATION_MODEL="openai/gpt-oss-20b"
supabase secrets set GROQ_INTENT_MODEL="openai/gpt-oss-20b"
supabase secrets set GROQ_KNOWLEDGE_MODEL="openai/gpt-oss-120b"
```

The bot uses Groq automatically when `GROQ_API_KEY` is present. `GROQ_REGISTRATION_MODEL` and `GROQ_INTENT_MODEL` default to `openai/gpt-oss-20b` so classification can use structured JSON schema output; `GROQ_KNOWLEDGE_MODEL` defaults to `openai/gpt-oss-120b` for stronger member-facing wording. `WHATSAPP_AI_MODEL` or `GROQ_MODEL` can set one model for all AI tasks, but that disables the purpose-specific defaults.

You can still use OpenAI instead:

```bash
supabase secrets set WHATSAPP_AI_PROVIDER="openai"
supabase secrets set OPENAI_API_KEY="openai-api-key"
supabase secrets set OPENAI_MODEL="gpt-4o-mini"
```

Set `WHATSAPP_AI_PROVIDER="off"` to force the local English/Kiswahili parser only. Without `GROQ_API_KEY` or `OPENAI_API_KEY`, the function still works using the local parser and direct database lookups.

Do not commit AI keys or paste production keys into docs or code. Store them only as Supabase Edge Function secrets, and rotate any key that has been shared in chat or logs.

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
Top up wallet 500
Contribute 300 to school kitty by M-Pesa
Contribute 200 to kitty from wallet
Matangazo mapya?
Mkutano ujao ni lini?
MENU
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

Run the `whatsapp-notification-worker` job frequently with `WHATSAPP_NOTIFICATIONS_JOB_SECRET`. It also accepts the older `WHATSAPP_NOTIFICATION_SECRET` secret name for compatibility. The same worker still processes queued WhatsApp notifications. The included GitHub workflow runs it every 5 minutes; use Supabase Scheduled Functions or another scheduler at about 1-minute frequency when you need the pause message to land as close as possible to the 3-minute mark.

When the user comes back, the bot recognizes the paused session and sends a varied welcome-back message that mentions where the conversation stopped before continuing with the new message.
