import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const WHATSAPP_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const WHATSAPP_GRAPH_VERSION =
  Deno.env.get("WHATSAPP_GRAPH_API_VERSION") ?? Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v21.0";
const AI_PROVIDER = getEnv(["WHATSAPP_AI_PROVIDER", "AI_PROVIDER"], "auto").toLowerCase();
const AI_TIMEOUT_MS = getNumberEnv(["WHATSAPP_AI_TIMEOUT_MS", "AI_TIMEOUT_MS"], 10000);
const AI_MAX_OUTPUT_TOKENS = getNumberEnv(["WHATSAPP_AI_MAX_OUTPUT_TOKENS", "AI_MAX_OUTPUT_TOKENS"], 320);
const AI_KNOWLEDGE_FETCH_LIMIT = getNumberEnv(["WHATSAPP_AI_KNOWLEDGE_FETCH_LIMIT", "AI_KNOWLEDGE_FETCH_LIMIT"], 80);
const AI_KNOWLEDGE_CONTEXT_LIMIT = getNumberEnv(["WHATSAPP_AI_KNOWLEDGE_CONTEXT_LIMIT", "AI_KNOWLEDGE_CONTEXT_LIMIT"], 12);
const AI_DIRECT_KNOWLEDGE_SCORE = getNumberEnv(["WHATSAPP_AI_DIRECT_KNOWLEDGE_SCORE", "AI_DIRECT_KNOWLEDGE_SCORE"], 6);
const GROQ_API_KEY = getEnv("GROQ_API_KEY");
const GROQ_MODEL = getEnv(["GROQ_KNOWLEDGE_MODEL", "GROQ_MODEL", "WHATSAPP_AI_MODEL"], "openai/gpt-oss-120b");
const GROQ_BASE_URL = getEnv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const OPENAI_API_KEY = getEnv("OPENAI_API_KEY");
const OPENAI_MODEL = getEnv(["OPENAI_MODEL", "WHATSAPP_AI_MODEL"], "gpt-5.4-mini");
const MPESA_CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY") ?? "";
const MPESA_CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET") ?? "";
const MPESA_PASSKEY = Deno.env.get("MPESA_PASSKEY") ?? "";
const MPESA_SHORTCODE = Deno.env.get("MPESA_SHORTCODE") ?? "";
const MPESA_BASE_URL = Deno.env.get("MPESA_BASE_URL") ?? "https://sandbox.safaricom.co.ke";
const MPESA_CALLBACK_URL = Deno.env.get("MPESA_CALLBACK_URL") ?? `${SUPABASE_URL}/functions/v1/mpesa-callback`;

const SEARCH_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "you",
  "your",
  "with",
  "from",
  "what",
  "when",
  "where",
  "how",
  "can",
  "kwa",
  "na",
  "ya",
  "za",
  "wa",
  "ni",
  "nini",
  "gani",
  "tafadhali",
  "please",
]);

type SupabaseClient = ReturnType<typeof createClient>;
type BotMode = "public" | "member";
type PaymentPurpose = "contribution" | "wallet_topup";

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
}

interface WhatsAppStatus {
  id?: string;
  status?: string;
  timestamp?: string;
}

interface WhatsAppContactInfo {
  wa_id: string;
  profile?: {
    name?: string;
  };
}

interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: WhatsAppStatus[];
        messages?: WhatsAppMessage[];
        contacts?: WhatsAppContactInfo[];
      };
    }>;
  }>;
}

interface ContactRecord {
  id: string;
  wa_id: string;
  phone_number: string;
  member_id: string | null;
  last_bot_mode: BotMode;
  opted_in: boolean;
}

interface MemberProfile {
  id: string;
  full_name: string;
  phone: string;
  membership_number: string | null;
  registration_fee_paid: boolean | null;
  status: string | null;
}

interface Contribution {
  id: string;
  amount: number;
  contribution_type: string;
  due_date: string | null;
  status: string | null;
}

interface AnnouncementRecord {
  title: string;
  content: string | null;
}

interface KnowledgeEntry {
  title: string;
  content: string;
  category: string;
  bot_scope: "public" | "member" | "both";
  metadata?: Record<string, unknown> | null;
}

interface OpenAIResponsePayload {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

interface ChatCompletionResponsePayload {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface WelfareCase {
  title: string;
  case_type: string;
  collected_amount: number | null;
  target_amount: number | null;
  status: string | null;
}

interface RecentPayment {
  amount: number;
  contribution_type: string;
  paid_at: string | null;
  reference_number: string | null;
}

interface MemberNotification {
  title: string;
  message: string;
  type: string;
  created_at: string | null;
}

interface MemberWallet {
  id: string;
  member_id: string;
  balance: number;
  currency: string;
}

interface WalletTransaction {
  id: string;
  amount: number;
  status: string;
  reference_number: string | null;
  description: string | null;
  created_at: string | null;
}

interface MpesaPaymentOptions {
  purpose: PaymentPurpose;
  contributionIds?: string[];
  walletTransactionId?: string | null;
  transactionType?: string;
  transactionDesc: string;
  accountPrefix: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("health") === "1") {
      return webhookHealthResponse();
    }

    return handleWebhookVerification(req);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();

  if (WHATSAPP_APP_SECRET) {
    const signature = req.headers.get("x-hub-signature-256");
    const signatureValid = await verifyMetaSignature(rawBody, signature);
    if (!signatureValid) {
      console.warn("Rejected WhatsApp webhook with invalid signature");
      return jsonResponse({ error: "Invalid signature" }, 403);
    }
  }

  try {
    const payload = JSON.parse(rawBody) as WebhookPayload;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await processWebhookPayload(supabase, payload);
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error("WhatsApp webhook processing failed:", error);
    return jsonResponse({ ok: false }, 200);
  }
});

function handleWebhookVerification(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return jsonResponse({ error: "Verification failed" }, 403);
}

