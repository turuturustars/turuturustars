# WhatsApp Bot Feature Inventory

Last scanned: 2026-05-19

This document summarizes the current Turuturu Stars product surface and what the WhatsApp bot can already do. It is meant to guide the next enhancement pass: making WhatsApp a full self-service assistant for each user, so members and officials can perform the operations that apply to them without opening the web dashboard.

## Project Shape

- Frontend: Vite, React, TypeScript, Tailwind, shadcn-style UI components.
- Backend: Supabase database, Edge Functions, Row Level Security, realtime subscriptions.
- Key app entry points:
  - `src/App.tsx` for public and protected routes.
  - `src/layouts/DashboardLayout.tsx` and dashboard pages for member/official workflows.
  - `supabase/functions/*` for payments, auth helpers, notifications, WhatsApp, SMS, jobs, and uploads.
  - `supabase/migrations/*` for product schema and automation triggers.

## Main Product Features

### Public Website

- Landing/home pages, about, pillars, leadership, benefits, how-it-works.
- Public jobs board with job detail pages and SEO routes for government/public/Murang'a jobs.
- Donations through Pesapal.
- Constitution, FAQ, help, support, privacy policy, terms of service.
- PWA assets, manifest, sitemap files, robots, structured data, and SEO metadata.

### Authentication And Registration

- Email/password auth, email confirmation, password reset, auth callback pages.
- Profile setup and profile completion tracking.
- SMS signup verification support.
- Turnstile/CAPTCHA verification.
- Admin/member approval workflow after signup.
- Membership number generation and membership-number reuse for soft-deleted profiles.

### Member Dashboard

- Personal dashboard with contribution, welfare, notification, and quick-action summaries.
- Profile management, profile photo upload, and membership status.
- My contributions and contribution history.
- Membership fee status/history.
- Wallet balance, wallet ledger, wallet top-ups, and wallet spending.
- Welfare cases and member welfare contributions.
- Community kitties with contributions, beneficiaries, top contributors, and disbursements.
- Insurance benefit information.
- Announcements, notification center, and notification preferences.
- Private member-to-member messages with realtime presence/read receipts.
- Meetings and digital voting access.

### Finance And Payments

- M-Pesa STK push and callback handling.
- CBO M-Pesa payment management, till submission, till verification, approval controls.
- Contribution records with status, reference numbers, notes, and welfare links.
- Membership fee contribution generation and reminders.
- Wallet ledger with atomic debit/credit RPCs.
- Refund requests with approval flow and payout rules.
- Expenditure recording and multi-role finance approvals.
- Accounting suite with chart of accounts, journal entries, trial balance, and expenditure-to-ledger sync.
- Reports for members, contributions, and welfare.

### Welfare And Kitties

- Welfare case CRUD and contribution tracking.
- Welfare management views for officials.
- Kitty creation, category/status filtering, beneficiary management, member contributions, disbursement recording, and top contributor views.
- SMS/WhatsApp notification hooks for kitty creation, kitty contribution, wallet top-up, welfare, and announcements.

### Governance And Officials

- Role-specific dashboards for admin, chairperson, vice chairperson, secretary, treasurer, organizing secretary, and patron.
- Member list, member search/filtering, member status changes, and profile approval.
- Role handover and official reassignment history.
- Meetings, attendance, meeting status updates, and meeting minutes/documents.
- Digital voting motions, open/pending/closed voting, and vote recording.
- Discipline records, fines, pending/resolved cases.
- Operations center and audit log viewer.

### Communication And Automation

- Announcements with publishing flow.
- Realtime notifications and notification preferences.
- Private messages with conversation lists and read receipts.
- SMS notification queues/reminders.
- WhatsApp notification queue and scheduled worker.
- WhatsApp automation dashboard for bot knowledge, message/payment review, notification dispatch, and test sends.

### Jobs And Content Operations

- Public jobs table and jobs moderation dashboard.
- Job scrape settings and sources.
- Jobs maintenance and ingest functions.
- Public and footer job feeds.

## Current WhatsApp Implementation

There are two WhatsApp bot generations in the repo.

### `supabase/functions/whatsapp-webhook`

This is the older Cloud API webhook with public/member command routing.

Current capabilities:

- Meta webhook verification and signature verification.
- Health check via `?health=1`.
- Status webhook updates for WhatsApp delivery status.
- Contact upsert into `whatsapp_contacts`.
- Inbound/outbound message logging using older columns: `contact_id`, `member_id`, `wa_message_id`, `text_body`, `payload`.
- Public assistant mode for unknown numbers:
  - `MENU` or greetings.
  - Joining/registration guidance.
  - Public announcements.
  - Contact/support guidance.
