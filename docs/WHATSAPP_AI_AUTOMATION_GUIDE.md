# WhatsApp AI Automation Guide

## Goal

Use the official WhatsApp Business Platform Cloud API as a member support and operations channel:

- Answer member/customer questions automatically.
- Let members reply `PAY` and receive an M-Pesa STK push.
- Confirm successful payments back on WhatsApp.
- Send meeting notices, announcements, and contribution reminders.
- Build an AI knowledge base that officials can improve over time.

The chatbot runs in two modes:

- Public assistant: for non-members and unknown WhatsApp numbers. It answers general questions, joining steps, contacts, and public announcements.
- Member assistant: for WhatsApp numbers that match `profiles.phone`. It unlocks payments, balances, receipts, profile status, meetings, notifications, and welfare/kitty updates.

## Current Implementation

This repo now keeps the smart assistant behind the existing `supabase/functions/whatsapp-webhook` endpoint so current Meta and app integrations do not need to change. `supabase/functions/whatsapp-bot` is only a compatibility entrypoint that imports the same implementation.

- `supabase/functions/whatsapp-webhook` receives official WhatsApp webhooks and runs the smart member assistant.
- `supabase/functions/whatsapp-send` lets authorized officials send WhatsApp messages or templates.
- `whatsapp_contacts` links WhatsApp phone numbers to member profiles.
- `whatsapp_messages` stores inbound/outbound messages and delivery statuses.
- `whatsapp_sessions`, `whatsapp_actions`, `whatsapp_conversation_ratings`, and `whatsapp_registration_requests` store smart-assistant state, audit trails, ratings, and registration leads.
- `wallets` and `wallet_transactions` record wallet balances and WhatsApp-funded top-ups.
- `whatsapp-notifications` sends queued app notifications through the official WhatsApp number.
- `ai_knowledge_base` stores trainable support answers with `bot_scope` set to `public`, `member`, or `both`.
- `mpesa-callback` reconciles M-Pesa payments and sends WhatsApp confirmations where configured.
- `/dashboard/communication/whatsapp` lets officials manage bot answers, inspect recent WhatsApp messages, review payment intents, dispatch queued notifications, and send a test WhatsApp message.
- Optional Groq or OpenAI fallback improves intent extraction and knowledge-base wording when configured.

## Production Flow

### 1. Customer/member asks a question

1. Member sends WhatsApp message to the official WhatsApp Business number.
2. Meta sends the message to `whatsapp-webhook`.
3. The webhook links the phone number to `profiles.phone` when possible.
4. The webhook chooses public or member chatbot mode.
5. The bot answers using command routing and scoped `ai_knowledge_base`.
6. Unanswered questions can be added to the knowledge base by officials.

### 2. Member pays from WhatsApp

1. Member replies `PAY`.
2. The bot checks pending or missed contributions.
3. The system starts an M-Pesa STK push using Safaricom Daraja.
4. A `whatsapp_payment_intents` row is created.
5. Safaricom calls `mpesa-callback`.
6. The callback marks linked contributions as paid.
7. WhatsApp receives a confirmation message with the receipt number.

### 3. Member funds wallet from WhatsApp

1. Member replies `FUND 500`, `TOPUP 500`, `DEPOSIT 500`, or `WALLET 500`.
2. The bot creates a pending `wallet_transactions` credit.
3. The system starts an M-Pesa STK push.
4. Safaricom calls `mpesa-callback`.
5. The callback atomically credits the member wallet only after a successful M-Pesa result.
6. WhatsApp receives a confirmation message with the receipt number.

### 4. Officials send announcements

1. Official creates or approves an announcement/meeting.
2. The app calls `whatsapp-send`.
3. `whatsapp-send` sends either:
   - A free-form WhatsApp text when the member is inside the customer-service window.
   - An approved WhatsApp template for proactive announcements.
4. Delivery status webhooks update `whatsapp_messages`.

### 5. Existing app notifications go to WhatsApp

1. Create or update a `notifications` row with `whatsapp_status = 'queued'`.
2. Call `whatsapp-notifications` manually, from the dashboard, or from a scheduled job.
3. The function resolves the member phone, respects WhatsApp opt-out, sends the message/template, and updates:
   - `notifications.whatsapp_status`
   - `notifications.whatsapp_message_id`
   - `notifications.whatsapp_sent_at`
   - `notifications.whatsapp_error`

## Required Meta Setup

Create or connect:

- Meta business portfolio.
- WhatsApp Business Account.
- WhatsApp business phone number.
- Permanent or long-lived system user access token.
- Webhook callback URL:
  `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`
- Webhook verify token matching `WHATSAPP_VERIFY_TOKEN`.
- Webhook subscription for WhatsApp messages.

Required token permissions:

- `whatsapp_business_messaging`
- `whatsapp_business_management`

## Required Supabase Secrets

Set these in Supabase Edge Function secrets:

```bash
WHATSAPP_VERIFY_TOKEN=choose-a-long-random-token
WHATSAPP_APP_SECRET=meta-app-secret
WHATSAPP_ACCESS_TOKEN=meta-system-user-token
WHATSAPP_PHONE_NUMBER_ID=meta-phone-number-id
WHATSAPP_GRAPH_API_VERSION=v20.0
WHATSAPP_SITE_URL=https://turuturustars.co.ke
WHATSAPP_NOTIFICATIONS_JOB_SECRET=choose-a-long-random-dispatch-secret

MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_SHORTCODE=...
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CALLBACK_URL=https://<project-ref>.supabase.co/functions/v1/mpesa-callback

# Optional smart intent and knowledge fallback. Groq is preferred for low-latency WhatsApp replies.
WHATSAPP_AI_PROVIDER=groq
WHATSAPP_AI_TIMEOUT_MS=8000
WHATSAPP_AI_CONVERSATION_TURNS=8
GROQ_API_KEY=...
GROQ_REGISTRATION_MODEL=openai/gpt-oss-20b
GROQ_INTENT_MODEL=openai/gpt-oss-20b
GROQ_KNOWLEDGE_MODEL=openai/gpt-oss-120b

# Optional OpenAI fallback instead of Groq.
# WHATSAPP_AI_PROVIDER=openai
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-4o-mini
```

Use Safaricom production URLs and production credentials when going live.

## Recommended WhatsApp Templates

Create and submit these in WhatsApp Manager:

- `member_announcement`: organization announcements.
- `meeting_notice`: meeting date, venue, agenda.
- `payment_reminder`: pending contribution reminder.
- `payment_receipt`: payment confirmation when a template is required.
- `new_kitty_notice`: notice when a new kitty/welfare contribution is opened.

Keep template wording simple and utility-focused so approval is easier.

## MVP Commands

Public assistant:

- `MENU` or `HELP`: shows public options.
- `JOIN`: explains how to register.
- `ANNOUNCEMENTS`: shows latest public notices.
- `CONTACT`: gives support guidance.

Member assistant:

- `MENU` or `HELP`: shows options.
- `PAY`: starts M-Pesa payment for pending contributions.
- `PAY 500`: starts an M-Pesa STK push for a specific amount.
- `CONTRIBUTE 500`: creates a WhatsApp-initiated contribution record and starts an M-Pesa STK push.
- `WALLET`: shows wallet balance and recent wallet transactions.
- `FUND 500`: tops up wallet by M-Pesa STK push.
- `BALANCE`: shows pending contributions.
- `WELFARE` or `KITTY`: shows active welfare/kitty cases.
- `MEETING`: shows the next scheduled meeting.
- `ANNOUNCEMENTS`: shows the latest published announcements.
- `PROFILE`: shows member status and registration fee state.
- `RECEIPTS`: shows recent confirmed payments.
- `NOTIFICATIONS`: shows unread member alerts.
- `STOP`: opts out of WhatsApp updates.
- `START`: opts in again.

## AI Training Model

Start with retrieval from `ai_knowledge_base`, not fine-tuning. Officials can manage these answers at `/dashboard/communication/whatsapp`. Add official answers for:

- Membership rules.
- Contribution amounts and deadlines.
- Welfare/kitty rules.
- Meeting procedures.
- Payment instructions.
- Wallet funding and wallet use.
- Contacts for officials.

The smart assistant can call Groq or OpenAI through an OpenAI-compatible chat-completions interface. Registration and intent extraction use structured JSON when the chosen model supports it, then fall back to normal JSON mode and finally to the local English/Kiswahili parser. Knowledge answers use active `ai_knowledge_base` entries, Swahili/Sheng search terms, and a small recent-conversation window controlled by `WHATSAPP_AI_CONVERSATION_TURNS` so follow-up questions feel continuous. Exact member operations still stay deterministic: payments, balances, receipts, profile status, meetings, announcements, notifications, welfare cases, wallet top-ups, and kitty contributions are read from Supabase commands instead of invented by the model.

Never commit AI keys. Store them as Supabase Edge Function secrets only, and rotate any key that has been shared in chat or logs before production.

## Local Webhook Testing With ngrok

Do not commit ngrok tokens. Set the token only in your local shell or ngrok config.

Example:

```bash
ngrok config add-authtoken <your-ngrok-token>
ngrok http 54321
```

Then set the Meta webhook callback URL to the HTTPS forwarding URL plus the local function path, for example:

```text
https://<ngrok-domain>/functions/v1/whatsapp-webhook
```

For deployed Supabase testing, use:

```text
https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook
```

## Important Notes

- Use the official WhatsApp Cloud API, not WhatsApp Web scraping.
- Native in-chat WhatsApp payments are market-limited. For Kenya, the practical path is WhatsApp conversation plus M-Pesa STK push.
- Proactive broadcasts usually need approved WhatsApp templates.
- Keep payment confirmations idempotent because Safaricom and Meta webhooks may retry.
- Store opt-out choices and respect `STOP`.