async function processWebhookPayload(supabase: SupabaseClient, payload: WebhookPayload) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};

      for (const status of value.statuses ?? []) {
        try {
          await updateMessageStatus(supabase, status);
        } catch (error) {
          console.error("Failed to process WhatsApp status update:", status?.id, error);
        }
      }

      for (const message of value.messages ?? []) {
        const contactInfo = (value.contacts ?? []).find((contact: WhatsAppContactInfo) => contact.wa_id === message.from);
        try {
          await handleIncomingMessage(supabase, message, contactInfo);
        } catch (error) {
          console.error("Failed to process WhatsApp inbound message:", message?.id, error);
        }
      }
    }
  }
}

async function updateMessageStatus(supabase: SupabaseClient, status: WhatsAppStatus) {
  if (!status?.id) return;

  const { error } = await supabase
    .from("whatsapp_messages")
    .update({
      status: status.status ?? "status_update",
      status_updated_at: new Date(Number(status.timestamp ?? Date.now()) * 1000).toISOString(),
      payload: status,
    })
    .eq("wa_message_id", status.id);

  if (error) {
    console.error("Failed to update WhatsApp message status:", error);
  }
}

async function handleIncomingMessage(
  supabase: SupabaseClient,
  message: WhatsAppMessage,
  contactInfo?: WhatsAppContactInfo,
) {
  const existing = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("wa_message_id", message.id)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    console.error("Failed to check WhatsApp message idempotency:", existing.error);
  }

  if (existing.data?.id) {
    return;
  }

  const member = await resolveMemberByPhone(supabase, message.from);
  const contact = await upsertContact(supabase, message.from, contactInfo, member);
  const text = extractMessageText(message);

  const { error: inboundLogError } = await supabase.from("whatsapp_messages").insert({
    contact_id: contact.id,
    member_id: member?.id ?? null,
    wa_message_id: message.id,
    direction: "inbound",
    message_type: message.type,
    text_body: text,
    payload: message,
    status: "received",
  });

  if (inboundLogError) {
    console.error("Failed to log inbound WhatsApp message:", inboundLogError);
  }

  let reply: string | null = null;
  try {
    reply = await routeIncomingText(supabase, contact, member, text);
  } catch (error) {
    console.error("Failed to route WhatsApp inbound text:", error);
    reply = [
      "Sorry, I could not process that message right now.",
      "Reply MENU to continue, or try again shortly.",
    ].join("\n");
  }

  if (reply) {
    await sendAndLogText(supabase, contact, member?.id ?? null, reply);
  }
}

async function routeIncomingText(
  supabase: SupabaseClient,
  contact: ContactRecord,
  member: MemberProfile | null,
  rawText: string,
) {
  const text = rawText.trim();
  const command = text.toLowerCase();
  const botMode: BotMode = member ? "member" : "public";

  if (!text) {
    return "Please send a text message. Reply MENU for options.";
  }

  if (["stop", "unsubscribe", "opt out", "opt-out"].includes(command)) {
    await supabase.from("whatsapp_contacts").update({ opted_in: false }).eq("id", contact.id);
    return "You have been opted out of WhatsApp updates. Reply START to opt in again.";
  }

  if (["start", "subscribe", "opt in", "opt-in"].includes(command)) {
    await supabase.from("whatsapp_contacts").update({ opted_in: true }).eq("id", contact.id);
    return "You are opted in to WhatsApp updates. Reply MENU for options.";
  }

  if (!contact.opted_in && !["start", "subscribe", "opt in", "opt-in"].includes(command)) {
    return null;
  }

  if (isMenuCommand(command)) {
    return menuReply(member, botMode);
  }

  if (botMode === "public") {
    return routePublicText(supabase, text, command);
  }

  return routeMemberText(supabase, contact, member, text, command);
}

async function routePublicText(supabase: SupabaseClient, text: string, command: string) {
  if (isPaymentCommand(command) || isMemberOnlyCommand(command)) {
    return [
      "That is a member service.",
      "Please send this message from the WhatsApp number registered on your Turuturu Stars member profile.",
      "If you are not registered yet, reply JOIN.",
    ].join("\n");
  }

  if (isAnnouncementCommand(command)) {
    return latestAnnouncementsReply(supabase);
  }

  if (isJoinCommand(command)) {
    return publicMembershipReply();
  }

  if (isSupportCommand(command)) {
    return publicSupportReply();
  }

  return smartKnowledgeReply(supabase, text, null, "public");
}

async function routeMemberText(
  supabase: SupabaseClient,
  contact: ContactRecord,
  member: MemberProfile,
  text: string,
  command: string,
) {
  if (isWalletFundingCommand(command)) {
    return handleWalletFundingRequest(supabase, contact, member, text);
  }

  if (isWalletInfoCommand(command)) {
    return walletSummaryReply(supabase, member);
  }

  if (isReceiptCommand(command)) {
    return recentPaymentsReply(supabase, member);
  }

  if (command.includes("contribute")) {
    return handlePaymentRequest(supabase, contact, member, text);
  }

  if (isPaymentCommand(command)) {
    return handlePaymentRequest(supabase, contact, member, text);
  }

  if (isBalanceCommand(command)) {
    return contributionSummaryReply(supabase, member);
  }

  if (isMeetingCommand(command)) {
    return nextMeetingReply(supabase);
  }

  if (isAnnouncementCommand(command)) {
    return latestAnnouncementsReply(supabase);
  }

  if (isWelfareCommand(command)) {
    return activeWelfareCasesReply(supabase);
  }

  if (isProfileCommand(command)) {
    return profileStatusReply(member);
  }

  if (isNotificationCommand(command)) {
    return unreadNotificationsReply(supabase, member);
  }

  return smartKnowledgeReply(supabase, text, member, "member");
}

function isMenuCommand(command: string) {
  return [
    "hi",
    "hello",
    "helo",
    "helloo",
    "hey",
    "menu",
    "help",
    "start",
    "mambo",
    "niaje",
    "habari",
  ].includes(command) ||
    command.startsWith("hello ") ||
    command.startsWith("helo ") ||
    command.startsWith("hey ");
}

