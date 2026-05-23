# WhatsApp Smart Assistant

The `whatsapp-webhook` Supabase Edge Function turns the Turuturu Stars WhatsApp number into a registered-member assistant. The older `whatsapp-bot` entrypoint imports this same implementation for compatibility.

It can:

- Verify Meta WhatsApp webhook setup requests.
- Accept WhatsApp Cloud API inbound messages.
- Match the sender phone number against `profiles.phone`.
- Greet registered members by name when the number is recognized.
- Ask registered members to rate the chat with emoji choices `😍 😊 😐 🙁 😡` and store those ratings.
- Guide unknown numbers through a registration-interest flow:
  confirm the WhatsApp number, collect email, send an email OTP, collect required profile details, and create the member account.
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
- Keep registration history in `whatsapp_registration_requests` for audit, retry, and admin review when automatic conversion fails.

## Required Secrets

Set these Supabase Edge Function secrets:

```bash
supabase secrets set WHATSAPP_VERIFY_TOKEN="long-random-token"
supabase secrets set WHATSAPP_ACCESS_TOKEN="meta-cloud-api-token"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="meta-phone-number-id"
supabase secrets set WHATSAPP_SITE_URL="https://turuturustars.co.ke"
supabase secrets set WHATSAPP_REGISTRATION_OTP_PEPPER="long-random-otp-pepper"
supabase secrets set WHATSAPP_REGISTRATION_DEFAULT_STATUS="pending"
supabase secrets set WHATSAPP_NOTIFICATIONS_JOB_SECRET="long-random-job-secret"
supabase secrets set BREVO_API_KEY="brevo-api-key" BREVO_SENDER_EMAIL="support@turuturustars.co.ke"
```

Keep `WHATSAPP_REGISTRATION_DEFAULT_STATUS` as `pending` for production. Setting it to `active` makes WhatsApp-created accounts usable immediately after registration.

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
supabase secrets set WHATSAPP_AI_CONVERSATION_TURNS="8"
```

The bot uses Groq automatically when `GROQ_API_KEY` is present. `GROQ_REGISTRATION_MODEL` and `GROQ_INTENT_MODEL` default to `openai/gpt-oss-20b` so classification can use structured JSON schema output; `GROQ_KNOWLEDGE_MODEL` defaults to `openai/gpt-oss-120b` for stronger member-facing wording. `WHATSAPP_AI_MODEL` or `GROQ_MODEL` can set one model for all AI tasks, but that disables the purpose-specific defaults.

You can still use OpenAI instead:

```bash
supabase secrets set WHATSAPP_AI_PROVIDER="openai"
supabase secrets set OPENAI_API_KEY="openai-api-key"
supabase secrets set OPENAI_MODEL="gpt-4o-mini"
```

Set `WHATSAPP_AI_PROVIDER="off"` to force the local English/Kiswahili parser only. Without `GROQ_API_KEY` or `OPENAI_API_KEY`, the function still works using the local parser, direct database lookups, Swahili search terms, and a clarification reply that asks one follow-up question instead of dumping a full menu.

Knowledge answers can use the last few logged WhatsApp turns for continuity. Tune that with `WHATSAPP_AI_CONVERSATION_TURNS`, default `8`; the AI still may not perform payments, updates, approvals, voting, or registration unless the deterministic command flow has already done it.

Do not commit AI keys or paste production keys into docs or code. Store them only as Supabase Edge Function secrets, and rotate any key that has been shared in chat or logs.

Member and official replies also append a clickable access link when the answer has a matching dashboard or public page. For example, a wallet reply ends with `Press here to access your wallet: https://turuturustars.co.ke/dashboard/finance/wallet`. Set `WHATSAPP_SITE_URL` if the production domain changes.

## Meta Webhook

Deploy the function, then set this callback URL in the Meta WhatsApp app:

```text
https://<project-ref>.functions.supabase.co/whatsapp-webhook
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

Unknown numbers are not allowed into member-priority actions. They are prompted to reply `REGISTER`, confirm the number they are messaging from, provide an email or reply `NO EMAIL`, verify email by OTP when available, then provide full name, National ID, and location. Once required details are complete, the bot creates an auth/profile member account with the National ID as the first password. By default the new member is `pending`, so member-priority services stay locked until an admin approves the account.

After registered-member replies, the assistant appends:

```text
Rate this chat: 😍 😊 😐 🙁 😡
```

When the member replies with one of those emojis, the rating is saved and the bot sends a short thank-you without starting a new command.

## Conversation Pauses

When the assistant is waiting for a reply, such as registration OTP, missing transaction amount, or welfare case title, it marks the session as awaiting response. The `whatsapp-notification-worker` job also checks those sessions. If the user has not replied after `WHATSAPP_ABANDONMENT_MINUTES` minutes, default `3`, it sends one warm pause message with a day/evening/night wish and stops nudging.

Run the `whatsapp-notification-worker` job frequently with `WHATSAPP_NOTIFICATIONS_JOB_SECRET`. It also accepts the older `WHATSAPP_NOTIFICATION_SECRET` secret name for compatibility. The same worker still processes queued WhatsApp notifications. The included GitHub workflow runs it every 5 minutes; use Supabase Scheduled Functions or another scheduler at about 1-minute frequency when you need the pause message to land as close as possible to the 3-minute mark.

When the user comes back, the bot recognizes the paused session and sends a varied welcome-back message that mentions where the conversation stopped before continuing with the new message.