- Member assistant mode when WhatsApp number matches `profiles.phone`:
  - `PAY`, `PAY 500`, `CONTRIBUTE 500` for M-Pesa STK prompts.
  - `WALLET`, `FUND 500`, `TOPUP 500`, `DEPOSIT 500` for member wallet flow.
  - Contribution balance/pending dues.
  - Active welfare/kitty cases.
  - Next meeting.
  - Latest announcements.
  - Profile/account status.
  - Recent receipts/payment history.
  - Unread notifications.
  - `STOP`/`START` opt-out and opt-in.
- AI knowledge-base fallback through `ai_knowledge_base` and OpenAI Responses API when configured.
- WhatsApp payment intents for contribution and wallet top-up.

### `supabase/functions/whatsapp-bot`

This is the newer smart assistant. It is currently the richer natural-language assistant.

Current capabilities:

- Meta webhook verification and signature verification.
- Extracts text from plain text, buttons, interactive replies, images with captions, and documents with captions.
- Phone-number matching against `profiles.phone`.
- Registered-member sessions in `whatsapp_sessions`.
- Inbound/outbound audit log using newer columns: `provider_message_id`, `phone`, `profile_id`, `body`, `provider_response`, `raw_payload`.
- Natural-language parsing in English, Kiswahili, and mixed Kenyan phrasing.
- Optional AI intent extraction through Groq or OpenAI with local fallback parser.
- Pending-intent continuation when the bot needs a missing amount, member name, welfare case title, or profile fields.
- M-Pesa-style numbered menus stored in `whatsapp_sessions.state.menu`, while natural-language messages still route through the intent parser.
- Registered member operations:
  - Help/menu.
  - Profile status.
  - Profile updates through WhatsApp.
  - Contribution summary.
  - Wallet balance.
  - Wallet top-up by M-Pesa STK push using `mpesa_transactions` and the main wallet ledger callback.
  - Latest announcements.
  - Upcoming meetings.
  - Active welfare cases.
  - Active kitties.
  - Kitty contribution by M-Pesa.
  - Kitty contribution from wallet through `contribute_to_kitty_from_wallet_for_member`.
  - Receipts, notifications, jobs, voting status, discipline/fines, refund status, membership status, and support guidance.
  - Record contribution notices as pending verification.
- Official/admin operations:
  - Record expenditure as pending approval.
  - Create welfare case.
  - Record contribution for another member when target member is resolved by phone, membership number, or name.
- Unknown-number registration flow:
  - Detects registration interest.
  - Confirms WhatsApp number.
  - Collects email.
  - Sends email OTP.
  - Supports `RESEND`.
  - Supports `NO EMAIL` path for admin follow-up.
  - Collects required profile details: full name, phone, ID number, location.
  - Collects optional profile details: occupation, employment status, education, interests, notes.
  - Saves leads in `whatsapp_registration_requests`.
- Conversation ratings:
  - Appends `Rate this chat: 😍 😊 😐 🙁 😡` for registered-member replies.
  - Stores ratings in `whatsapp_conversation_ratings`.
- Knowledge Q&A:
  - Reads active `ai_knowledge_base` entries for member/both scopes.
  - Uses optional Groq/OpenAI wording only after deterministic operations and knowledge retrieval.
- Abandoned-conversation lifecycle:
  - Marks sessions awaiting response.
  - `whatsapp-notification-worker` sends one pause message after the configured timeout.
  - Sends welcome-back context when the user returns.

### Outbound WhatsApp Functions

- `whatsapp-send`
  - Official-only outbound text/template sending.
  - Can send to direct phone numbers, member IDs, or all active members.
  - Respects opt-out unless forced.
  - Logs automation events.
- `whatsapp-notifications`
  - Dispatches queued rows from `notifications` using direct text or templates.
  - Updates notification WhatsApp delivery status.
- `whatsapp-notification-worker`
  - Processes `whatsapp_notifications_queue`.
  - Sends queued WhatsApp messages.
  - Handles abandoned smart-assistant sessions.
  - Is scheduled by `.github/workflows/whatsapp-notifications.yml` every 5 minutes on `main`.

## WhatsApp Operation Matrix

### Good Candidates Already Covered

- Greeting/help/menu.
- Registration-interest capture for unknown numbers.
- Profile status and profile updates.
- Contribution summary and pending balances.
- Manual contribution notice recording.
- Wallet balance.
- Wallet top-up from the newer smart assistant.
- Kitty list and kitty contributions by M-Pesa or wallet.
- Receipts/payment history.
- Notifications lookup.
- Knowledge-base Q&A in the newer smart assistant.
- Latest announcements.
- Upcoming meetings.
- Active welfare cases.
- Official welfare-case creation.
- Official expenditure recording.
- Chat rating and feedback.