function isPaymentCommand(command: string) {
  return command === "pay" ||
    command.startsWith("pay ") ||
    command === "lipa" ||
    command.startsWith("lipa ") ||
    command.includes("contribute") ||
    command.includes("mpesa") ||
    command.includes("m-pesa") ||
    command.includes("payment");
}

function isWalletFundingCommand(command: string) {
  return command.startsWith("fund ") ||
    command.startsWith("topup ") ||
    command.startsWith("top up ") ||
    command.startsWith("deposit ") ||
    (command.startsWith("wallet ") && extractAmount(command) !== null) ||
    command.startsWith("wallet fund") ||
    command.startsWith("wallet top") ||
    command.startsWith("wallet deposit");
}

function isWalletInfoCommand(command: string) {
  return command === "wallet" ||
    command === "wallet balance" ||
    command === "my wallet" ||
    command === "funds" ||
    command.includes("wallet history");
}

function isMemberOnlyCommand(command: string) {
  return isBalanceCommand(command) ||
    command.includes("contribute") ||
    command.includes("wallet") ||
    command.includes("fund") ||
    isProfileCommand(command) ||
    isReceiptCommand(command) ||
    isNotificationCommand(command) ||
    isWelfareCommand(command);
}

function isAnnouncementCommand(command: string) {
  return hasAnyTerm(command, [
    "announc",
    "annouc",
    "anounc",
    "anouc",
    "news",
    "notice",
    "matangazo",
    "tangazo",
  ]);
}

function isJoinCommand(command: string) {
  return hasAnyTerm(command, [
    "join",
    "register",
    "registration",
    "membership",
    "member",
    "jiunga",
    "sajili",
    "usajili",
    "mwanachama",
  ]);
}

function isSupportCommand(command: string) {
  return hasAnyTerm(command, [
    "contact",
    "support",
    "help",
    "msaada",
    "mawasiliano",
  ]);
}

function isBalanceCommand(command: string) {
  return hasAnyTerm(command, [
    "balance",
    "due",
    "arrears",
    "contribution",
    "salio",
    "deni",
    "madeni",
    "michango",
  ]);
}

function isMeetingCommand(command: string) {
  return hasAnyTerm(command, [
    "meeting",
    "mkutano",
    "mikutano",
  ]);
}

function isWelfareCommand(command: string) {
  return hasAnyTerm(command, [
    "welfare",
    "kitty",
    "kity",
    "case",
    "dhiki",
    "msiba",
    "ustawi",
  ]);
}

function isProfileCommand(command: string) {
  return hasAnyTerm(command, [
    "profile",
    "status",
    "account",
    "wasifu",
    "akaunti",
    "taarifa zangu",
  ]);
}

function isReceiptCommand(command: string) {
  return hasAnyTerm(command, [
    "receipt",
    "history",
    "paid",
    "risiti",
    "stakabadhi",
    "malipo",
    "nimelipa",
    "nimelipia",
  ]);
}

function isNotificationCommand(command: string) {
  return hasAnyTerm(command, [
    "notification",
    "notifications",
    "alert",
    "alerts",
    "taarifa",
    "notisi",
  ]);
}

function hasAnyTerm(command: string, terms: string[]) {
  return terms.some((term) => command.includes(term));
}

function menuReply(member: MemberProfile | null, botMode: BotMode) {
  if (botMode === "public") {
    return [
      "Hello, this is Turuturu Stars public assistant.",
      "Reply with:",
      "JOIN - how to become a member",
      "ABOUT - learn about Turuturu Stars",
      "ANNOUNCEMENTS - latest public notices",
      "CONTACT - support information",
      "Members should use their registered WhatsApp number for payments and account services.",
    ].join("\n");
  }

  return [
    `Hello ${firstName(member?.full_name ?? "member")}. This is your member assistant.`,
    "Reply with:",
    "PAY - pay pending contributions by M-Pesa STK push",
    "CONTRIBUTE 500 - pay a specific contribution amount",
    "WALLET - see wallet balance and recent top-ups",
    "FUND 500 - top up wallet by M-Pesa STK push",
    "BALANCE - see pending contributions",
    "WELFARE - see active welfare/kitty cases",
    "MEETING - see the next scheduled meeting",
    "ANNOUNCEMENTS - see latest notices",
    "PROFILE - see member status",
    "RECEIPTS - see recent payments",
    "NOTIFICATIONS - see unread alerts",
    "STOP - opt out of WhatsApp updates",
  ].join("\n");
}

function publicMembershipReply() {
  return [
    "To join Turuturu Stars:",
    "1. Create an account on the website.",
    "2. Complete your profile with your real phone number.",
    "3. Pay the registration/member contribution when prompted.",
    "4. Wait for official approval.",
    "After approval, use that same phone number on WhatsApp to access member services.",
  ].join("\n");
}

function publicSupportReply() {
  return [
    "For support, share your name, phone number, and what you need help with.",
    "If you are already a member, message using the phone number saved on your member profile so I can unlock member services.",
  ].join("\n");
}

async function handlePaymentRequest(
  supabase: SupabaseClient,
  contact: ContactRecord,
  member: MemberProfile | null,
  text: string,
) {
  if (!member) {
    return [
      "I could not match this WhatsApp number to a member profile.",
      "Please ask an official to update your member phone number, then reply PAY again.",
    ].join("\n");
  }

  const requestedAmount = extractAmount(text);
  const pending = await getPendingContributions(supabase, member.id);
  const amount = requestedAmount ?? pending.reduce((sum, contribution) => sum + Number(contribution.amount), 0);

  if (!amount || amount <= 0) {
    return "You do not have pending contributions right now. Reply BALANCE any time to check again.";
  }

  try {
    const contributionIds = requestedAmount
      ? [await createWhatsAppContribution(supabase, member.id, amount)]
      : pending.map((contribution) => contribution.id);

    const stk = await initiateMpesaPayment(supabase, contact, member, amount, {
      purpose: "contribution",
      contributionIds,
      transactionType: "stk_push",
      transactionDesc: "Turuturu Stars Contribution",
      accountPrefix: "TS",
    });
    return [
      `M-Pesa STK push sent to ${formatPhoneForDisplay(stk.phoneNumber)} for KES ${formatMoney(amount)}.`,
      "Enter your M-Pesa PIN to complete payment.",
      "I will confirm here when the payment is received.",
    ].join("\n");
  } catch (error) {
    console.error("Failed to initiate WhatsApp M-Pesa payment:", error);
    return "I could not start the M-Pesa payment right now. Please try again or contact the treasurer.";
  }
}

async function handleWalletFundingRequest(
  supabase: SupabaseClient,
  contact: ContactRecord,
  member: MemberProfile,
  text: string,
) {
  const amount = extractAmount(text);

  if (!amount || amount <= 0) {
    return [
      "How much do you want to add to your wallet?",
      "Example: FUND 500",
    ].join("\n");
  }

  try {
    const wallet = await ensureMemberWallet(supabase, member.id);
    const { data: walletTransaction, error: walletError } = await supabase
      .from("member_wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        member_id: member.id,
        transaction_type: "credit",
        source: "whatsapp",
        amount,
        status: "pending",
        description: "WhatsApp wallet top-up",
        metadata: { contact_id: contact.id },
      })
      .select("id")
      .single();

    if (walletError) {
      throw walletError;
    }

    const stk = await initiateMpesaPayment(supabase, contact, member, amount, {
      purpose: "wallet_topup",
      walletTransactionId: walletTransaction.id,
      transactionType: "wallet_topup",
      transactionDesc: "Turuturu Stars Wallet Top Up",
      accountPrefix: "TSW",
    });

    return [
      `M-Pesa STK push sent to ${formatPhoneForDisplay(stk.phoneNumber)} for KES ${formatMoney(amount)}.`,
      "Enter your M-Pesa PIN to fund your wallet.",
      "I will confirm here when your wallet is updated.",
    ].join("\n");
  } catch (error) {
    console.error("Failed to initiate WhatsApp wallet top-up:", error);
    return "I could not start the wallet top-up right now. Please try again or contact the treasurer.";
  }
}

async function walletSummaryReply(supabase: SupabaseClient, member: MemberProfile) {
  const wallet = await ensureMemberWallet(supabase, member.id);
  const { data, error } = await supabase
    .from("member_wallet_transactions")
    .select("id, amount, status, reference_number, description, created_at")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Failed to fetch wallet transactions:", error);
    return "I could not check your wallet right now. Please try again later.";
  }

  const transactions = (data ?? []) as WalletTransaction[];
  const lines = transactions.length
    ? transactions.map((transaction, index) => {
      const reference = transaction.reference_number ? ` (${transaction.reference_number})` : "";
      const createdAt = transaction.created_at ? ` - ${formatDate(transaction.created_at)}` : "";
      return `${index + 1}. KES ${formatMoney(transaction.amount)} ${titleCase(transaction.status)}${reference}${createdAt}`;
    })
    : ["No wallet transactions yet."];

  return [
    `Wallet balance: ${wallet.currency} ${formatMoney(wallet.balance)}`,
    ...lines,
    "Reply FUND 500 to top up by M-Pesa.",
  ].join("\n");
}

async function contributionSummaryReply(supabase: SupabaseClient, member: MemberProfile | null) {
  if (!member) {
    return "I could not match this WhatsApp number to a member profile. Please contact an official to update your phone number.";
  }

  const pending = await getPendingContributions(supabase, member.id);
  if (pending.length === 0) {
    return "You do not have pending contributions right now.";
  }

  const total = pending.reduce((sum, contribution) => sum + Number(contribution.amount), 0);
  const lines = pending.slice(0, 5).map((contribution) => {
    const due = contribution.due_date ? ` due ${formatDate(contribution.due_date)}` : "";
    return `${titleCase(contribution.contribution_type)}: KES ${formatMoney(contribution.amount)}${due}`;
  });

  return [
    `Pending total: KES ${formatMoney(total)}`,
    ...lines,
    "Reply PAY to receive an M-Pesa STK push.",
  ].join("\n");
}

async function nextMeetingReply(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("meetings")
    .select("title, scheduled_date, venue, agenda")
    .eq("status", "scheduled")
    .gte("scheduled_date", new Date().toISOString())
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch next meeting:", error);
    return "I could not check meetings right now. Please try again later.";
  }

  if (!data) {
    return "There is no scheduled upcoming meeting right now.";
  }

  return [
    `Next meeting: ${data.title}`,
    `When: ${formatDateTime(data.scheduled_date)}`,
    data.venue ? `Venue: ${data.venue}` : null,
    data.agenda ? `Agenda: ${data.agenda}` : null,
  ].filter(Boolean).join("\n");
}

async function latestAnnouncementsReply(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("announcements")
    .select("title, content, published_at, created_at")
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(3);

  if (error) {
    console.error("Failed to fetch announcements:", error);
    return "I could not check announcements right now. Please try again later.";
  }

  if (!data?.length) {
    return "There are no published announcements right now.";
  }

  return ((data ?? []) as AnnouncementRecord[]).map((announcement, index) => {
    const content = String(announcement.content ?? "").slice(0, 240);
    return `${index + 1}. ${announcement.title}\n${content}`;
  }).join("\n\n");
}

async function activeWelfareCasesReply(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("welfare_cases")
    .select("title, case_type, collected_amount, target_amount, status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Failed to fetch welfare cases:", error);
    return "I could not check welfare/kitty cases right now. Please try again later.";
  }

  if (!data?.length) {
    return "There are no active welfare or kitty cases right now.";
  }

  const lines = ((data ?? []) as WelfareCase[]).map((welfareCase, index) => {
    const target = welfareCase.target_amount ? ` / KES ${formatMoney(welfareCase.target_amount)}` : "";
    return `${index + 1}. ${welfareCase.title} (${titleCase(welfareCase.case_type)}) - KES ${formatMoney(welfareCase.collected_amount ?? 0)} collected${target}`;
  });

  return [
    "Active welfare/kitty cases:",
    ...lines,
    "Reply PAY if you have pending contribution obligations.",
  ].join("\n");
}