### Good Candidates Partly Covered

- Contribution M-Pesa STK payment from WhatsApp. Covered in `whatsapp-webhook`, not yet ported as a deterministic smart-bot action.
- Wallet payments for dues, welfare cases, and fines. Kitty wallet contribution is now covered; other wallet spending surfaces still need dedicated WhatsApp flows.
- WhatsApp automation dashboard. It reads older message/payment tables and does not expose newer smart-assistant sessions/actions/ratings/registration requests.

### Not Yet Covered In WhatsApp

- Pay pending contribution obligations by M-Pesa STK from the newer smart assistant.
- Pay with wallet for dues, welfare cases, or fines.
- Full kitty detail operations beyond list/contribute.
- Meeting RSVP or attendance confirmation.
- Digital voting by WhatsApp.
- Private message summaries or sending a private message.
- Notification preference changes.
- Discipline/fine balance and fine payment.
- Refund request initiation/status.
- Approval decisions by officials.
- Member approval or registration conversion by officials.
- Role handover actions.
- Accounting/trial-balance summaries.
- Jobs search and saved job alerts.
- Support ticket/contact escalation.

## Integration Gaps To Fix Before Expanding

1. Choose one canonical inbound webhook.

   `WHATSAPP_AI_AUTOMATION_GUIDE.md` points Meta to `whatsapp-webhook`, while `WHATSAPP_SMART_ASSISTANT.md` points to `whatsapp-bot`. If Meta is connected to the old webhook, the smart-assistant features are inactive. If it is connected to the smart bot, payment/knowledge-base features from the old webhook are inactive.

2. Unify WhatsApp message storage.

   The older code/dashboard uses `contact_id`, `member_id`, `wa_message_id`, `text_body`, and `payload`. The newer smart bot writes `provider_message_id`, `phone`, `profile_id`, `body`, `provider_response`, and `raw_payload`. The dashboard currently reads the older shape, so smart-bot conversations may not appear correctly.

3. Regenerate Supabase TypeScript types.

   `src/integrations/supabase/types.ts` includes the older WhatsApp tables but does not expose newer tables such as `whatsapp_sessions`, `whatsapp_actions`, `whatsapp_registration_requests`, `whatsapp_conversation_ratings`, and `whatsapp_notifications_queue`.

4. Unify wallet tables.

   The main app uses `wallets` and `wallet_transactions`. The older WhatsApp payment flow uses `member_wallets` and `member_wallet_transactions`. The smart bot reads `wallets`. A full WhatsApp wallet flow should use the same wallet system as the dashboard.

5. Merge deterministic operations into `whatsapp-bot`.

   The newer smart bot should become the canonical assistant, with deterministic handlers for payments, wallet top-ups, receipts, notifications, kitties, refunds, approvals, voting, and jobs. AI should classify/phrase, but live operations should stay deterministic and role-checked.

6. Expand the dashboard.

   `/dashboard/communication/whatsapp` should show:
   - Smart-assistant messages from both old and new columns.
   - Sessions and abandoned conversations.
   - Actions and failed/blocked intents.
   - Registration requests.
   - Conversation ratings.
   - Notification queue rows.

## Recommended Enhancement Sequence

1. Make `whatsapp-bot` the canonical inbound webhook.
2. Port missing `whatsapp-webhook` features into `whatsapp-bot`:
   - STK payment for pending contribution.
   - Specific contribution payment.
   - STOP/START opt-in handling.
3. Add a single WhatsApp data-access layer for message logging, contact/session lookup, and phone normalization.
4. Normalize wallet operations to `wallets` and `wallet_transactions`.
5. Regenerate Supabase types and update the WhatsApp dashboard to support smart-assistant tables.
6. Add user-operation intents by module:
   - Finance: pay, receipt, refund, fine, wallet, statement.
   - Welfare/kitties: contribute, status, beneficiary, disbursement for officials.
   - Governance: meetings, RSVP, vote, motion status.
   - Membership: profile, registration, approval status, fee renewal.
   - Communication: announcements, notifications, preferences, support escalation.
   - Jobs: search jobs, latest jobs, category alerts.
7. Add tests around intent parsing and critical deterministic handlers.

## Clarification Needed

The user request mentioned operations related to "qim or qer". I interpreted this as "him or her", meaning each user should be able to perform operations related to their own account and role. If "QIM" or "QER" are actual project terms, define them before implementation so the intent map can include them precisely.