function profileStatusReply(member: MemberProfile) {
  return [
    `Member: ${member.full_name}`,
    member.membership_number ? `Membership No: ${member.membership_number}` : "Membership No: Pending",
    `Status: ${titleCase(member.status ?? "pending")}`,
    `Registration fee: ${member.registration_fee_paid ? "Paid" : "Pending"}`,
    "Reply BALANCE for contributions or PAY to make payment.",
  ].join("\n");
}

async function recentPaymentsReply(supabase: SupabaseClient, member: MemberProfile) {
  const { data, error } = await supabase
    .from("contributions")
    .select("amount, contribution_type, paid_at, reference_number")
    .eq("member_id", member.id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false, nullsFirst: false })
    .limit(5);

  if (error) {
    console.error("Failed to fetch recent payments:", error);
    return "I could not check your payment history right now. Please try again later.";
  }

  if (!data?.length) {
    return "I do not see any confirmed contribution payments yet.";
  }

  const lines = ((data ?? []) as RecentPayment[]).map((payment, index) => {
    const paidAt = payment.paid_at ? ` on ${formatDate(payment.paid_at)}` : "";
    const reference = payment.reference_number ? ` (${payment.reference_number})` : "";
    return `${index + 1}. ${titleCase(payment.contribution_type)} - KES ${formatMoney(payment.amount)}${paidAt}${reference}`;
  });

  return ["Recent confirmed payments:", ...lines].join("\n");
}

async function unreadNotificationsReply(supabase: SupabaseClient, member: MemberProfile) {
  const { data, error } = await supabase
    .from("notifications")
    .select("title, message, type, created_at")
    .eq("user_id", member.id)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Failed to fetch member notifications:", error);
    return "I could not check your notifications right now. Please try again later.";
  }

  if (!data?.length) {
    return "You have no unread notifications right now.";
  }

  const lines = ((data ?? []) as MemberNotification[]).map((notification, index) => {
    const createdAt = notification.created_at ? ` - ${formatDate(notification.created_at)}` : "";
    return `${index + 1}. ${notification.title}${createdAt}\n${notification.message}`;
  });

  return ["Unread notifications:", ...lines].join("\n\n");
}

async function smartKnowledgeReply(
  supabase: SupabaseClient,
  text: string,
  member: MemberProfile | null,
  botMode: BotMode,
) {
  const { data, error } = await supabase
    .from("ai_knowledge_base")
    .select("title, content, category, bot_scope, metadata")
    .eq("is_active", true)
    .in("bot_scope", [botMode, "both"])
    .limit(AI_KNOWLEDGE_FETCH_LIMIT);

  if (error) {
    console.error("Failed to fetch AI knowledge base:", error);
  }

  const entries = (data ?? []) as KnowledgeEntry[];
  const ranked = rankKnowledgeEntries(text, entries);
  const relevantEntries = ranked
    .filter((item) => item.score > 0)
    .slice(0, AI_KNOWLEDGE_CONTEXT_LIMIT)
    .map((item) => item.entry);
  const contextEntries = relevantEntries.length
    ? relevantEntries
    : entries.slice(0, AI_KNOWLEDGE_CONTEXT_LIMIT);

  const aiReply = await generateAiReply(text, member, botMode, contextEntries);
  if (aiReply) {
    return aiReply;
  }

  const best = ranked[0];
  if (best && best.score >= AI_DIRECT_KNOWLEDGE_SCORE) {
    return `${best.entry.content}\n\nReply MENU for more options.`;
  }

  return [
    member ? `I am not fully sure yet, ${firstName(member.full_name)}.` : "I am not fully sure yet.",
    botMode === "member"
      ? "I can help with payments, wallet top-ups, balances, welfare/kitty cases, meetings, announcements, profile status, receipts, and notifications."
      : "I can help with joining, public announcements, contacts, and general Turuturu Stars questions.",
    "Reply MENU for options, or an official can add this answer to the AI knowledge base.",
  ].join("\n");
}

async function generateAiReply(
  text: string,
  member: MemberProfile | null,
  botMode: BotMode,
  entries: KnowledgeEntry[],
) {
  if ((AI_PROVIDER === "auto" || AI_PROVIDER === "groq") && GROQ_API_KEY) {
    const groqReply = await generateGroqReply(text, member, botMode, entries);
    if (groqReply) {
      return groqReply;
    }
  }

  if ((AI_PROVIDER === "auto" || AI_PROVIDER === "openai") && OPENAI_API_KEY) {
    return generateOpenAIReply(text, member, botMode, entries);
  }

  return null;
}

async function generateGroqReply(
  text: string,
  member: MemberProfile | null,
  botMode: BotMode,
  entries: KnowledgeEntry[],
) {
  try {
    const response = await fetchWithTimeout(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: buildChatMessages(text, member, botMode, entries),
        temperature: 0.2,
        top_p: 0.9,
        max_completion_tokens: AI_MAX_OUTPUT_TOKENS,
        stream: false,
      }),
    });

    const payload = await readJsonResponse<ChatCompletionResponsePayload>(response);
    if (!response.ok) {
      console.error("Groq fallback failed:", payload.error?.message ?? response.statusText);
      return null;
    }

    const reply = extractChatCompletionText(payload);
    return reply ? clampWhatsAppReply(reply) : null;
  } catch (error) {
    console.error("Groq fallback threw:", error);
    return null;
  }
}

async function generateOpenAIReply(
  text: string,
  member: MemberProfile | null,
  botMode: BotMode,
  entries: KnowledgeEntry[],
) {
  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: buildAiInstructions(botMode),
        input: buildAiInput(text, member, botMode, entries),
        max_output_tokens: AI_MAX_OUTPUT_TOKENS,
      }),
    });

    const payload = await readJsonResponse<OpenAIResponsePayload>(response);
    if (!response.ok) {
      console.error("OpenAI fallback failed:", payload.error?.message ?? response.statusText);
      return null;
    }

    const reply = extractOpenAIText(payload);
    return reply ? clampWhatsAppReply(reply) : null;
  } catch (error) {
    console.error("OpenAI fallback threw:", error);
    return null;
  }
}

function buildAiInstructions(botMode: BotMode) {
  const audienceRule = botMode === "member"
    ? "The user is an authenticated Turuturu Stars member. You may explain member services, but live account operations must be handled by exact WhatsApp commands."
    : "The user is public, not authenticated as a member. Do not expose member-only operations, private data, payment status, balances, receipts, or internal records.";

  return [
    "You are the Turuturu Stars WhatsApp assistant.",
    audienceRule,
    "Understand English, Swahili, Sheng, abbreviations, and common typing mistakes.",
    "First decide whether a live command should handle the request. If yes, give the exact command and a short explanation.",
    "Answer using only the supplied knowledge base, live command guide, and authenticated context.",
    "Do not invent balances, receipt numbers, meeting dates, payment status, member status, welfare targets, or announcements.",
    "Never claim you have updated a profile, cast a vote, created a payment, changed membership status, or registered a member unless the deterministic system already did it.",
    "Never ask for an M-Pesa PIN, password, OTP, full ID number, or card details in WhatsApp.",
    "If the user asks for confidential, official-only, or member-only information they are not allowed to see, politely refuse and suggest the correct official channel.",
    "For live member actions, direct users to commands: PAY, CONTRIBUTE 500, WALLET, FUND 500, BALANCE, WELFARE, MEETING, ANNOUNCEMENTS, PROFILE, RECEIPTS, NOTIFICATIONS.",
    "For public users asking to join, direct them to JOIN or official support.",
    "If the user asks in Swahili, reply in natural Swahili unless English is clearer for a command.",
    "Keep replies concise, friendly, and suitable for WhatsApp. Avoid tables. Ask at most one follow-up question. End with a helpful command when useful.",
  ].join("\n");
}

function buildAiInput(
  text: string,
  member: MemberProfile | null,
  botMode: BotMode,
  entries: KnowledgeEntry[],
) {
  const knowledge = entries.length
    ? entries.map(formatKnowledgeEntry).join("\n\n")
    : "No active knowledge base entries were found.";

  const memberContext = botMode === "member" && member
    ? [
      "Authenticated member context:",
      "yes",
      `Name: ${member.full_name}`,
      `Membership number: ${member.membership_number ?? "not set"}`,
      `Profile status: ${member.status ?? "not set"}`,
      `Registration fee paid: ${member.registration_fee_paid ? "yes" : "no or unknown"}`,
      "Do not answer live profile, payment, balance, receipt, or status facts from this AI prompt.",
    ].join("\n")
    : "Authenticated member context: no";

  return [
    `Bot mode: ${botMode}`,
    memberContext,
    "Live command guide:",
    liveCommandGuide(botMode),
    "Knowledge base:",
    knowledge,
    "User message:",
    text,
  ].join("\n\n");
}

function liveCommandGuide(botMode: BotMode) {
  if (botMode === "public") {
    return [
      "MENU or HELP: show public options.",
      "JOIN: explain how to become a member.",
      "ANNOUNCEMENTS: show public notices.",
      "CONTACT or SUPPORT: explain how to reach officials.",
      "START and STOP: opt in or out of WhatsApp updates.",
      "If a public user asks for balances, receipts, payments, voting, welfare private details, or profile changes, tell them to use their registered member WhatsApp number or contact an official.",
    ].join("\n");
  }

  return [
    "MENU or HELP: show member options.",
    "PAY: start M-Pesa STK for pending contributions.",
    "CONTRIBUTE 500: start M-Pesa STK for a specific contribution amount.",
    "BALANCE: show pending contributions and arrears.",
    "WALLET: show wallet balance and recent wallet top-ups.",
    "FUND 500: start M-Pesa STK to top up wallet.",
    "WELFARE or KITTY: show active welfare cases.",
    "MEETING: show the next scheduled meeting.",
    "ANNOUNCEMENTS: show latest notices.",
    "PROFILE: show member status.",
    "RECEIPTS: show recent confirmed payments.",
    "NOTIFICATIONS: show unread alerts.",
    "START and STOP: opt in or out of WhatsApp updates.",
  ].join("\n");
}

function formatKnowledgeEntry(entry: KnowledgeEntry, index: number) {
  const terms = metadataTerms(entry.metadata);
  const termLine = terms.length ? `\nSearch terms: ${terms.join(", ")}` : "";
  return `${index + 1}. ${entry.title} [${entry.category}/${entry.bot_scope}]${termLine}\n${entry.content}`;
}

function extractOpenAIText(payload: OpenAIResponsePayload) {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  const parts = (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && content.text?.trim())
    .map((content) => content.text?.trim() ?? "");

  return parts.join("\n").trim();
}

function extractChatCompletionText(payload: ChatCompletionResponsePayload) {
  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  if (!raw) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (_error) {
    return {
      error: {
        message: raw.slice(0, 500),
      },
    } as T;
  }
}

function clampWhatsAppReply(text: string) {
  const trimmed = text.replace(/\n{3,}/g, "\n\n").trim();
  return trimmed.length > 1200 ? `${trimmed.slice(0, 1190)}...` : trimmed;
}

function getEnv(names: string | string[], fallback = "") {
  const keys = Array.isArray(names) ? names : [names];
  for (const key of keys) {
    const value = Deno.env.get(key)?.trim();
    if (value) {
      return value;
    }
  }

  return fallback;
}

function getNumberEnv(names: string | string[], fallback: number) {
  const value = Number.parseInt(getEnv(names), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function getPendingContributions(supabase: SupabaseClient, memberId: string): Promise<Contribution[]> {
  const { data, error } = await supabase
    .from("contributions")
    .select("id, amount, contribution_type, due_date, status")
    .eq("member_id", memberId)
    .in("status", ["pending", "missed"])
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Failed to fetch pending contributions:", error);
    return [];
  }

  return (data ?? []) as Contribution[];
}

async function createWhatsAppContribution(supabase: SupabaseClient, memberId: string, amount: number) {
  const { data, error } = await supabase
    .from("contributions")
    .insert({
      member_id: memberId,
      amount,
      contribution_type: "whatsapp",
      status: "pending",
      notes: "Initiated from WhatsApp",
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function ensureMemberWallet(supabase: SupabaseClient, memberId: string): Promise<MemberWallet> {
  const { data: existing, error: existingError } = await supabase
    .from("member_wallets")
    .select("id, member_id, balance, currency")
    .eq("member_id", memberId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as MemberWallet;
  }

  const { data: created, error: createError } = await supabase
    .from("member_wallets")
    .insert({ member_id: memberId })
    .select("id, member_id, balance, currency")
    .single();

  if (createError) {
    throw createError;
  }

  return created as MemberWallet;
}

async function initiateMpesaPayment(
  supabase: SupabaseClient,
  contact: ContactRecord,
  member: MemberProfile,
  amount: number,
  options: MpesaPaymentOptions,
) {
  assertMpesaConfigured();

  const contributionIds = options.contributionIds ?? [];
  const phoneNumber = toMpesaPhone(contact.phone_number || member.phone);
  const timestamp = generateMpesaTimestamp();
  const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);
  const accessToken = await getMpesaAccessToken();
  const accountReference = `${options.accountPrefix}-${(member.membership_number || member.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 9)}`;

  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(Number(amount)),
      PartyA: phoneNumber,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: options.transactionDesc,
    }),
  });

  const result = await response.json();
  if (!response.ok || result.errorCode || result.ResponseCode !== "0") {
    throw new Error(result.errorMessage || result.ResponseDescription || "M-Pesa STK push failed");
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("mpesa_transactions")
    .insert({
      transaction_type: options.transactionType ?? "stk_push",
      merchant_request_id: result.MerchantRequestID,
      checkout_request_id: result.CheckoutRequestID,
      amount,
      phone_number: phoneNumber,
      member_id: member.id,
      contribution_id: contributionIds.length === 1 ? contributionIds[0] : null,
      status: "pending",
      initiated_by: member.id,
    })
    .select("id")
    .single();

  if (transactionError) {
    throw transactionError;
  }

  const { error: intentError } = await supabase.from("whatsapp_payment_intents").insert({
    contact_id: contact.id,
    member_id: member.id,
    phone_number: contact.wa_id,
    amount,
    payment_purpose: options.purpose,
    contribution_ids: contributionIds,
    wallet_transaction_id: options.walletTransactionId ?? null,
    checkout_request_id: result.CheckoutRequestID,
    merchant_request_id: result.MerchantRequestID,
    mpesa_transaction_id: transaction.id,
    status: "stk_requested",
  });

  if (intentError) {
    throw intentError;
  }

  return { phoneNumber, checkoutRequestId: result.CheckoutRequestID };
}

async function getMpesaAccessToken() {
  const credentials = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "M-Pesa authentication failed");
  }

  return data.access_token as string;
}

async function sendAndLogText(
  supabase: SupabaseClient,
  contact: ContactRecord,
  memberId: string | null,
  text: string,
) {
  let result: Record<string, unknown> = {};
  let waMessageId: string | null = null;
  let status = "sent";

  try {
    result = await sendWhatsAppText(contact.wa_id, text);
    const messages = result?.messages as Array<{ id?: string }> | undefined;
    waMessageId = messages?.[0]?.id ?? null;
    status = waMessageId ? "sent" : "failed";
  } catch (error) {
    status = "failed";
    result = {
      error: error instanceof Error ? error.message : String(error),
    };
    console.error("Failed to send WhatsApp reply:", result);
  }

  const { error: outboundLogError } = await supabase.from("whatsapp_messages").insert({
    contact_id: contact.id,
    member_id: memberId,
    wa_message_id: waMessageId,
    direction: "outbound",
    message_type: "text",
    text_body: text,
    payload: result ?? {},
    status,
  });

  if (outboundLogError) {
    console.error("Failed to log outbound WhatsApp message:", outboundLogError);
  }

  const { error: contactUpdateError } = await supabase
    .from("whatsapp_contacts")
    .update({ last_outbound_at: new Date().toISOString() })
    .eq("id", contact.id);

  if (contactUpdateError) {
    console.error("Failed to update WhatsApp contact outbound timestamp:", contactUpdateError);
  }
}

function buildChatMessages(
  text: string,
  member: MemberProfile | null,
  botMode: BotMode,
  entries: KnowledgeEntry[],
) {
  return [
    {
      role: "system",
      content: buildAiInstructions(botMode),
    },
    {
      role: "user",
      content: buildAiInput(text, member, botMode, entries),
    },
  ];
}

async function sendWhatsAppText(to: string, text: string) {
  assertWhatsAppConfigured();

  const body = text.length > 3900 ? `${text.slice(0, 3890)}...` : text;
  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || "WhatsApp send failed");
  }

  return result;
}

async function resolveMemberByPhone(supabase: SupabaseClient, waId: string): Promise<MemberProfile | null> {
  const candidates = phoneCandidates(waId);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, membership_number, registration_fee_paid, status")
    .in("phone", candidates)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve WhatsApp member:", error);
    return null;
  }

  return (data as MemberProfile | null) ?? null;
}

async function upsertContact(
  supabase: SupabaseClient,
  waId: string,
  contactInfo: WhatsAppContactInfo | undefined,
  member: MemberProfile | null,
): Promise<ContactRecord> {
  const now = new Date().toISOString();
  const botMode: BotMode = member ? "member" : "public";
  const { data, error } = await supabase
    .from("whatsapp_contacts")
    .upsert({
      wa_id: normalizeDigits(waId),
      phone_number: normalizeDigits(waId),
      member_id: member?.id ?? null,
      profile_name: contactInfo?.profile?.name ?? member?.full_name ?? null,
      last_bot_mode: botMode,
      last_inbound_at: now,
      updated_at: now,
    }, { onConflict: "wa_id" })
    .select("id, wa_id, phone_number, member_id, last_bot_mode, opted_in")
    .single();

  if (error) {
    throw error;
  }

  return data as ContactRecord;
}

function extractMessageText(message: WhatsAppMessage) {
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;
  if (message.interactive?.button_reply?.title) return message.interactive.button_reply.title;
  if (message.interactive?.list_reply?.title) return message.interactive.list_reply.title;
  return "";
}

function rankKnowledgeEntries(query: string, entries: KnowledgeEntry[]) {
  return entries
    .map((entry) => ({
      entry,
      score: knowledgeScore(query, entry),
    }))
    .sort((a, b) => b.score - a.score);
}

function knowledgeScore(query: string, entry: KnowledgeEntry) {
  const queryTokens = tokenizeForSearch(query);
  if (!queryTokens.length) {
    return 0;
  }

  const titleTokens = new Set(tokenizeForSearch(`${entry.title} ${entry.category}`));
  const contentTokens = new Set(tokenizeForSearch(`${entry.content} ${metadataSearchText(entry.metadata)}`));
  const haystack = normalizeForSearch(`${entry.title} ${entry.category} ${entry.content} ${metadataSearchText(entry.metadata)}`);
  let score = 0;

  for (const token of queryTokens) {
    if (titleTokens.has(token)) {
      score += 5;
    }

    if (contentTokens.has(token)) {
      score += 2;
    }

    if (token.length >= 4 && Array.from(contentTokens).some((word) => word.startsWith(token) || token.startsWith(word))) {
      score += 1;
    }
  }

  const normalizedQuery = normalizeForSearch(query);
  if (normalizedQuery.length >= 5 && haystack.includes(normalizedQuery)) {
    score += 6;
  }

  return score;
}

function extractAmount(text: string) {
  const match = text.replace(/,/g, "").match(/\b(?:kes|ksh|k)?\s*(\d+(?:\.\d{1,2})?)\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function keywordScore(query: string, content: string) {
  const words = new Set(tokenizeForSearch(query));
  return tokenizeForSearch(content).reduce((score, word) => score + (words.has(word) ? 1 : 0), 0);
}

function tokenizeForSearch(value: string) {
  return normalizeForSearch(value)
    .split(" ")
    .filter((word) => word.length > 2 && !SEARCH_STOP_WORDS.has(word));
}

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metadataSearchText(metadata: KnowledgeEntry["metadata"]) {
  return metadata ? JSON.stringify(metadata) ?? "" : "";
}

function metadataTerms(metadata: KnowledgeEntry["metadata"]) {
  if (!metadata) {
    return [];
  }

  const value = metadata.search_terms;
  if (Array.isArray(value)) {
    return value.map((term) => String(term)).filter(Boolean).slice(0, 18);
  }

  if (typeof value === "string") {
    return value.split(",").map((term) => term.trim()).filter(Boolean).slice(0, 18);
  }

  return [];
}

function phoneCandidates(phone: string) {
  const digits = normalizeDigits(phone);
  const candidates = new Set<string>([digits, `+${digits}`]);

  if (digits.startsWith("254") && digits.length === 12) {
    candidates.add(`0${digits.slice(3)}`);
    candidates.add(digits.slice(3));
  }

  if (digits.startsWith("0") && digits.length === 10) {
    candidates.add(`254${digits.slice(1)}`);
    candidates.add(`+254${digits.slice(1)}`);
  }

  return Array.from(candidates).filter(Boolean);
}

function toMpesaPhone(phone: string) {
  const digits = normalizeDigits(phone);
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) return `254${digits}`;
  throw new Error("M-Pesa payments require a Kenyan phone number");
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function generateMpesaTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function formatMoney(value: number) {
  return Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  });
}

function formatPhoneForDisplay(phone: string) {
  const digits = normalizeDigits(phone);
  if (digits.startsWith("254") && digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function assertWhatsAppConfigured() {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp credentials are not configured");
  }
}

function webhookHealthResponse() {
  return jsonResponse({
    ok: true,
    function: "whatsapp-webhook",
    checked_at: new Date().toISOString(),
    configured: {
      supabase_url: Boolean(SUPABASE_URL),
      service_role: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      verify_token: Boolean(WHATSAPP_VERIFY_TOKEN),
      app_secret: Boolean(WHATSAPP_APP_SECRET),
      access_token: Boolean(WHATSAPP_ACCESS_TOKEN),
      phone_number_id: Boolean(WHATSAPP_PHONE_NUMBER_ID),
      ai_provider: selectedAiProvider(),
      groq: Boolean(GROQ_API_KEY),
      openai: Boolean(OPENAI_API_KEY),
      mpesa: Boolean(MPESA_CONSUMER_KEY && MPESA_CONSUMER_SECRET && MPESA_PASSKEY && MPESA_SHORTCODE),
    },
  }, 200);
}

function selectedAiProvider() {
  if ((AI_PROVIDER === "auto" || AI_PROVIDER === "groq") && GROQ_API_KEY) {
    return "groq";
  }

  if ((AI_PROVIDER === "auto" || AI_PROVIDER === "openai") && OPENAI_API_KEY) {
    return "openai";
  }

  return "none";
}

function assertMpesaConfigured() {
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_PASSKEY || !MPESA_SHORTCODE) {
    throw new Error("M-Pesa credentials are not configured");
  }
}

async function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = signatureHeader.replace("sha256=", "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WHATSAPP_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const actual = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(actual, expected);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
