import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse } from "../_shared/http.ts";
import { escapeHtml, sendBrevoEmail } from "../_shared/brevo.ts";
import {
  createServiceClient,
  getUserRoles,
  normalizeKenyanPhone,
  parsePositiveAmount,
} from "../_shared/mpesa.ts";

type SupabaseClient = ReturnType<typeof createServiceClient>;

type Profile = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  membership_number: string | null;
  status: string | null;
  registration_fee_paid: boolean | null;
  id_number?: string | null;
  location?: string | null;
  occupation?: string | null;
  employment_status?: string | null;
  education_level?: string | null;
  interests?: string[] | null;
  additional_notes?: string | null;
  registration_progress?: number | null;
  registration_completed_at?: string | null;
};

type RegistrationStep =
  | "confirm_phone"
  | "awaiting_email"
  | "awaiting_email_otp"
  | "awaiting_profile_required"
  | "awaiting_profile_optional"
  | "completed";

type RegistrationState = {
  step: RegistrationStep;
  registration_phone?: string;
  email?: string;
  started_at?: string;
  updated_at?: string;
  otp_sent_at?: string;
};

type RegistrationRequest = {
  id: string;
  whatsapp_phone: string;
  registration_phone: string;
  email: string | null;
  email_verified_at: string | null;
  email_otp_hash: string | null;
  email_otp_expires_at: string | null;
  email_otp_attempts: number;
  email_otp_sent_at: string | null;
  full_name: string | null;
  id_number: string | null;
  location: string | null;
  occupation: string | null;
  employment_status: string | null;
  education_level: string | null;
  interests: string[] | null;
  additional_notes: string | null;
  profile_progress: number;
  profile_completed_at: string | null;
  status: string;
};

type SessionState = {
  pending_intent?: Partial<ParsedIntent>;
  registration?: RegistrationState;
  asked_for?: string[];
  updated_at?: string;
};

type WhatsappSession = {
  id: string;
  phone: string;
  profile_id: string | null;
  preferred_language: "auto" | "en" | "sw";
  last_intent: string | null;
  state: SessionState | null;
  last_seen_at?: string | null;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  awaiting_response?: boolean | null;
  awaiting_response_since?: string | null;
  inactivity_notice_sent_at?: string | null;
  abandoned_at?: string | null;
  welcome_back_sent_at?: string | null;
};

type InboundMessage = {
  providerMessageId: string;
  from: string;
  phone: string;
  text: string;
  type: string;
  phoneNumberId: string | null;
  raw: Record<string, unknown>;
};

type IntentName =
  | "help"
  | "query_profile"
  | "query_contributions"
  | "query_wallet"
  | "query_announcements"
  | "query_meetings"
  | "query_welfare"
  | "record_contribution"
  | "record_expenditure"
  | "create_welfare_case"
  | "update_profile"
  | "unknown";

type ParsedIntent = {
  intent: IntentName;
  confidence: number;
  language: "auto" | "en" | "sw";
  amount?: number | null;
  contribution_type?: string | null;
  payment_method?: string | null;
  transaction_date?: string | null;
  description?: string | null;
  category?: string | null;
  case_type?: string | null;
  title?: string | null;
  payee?: string | null;
  reference_number?: string | null;
  target_member?: string | null;
  profile_updates?: ProfileUpdates | null;
  raw?: Record<string, unknown>;
};

type ExecutionResult = {
  actionStatus: "completed" | "needs_clarification" | "failed" | "blocked";
  reply: string;
  result: Record<string, unknown>;
  contributionId?: string | null;
  expenditureId?: string | null;
  welfareCaseId?: string | null;
  nextState?: SessionState;
};

type FinanceContext = {
  contributions: Array<{
    id: string;
    amount: number;
    contribution_type: string;
    status: string | null;
    created_at: string | null;
    paid_at: string | null;
    reference_number: string | null;
  }>;
  wallet: { balance: number; currency: string; status: string } | null;
};

type ConversationRating = {
  emoji: string;
  score: number;
  label: string;
};

const INTENTS = new Set<IntentName>([
  "help",
  "query_profile",
  "query_contributions",
  "query_wallet",
  "query_announcements",
  "query_meetings",
  "query_welfare",
  "record_contribution",
  "record_expenditure",
  "create_welfare_case",
  "update_profile",
  "unknown",
]);

const PAYMENT_METHODS = new Set(["manual", "automatic", "cash", "bank", "mpesa", "wallet"]);
const FINANCE_ROLES = new Set(["admin", "treasurer"]);
const OFFICIAL_ROLES = new Set(["admin", "treasurer", "chairperson", "secretary", "patron", "coordinator", "organizing_secretary"]);
const CONVERSATION_RATINGS: ConversationRating[] = [
  { emoji: "😍", score: 5, label: "excellent" },
  { emoji: "😊", score: 4, label: "good" },
  { emoji: "😐", score: 3, label: "okay" },
  { emoji: "🙁", score: 2, label: "poor" },
  { emoji: "😡", score: 1, label: "bad" },
];
const RATING_PROMPT = `\n\nRate this chat: ${CONVERSATION_RATINGS.map((rating) => rating.emoji).join(" ")}`;
const REGISTRATION_OTP_LENGTH = 6;
const REGISTRATION_OTP_TTL_SECONDS = 10 * 60;
const REGISTRATION_OTP_RESEND_SECONDS = 60;
const REGISTRATION_OTP_MAX_ATTEMPTS = 5;
const DEFAULT_ABANDONMENT_MINUTES = 3;
const PROFILE_SELECT =
  "id, full_name, phone, email, membership_number, status, registration_fee_paid, id_number, location, occupation, employment_status, education_level, interests, additional_notes, registration_progress, registration_completed_at";
const REGISTRATION_REQUEST_SELECT =
  "id, whatsapp_phone, registration_phone, email, email_verified_at, email_otp_hash, email_otp_expires_at, email_otp_attempts, email_otp_sent_at, full_name, id_number, location, occupation, employment_status, education_level, interests, additional_notes, profile_progress, profile_completed_at, status";
const REGISTRATION_INTENT_PATTERN =
  /\b(register|registration|join|joining|member|membership|interested|interest|intrest|sign\s*up|sign\s*me\s*up|apply|application|enroll|enrol|become\s+(a\s+)?member|be\s+part|part\s+of\s+(the\s+)?(community|group|cbo)|community|cbo|group|turuturu\s+stars|sajili|usajili|jiunge|kujiunga|nataka\s+kuingia|kuwa\s+mwanachama|mwanachama)\b/i;

type AiProvider = {
  name: "groq" | "openai";
  endpoint: string;
  apiKey: string;
  model: string;
};

type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function clampConfidence(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.4;
  return Math.max(0, Math.min(1, Number(numeric.toFixed(3))));
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function configuredAiProvider(): AiProvider | null {
  const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
  if (groqApiKey) {
    return {
      name: "groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: groqApiKey,
      model: Deno.env.get("GROQ_MODEL")?.trim() || "llama-3.3-70b-versatile",
    };
  }

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (openaiApiKey) {
    return {
      name: "openai",
      endpoint: "https://api.openai.com/v1/chat/completions",
      apiKey: openaiApiKey,
      model: Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini",
    };
  }

  return null;
}

function parseAiJson(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Some providers can still wrap JSON when under pressure. Try the object body below.
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;

  try {
    const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1)) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

async function requestAiJson(
  messages: AiMessage[],
  options: { task: string; temperature: number; timeoutMs: number },
): Promise<Record<string, unknown> | null> {
  const provider = configuredAiProvider();
  if (!provider) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(provider.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: options.temperature,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      console.error(`${provider.name} ${options.task} failed`, response.status, payload);
      return null;
    }

    const choices = payload?.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = cleanString(message?.content);
    if (!content) {
      console.error(`${provider.name} ${options.task} returned empty content`);
      return null;
    }

    const parsed = parseAiJson(content);
    if (!parsed) {
      console.error(`${provider.name} ${options.task} returned non-JSON content`);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(`AI ${options.task} unavailable via ${provider.name}, using local parser`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePhoneForStorage(phone: string): string {
  try {
    return normalizeKenyanPhone(phone);
  } catch {
    const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
    return digits || phone.trim();
  }
}

function phoneLookupVariants(phone: string): string[] {
  const variants = new Set<string>();
  const raw = phone.trim();
  const stripped = raw.replace(/[^\d+]/g, "");
  if (raw) variants.add(raw);
  if (stripped) variants.add(stripped);

  try {
    const normalized = normalizeKenyanPhone(phone);
    variants.add(normalized);
    variants.add(`+${normalized}`);
    if (normalized.startsWith("254")) {
      variants.add(`0${normalized.slice(3)}`);
      variants.add(normalized.slice(3));
    }
  } catch {
    // Non-Kenyan numbers are still logged, but only registered Kenyan numbers are actionable.
  }

  return Array.from(variants);
}

function isOfficial(roles: string[]): boolean {
  return roles.some((role) => OFFICIAL_ROLES.has(role));
}

function canRecordFinance(profile: Profile, roles: string[]): boolean {
  if (roles.some((role) => FINANCE_ROLES.has(role))) return true;
  return profile.status === "active";
}

function extractText(message: Record<string, unknown>): string {
  const type = String(message.type || "");
  const text = message.text as Record<string, unknown> | undefined;
  const button = message.button as Record<string, unknown> | undefined;
  const interactive = message.interactive as Record<string, unknown> | undefined;
  const image = message.image as Record<string, unknown> | undefined;
  const document = message.document as Record<string, unknown> | undefined;

  if (type === "text" && typeof text?.body === "string") return text.body.trim();
  if (type === "button" && typeof button?.text === "string") return button.text.trim();
  if (type === "image" && typeof image?.caption === "string") return image.caption.trim();
  if (type === "document" && typeof document?.caption === "string") return document.caption.trim();

  const buttonReply = interactive?.button_reply as Record<string, unknown> | undefined;
  const listReply = interactive?.list_reply as Record<string, unknown> | undefined;
  if (typeof buttonReply?.title === "string") return buttonReply.title.trim();
  if (typeof buttonReply?.id === "string") return buttonReply.id.trim();
  if (typeof listReply?.title === "string") return listReply.title.trim();
  if (typeof listReply?.description === "string") return listReply.description.trim();
  if (typeof listReply?.id === "string") return listReply.id.trim();

  return "";
}

function extractInboundMessages(payload: Record<string, unknown>): InboundMessage[] {
  const output: InboundMessage[] = [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray((entry as Record<string, unknown>).changes)
      ? ((entry as Record<string, unknown>).changes as Array<Record<string, unknown>>)
      : [];

    for (const change of changes) {
      const value = (change.value || {}) as Record<string, unknown>;
      const metadata = (value.metadata || {}) as Record<string, unknown>;
      const phoneNumberId = cleanString(metadata.phone_number_id);
      const messages = Array.isArray(value.messages) ? value.messages : [];

      for (const rawMessage of messages) {
        const message = rawMessage as Record<string, unknown>;
        const providerMessageId = cleanString(message.id) || crypto.randomUUID();
        const from = cleanString(message.from) || "";
        if (!from) continue;

        output.push({
          providerMessageId,
          from,
          phone: normalizePhoneForStorage(from),
          text: extractText(message),
          type: cleanString(message.type) || "unknown",
          phoneNumberId,
          raw: message,
        });
      }
    }
  }

  return output;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

async function verifyMetaSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const secret = Deno.env.get("WHATSAPP_APP_SECRET")?.trim();
  if (!secret) return true;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = bytesToHex(new Uint8Array(signature));
  const actual = signatureHeader.slice("sha256=".length).trim();
  return constantTimeCompare(actual, expected);
}

function normalizeContributionType(value: unknown, text = ""): string {
  const raw = `${cleanString(value) || ""} ${text}`.toLowerCase();
  if (/(registration|usajili|joining|join)/i.test(raw)) return "registration";
  if (/(membership|member fee|ada|subscription|annual|yearly)/i.test(raw)) return "membership_fee";
  if (/(welfare|ustawi|msiba|matanga|medical|hospital|benevolent)/i.test(raw)) return "welfare";
  if (/(kitty|chama|merry|round)/i.test(raw)) return "kitty";
  if (/(project|mradi|school|education|program)/i.test(raw)) return "project";
  if (/(donation|donate|msaada|support)/i.test(raw)) return "donation";
  if (/(monthly|month|mwezi)/i.test(raw)) return "monthly";
  return "general";
}

function normalizePaymentMethod(value: unknown, text = ""): string {
  const raw = `${cleanString(value) || ""} ${text}`.toLowerCase();
  if (/(m-pesa|mpesa|mobile money|paybill|till)/i.test(raw)) return "mpesa";
  if (/(cash|taslimu)/i.test(raw)) return "cash";
  if (/(bank|cheque|wire)/i.test(raw)) return "bank";
  if (/(wallet|mkoba)/i.test(raw)) return "wallet";
  const explicit = cleanString(value)?.toLowerCase();
  return explicit && PAYMENT_METHODS.has(explicit) ? explicit : "manual";
}

function inferWelfareCaseType(text: string, value?: unknown): string {
  const raw = `${cleanString(value) || ""} ${text}`.toLowerCase();
  if (/(medical|hospital|clinic|medicine|matibabu|mgonjwa|sick|illness|health)/i.test(raw)) return "medical";
  if (/(bereavement|funeral|burial|msiba|matanga|death|passed away|mourning)/i.test(raw)) return "bereavement";
  if (/(school|education|fees|student|bursary|masomo|elimu)/i.test(raw)) return "education";
  if (/(emergency|urgent|crisis|dharura)/i.test(raw)) return "emergency";
  if (/(welfare|support|ustawi|msaada)/i.test(raw)) return "welfare";
  return cleanString(value)?.toLowerCase() || "welfare";
}

function extractWelfareTitle(text: string, explicitTitle?: unknown): string | null {
  const title = cleanString(explicitTitle);
  if (title) return shorten(title.replace(/^["']|["']$/g, ""), 120);

  const quoted = text.match(/["']([^"']{4,120})["']/);
  if (quoted) return quoted[1].trim();

  const afterFor = text.match(/\b(?:for|kwa|ya)\s+([^,.;\n]{3,80})/i);
  if (afterFor) {
    const candidate = afterFor[1]
      .replace(/\b(?:target|amount|ksh|kes|shs?|ref|reference)\b.*$/i, "")
      .trim();
    if (candidate.length >= 3) return shorten(candidate, 120);
  }

  const withoutCommand = text
    .replace(/\b(?:create|add|open|start|record|new|fungua|ongeza|tengeneza)\b/gi, "")
    .replace(/\b(?:welfare|case|kesi)\b/gi, "")
    .replace(/\b(?:target|amount|ksh|kes|shs?|ref|reference)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return withoutCommand.length >= 4 ? shorten(withoutCommand, 120) : null;
}

function inferExpenseCategory(text: string, value?: unknown): string {
  const raw = `${cleanString(value) || ""} ${text}`.toLowerCase();
  if (/(fare|fuel|transport|travel|nauli|mafuta)/i.test(raw)) return "transport";
  if (/(office|stationery|printing|print|admin|communication|airtime|bundle|internet)/i.test(raw)) return "administration";
  if (/(bank|mpesa|m-pesa|charge|fee|transaction)/i.test(raw)) return "finance charges";
  if (/(welfare|hospital|medical|msiba|matanga|support)/i.test(raw)) return "welfare";
  if (/(refund|reversal|return)/i.test(raw)) return "refund";
  if (/(food|meal|catering|refreshment|chakula)/i.test(raw)) return "catering";
  return cleanString(value) || "other";
}

function detectLanguage(text: string): "en" | "sw" {
  const normalized = text.toLowerCase();
  return /\b(nime|tume|tafadhali|mchango|malipo|matumizi|nadaiwa|deni|salio|habari|mkoba|kutumia|nimelipa|shilingi|mia|elfu|leo|jana|jina|naitwa|mahali|mtaa|kijiji|naishi|nakaa|niko|kazi|elimu|ajira|sajili|usajili)\b/i
    .test(normalized)
    ? "sw"
    : "en";
}

function normalizePhoneForProfile(phone: string): string | null {
  try {
    return `+${normalizeKenyanPhone(phone)}`;
  } catch {
    return null;
  }
}

function normalizePhoneForWhatsapp(phone: string): string | null {
  try {
    return normalizeKenyanPhone(phone);
  } catch {
    return null;
  }
}

function displayPhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

function isRegistrationInterest(text: string): boolean {
  return REGISTRATION_INTENT_PATTERN.test(text);
}

async function aiDetectRegistrationInterest(text: string): Promise<boolean | null> {
  if (!text.trim()) return null;

  const parsed = await requestAiJson(
    [
      {
        role: "system",
        content: [
          "Classify whether a WhatsApp message means the sender wants to register, join, apply for, or become part of Turuturu Stars community membership.",
          "Understand English, Kiswahili, Sheng, typos, and indirect phrasing like 'how do I become a member' or 'I want to be part of the group'.",
          "Return JSON only with keys: wants_registration boolean, confidence number from 0 to 1.",
        ].join(" "),
      },
      {
        role: "user",
        content: text,
      },
    ],
    { task: "registration classifier", temperature: 0, timeoutMs: 5000 },
  );
  if (!parsed) return null;

  const confidence = clampConfidence(parsed.confidence);
  return parsed.wants_registration === true && confidence >= 0.55;
}

async function detectRegistrationInterest(text: string): Promise<boolean> {
  if (isRegistrationInterest(text)) return true;
  const aiDecision = await aiDetectRegistrationInterest(text);
  return aiDecision === true;
}

function isAffirmative(text: string): boolean {
  return /^(yes|y|yeah|yep|correct|true|ok|okay|sawa|ndio|ndiyo|hiyo|it is|this is my number|use this number)$/i
    .test(text.trim());
}

function isNegative(text: string): boolean {
  return /^(no|n|nope|sio|hapana|not this|not mine|wrong number)$/i.test(text.trim());
}

function isCancel(text: string): boolean {
  return /^(cancel|stop|exit|acha|sitaki)$/i.test(text.trim());
}

function isNoEmail(text: string): boolean {
  return /^(no email|no|sina email|i do not have email|i don't have email|dont have email)$/i.test(text.trim());
}

function extractEmail(text: string): string | null {
  const match = text.trim().match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function extractOtpCode(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  return digits.length === REGISTRATION_OTP_LENGTH ? digits : null;
}

function registrationGateReply(language: "en" | "sw"): string {
  if (language === "sw") {
    return [
      "Nambari hii haijaunganishwa na member aliyesajiliwa wa Turuturu Stars.",
      "Kwa sasa siwezi kufungua huduma za member priority kutoka kwa nambari hii.",
      "Reply REGISTER kuanza usajili wa kuongozwa, au tuma ujumbe ukitumia nambari yako iliyosajiliwa.",
    ].join("\n");
  }

  return [
    "This number is not linked to a registered Turuturu Stars member.",
    "Member-priority services stay locked until you message from the registered number.",
    "Reply REGISTER to start guided registration, or message us from your registered number.",
  ].join("\n");
}

function registrationConfirmPhoneReply(phone: string, language: "en" | "sw"): string {
  const formatted = displayPhone(phone);
  if (language === "sw") {
    return [
      "Karibu. Nitakuongoza hatua kwa hatua.",
      `Je, ${formatted} ndiyo nambari unayotaka kutumia kwa usajili wa Turuturu Stars?`,
      "Reply YES kuthibitisha. Kwa usalama, access ya member itaruhusiwa tu kwa nambari iliyosajiliwa.",
    ].join("\n");
  }

  return [
    "Welcome. I will guide you step by step.",
    `Is ${formatted} the number you intend to use for Turuturu Stars registration?`,
    "Reply YES to confirm. For security, member access will only work from the registered number.",
  ].join("\n");
}

function registrationAskEmailReply(language: "en" | "sw"): string {
  if (language === "sw") {
    return [
      "Asante. Nimehifadhi nambari hiyo kwa ombi lako la usajili.",
      "Je, una email? Reply na email yako, au reply NO EMAIL kama huna.",
    ].join("\n");
  }

  return [
    "Thanks. I have captured that phone number for your registration request.",
    "Do you have an email address? Reply with your email, or reply NO EMAIL if you do not have one.",
  ].join("\n");
}

function registrationOtpSentReply(email: string, language: "en" | "sw"): string {
  if (language === "sw") {
    return [
      `Nimetuma OTP ya tarakimu 6 kwa ${email}.`,
      "Reply hapa na OTP hiyo ndani ya dakika 10 ili kuthibitisha email yako.",
      "Unaweza kuandika RESEND kama code haijafika.",
    ].join("\n");
  }

  return [
    `I sent a 6-digit OTP to ${email}.`,
    "Reply here with that OTP within 10 minutes to verify your email.",
    "You can type RESEND if the code does not arrive.",
  ].join("\n");
}

function registrationCompleteReply(language: "en" | "sw"): string {
  if (language === "sw") {
    return [
      "Email yako imethibitishwa na ombi lako la usajili limehifadhiwa.",
      "Admin ata-review ombi lako. Hadi nambari yako iidhinishwe kama member, huduma za member priority zitabaki zimefungwa.",
    ].join("\n");
  }

  return [
    "Your email is verified and your registration request has been saved.",
    "An admin will review it. Until your number is approved as a member, member-priority services remain locked.",
  ].join("\n");
}

function registrationNoEmailSavedReply(language: "en" | "sw"): string {
  if (language === "sw") {
    return "Nimehifadhi ombi lako. Admin atakusaidia kukamilisha usajili bila email. Huduma za member priority zitabaki zimefungwa hadi uidhinishwe.";
  }

  return "I have saved your request. An admin will help you finish registration without email. Member-priority services remain locked until approval.";
}

function registrationCancelledReply(language: "en" | "sw"): string {
  return language === "sw"
    ? "Nimesitisha usajili huu. Reply REGISTER ukitaka kuanza tena."
    : "I have cancelled this registration flow. Reply REGISTER whenever you want to start again.";
}

function generateOtpCode(): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return random.toString().padStart(REGISTRATION_OTP_LENGTH, "0");
}

function registrationOtpPepper(): string {
  const pepper =
    Deno.env.get("WHATSAPP_REGISTRATION_OTP_PEPPER")?.trim() ||
    Deno.env.get("SMS_VERIFICATION_PEPPER")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!pepper) {
    throw new HttpError(500, "Missing WHATSAPP_REGISTRATION_OTP_PEPPER or SMS_VERIFICATION_PEPPER.");
  }

  return pepper;
}

async function hashEmailOtp(email: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`${email.toLowerCase()}:${code}:${registrationOtpPepper()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

async function sendRegistrationOtpEmail(email: string, code: string): Promise<void> {
  const safeCode = escapeHtml(code);
  const safeEmail = escapeHtml(email);
  const expiresMinutes = Math.max(1, Math.ceil(REGISTRATION_OTP_TTL_SECONDS / 60));

  await sendBrevoEmail({
    to: [{ email }],
    subject: "Your Turuturu Stars registration OTP",
    textContent:
      `Your Turuturu Stars registration OTP is ${code}.\n\n` +
      `It expires in ${expiresMinutes} minutes. If you did not request registration, ignore this email.\n\n` +
      "Turuturu Stars",
    htmlContent: `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;font-weight:700;">Turuturu Stars</p>
                <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0f172a;">Registration OTP</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 28px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Use this code to verify ${safeEmail} for your Turuturu Stars registration request.</p>
                <p style="margin:0 0 18px;font-size:32px;letter-spacing:8px;font-weight:700;color:#0f172a;">${safeCode}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">This code expires in ${expiresMinutes} minutes. If you did not request it, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    tags: ["turuturu-stars", "whatsapp-registration-otp"],
  });
}

function extractAmount(text: string): number | null {
  const normalized = text.toLowerCase().replace(/,/g, "");
  const shorthand = normalized.match(/\b(\d+(?:\.\d+)?)\s*k\b/);
  if (shorthand) {
    const amount = Number(shorthand[1]) * 1000;
    return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : null;
  }

  const prefixed = normalized.match(/\b(?:ksh|kes|shs?|shilingi|bob|amount|kiasi|jumla|target|goal|lengo)\s*(\d+(?:\.\d{1,2})?)\b/i);
  const suffixed = normalized.match(/(?:^|[^a-z0-9])(\d+(?:\.\d{1,2})?)\s*(?:\/=|ksh|kes|shs?|shilingi|bob)\b/i);
  const standalone = normalized.match(/(?:^|[^a-z0-9])(\d+(?:\.\d{1,2})?)(?![a-z0-9])/i);
  const explicit = prefixed || suffixed || standalone;
  if (explicit) {
    const amount = Number(explicit[1]);
    if (Number.isFinite(amount) && amount > 0) return Number(amount.toFixed(2));
  }

  const wordAmounts: Array<[RegExp, number]> = [
    [/\belfu\s+kumi\b/i, 10000],
    [/\belfu\s+tano\b/i, 5000],
    [/\belfu\s+mbili\b/i, 2000],
    [/\belfu\s+moja\b/i, 1000],
    [/\bmia\s+tano\b/i, 500],
    [/\bmia\s+nne\b/i, 400],
    [/\bmia\s+tatu\b/i, 300],
    [/\bmia\s+mbili\b/i, 200],
    [/\bmia\s+moja\b/i, 100],
  ];

  for (const [pattern, amount] of wordAmounts) {
    if (pattern.test(text)) return amount;
  }

  return null;
}

function extractReference(text: string): string | null {
  const explicit = text.match(/\b(?:ref|reference|receipt|risiti|mpesa|m-pesa)\s*[:#-]?\s*([a-z0-9-]{5,20})\b/i);
  if (explicit) return explicit[1].toUpperCase();

  const receipt = text.match(/\b(?=[A-Z0-9]{8,12}\b)(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]+\b/);
  return receipt ? receipt[0].toUpperCase() : null;
}

type ProfileUpdates = {
  full_name?: string;
  id_number?: string;
  email?: string | null;
  location?: string;
  occupation?: string;
  employment_status?: string;
  education_level?: string;
  interests?: string[];
  additional_notes?: string;
};

type ProfileUpdateKey = keyof ProfileUpdates;

const PROFILE_UPDATE_KEYS: ProfileUpdateKey[] = [
  "full_name",
  "id_number",
  "email",
  "location",
  "occupation",
  "employment_status",
  "education_level",
  "interests",
  "additional_notes",
];

const PROFILE_REQUIRED_KEYS: Array<"full_name" | "phone" | "id_number" | "location"> = [
  "full_name",
  "phone",
  "id_number",
  "location",
];

const PROFILE_LABEL_LOOKAHEAD =
  "(?:full\\s*name|name|jina|id(?:\\s*number)?|kitambulisho|email|location|mahali|mtaa|kijiji|occupation|job|work|kazi|employment|ajira|education|elimu|interests?|notes?|maelezo)";

const PROFILE_FIELD_LABELS_EN: Record<string, string> = {
  full_name: "full name",
  phone: "phone",
  id_number: "ID number",
  email: "email",
  location: "location",
  occupation: "occupation",
  employment_status: "employment status",
  education_level: "education level",
  interests: "interests",
  additional_notes: "notes",
};

const PROFILE_FIELD_LABELS_SW: Record<string, string> = {
  full_name: "jina kamili",
  phone: "nambari ya simu",
  id_number: "nambari ya ID",
  email: "email",
  location: "mahali unapoishi",
  occupation: "kazi",
  employment_status: "hali ya ajira",
  education_level: "kiwango cha elimu",
  interests: "interests",
  additional_notes: "maelezo ya ziada",
};

function profileFieldLabel(key: string, language: "auto" | "en" | "sw"): string {
  const labels = language === "sw" ? PROFILE_FIELD_LABELS_SW : PROFILE_FIELD_LABELS_EN;
  return labels[key] || key.replace(/_/g, " ");
}

function cleanProfileValue(value: unknown, max = 120): string | null {
  const cleaned = cleanString(value)
    ?.replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || /^(skip|none|null|n\/a|hakuna|sina)$/i.test(cleaned)) return null;
  return shorten(cleaned, max);
}

function normalizeIdNumberValue(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const digits = cleaned.replace(/\D/g, "");
  return /^\d{6,8}$/.test(digits) ? digits : null;
}

function normalizeEmploymentStatus(value: unknown): string | null {
  const raw = cleanString(value)?.toLowerCase();
  if (!raw) return null;
  if (/\b(self[-\s]?employed|business|biashara|kujiajiri|jiajiri|mfanyabiashara)\b/i.test(raw)) return "self_employed";
  if (/\b(employed|employee|nimeajiriwa|ajiriwa|kazini)\b/i.test(raw)) return "employed";
  if (/\b(unemployed|sina kazi|not working|jobless)\b/i.test(raw)) return "unemployed";
  if (/\b(student|mwanafunzi|college|university)\b/i.test(raw)) return "student";
  if (/\b(retired|mstaafu)\b/i.test(raw)) return "retired";
  if (/\b(casual|contract|temporary|part[-\s]?time|full[-\s]?time)\b/i.test(raw)) return raw.replace(/\s+/g, "_");
  return null;
}

function normalizeEducationLevel(value: unknown): string | null {
  const raw = cleanString(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (/\b(primary|msingi)\b/i.test(lower)) return "primary";
  if (/\b(secondary|high school|form four|kidato)\b/i.test(lower)) return "secondary";
  if (/\b(certificate|cert)\b/i.test(lower)) return "certificate";
  if (/\b(diploma)\b/i.test(lower)) return "diploma";
  if (/\b(degree|bachelor|university|chuo kikuu)\b/i.test(lower)) return "degree";
  if (/\b(master|masters|msc|ma)\b/i.test(lower)) return "masters";
  if (/\b(phd|doctorate)\b/i.test(lower)) return "phd";
  return cleanProfileValue(raw, 80);
}

function splitInterests(value: unknown): string[] | null {
  const source = Array.isArray(value) ? value.join(", ") : cleanString(value);
  if (!source) return null;
  const interests = source
    .replace(/\b(?:interests?|napenda|ninapenda|areas?|ni|are|:|-)\b/gi, " ")
    .split(/,|;|&|\band\b|\bna\b|\n/i)
    .map((item) => cleanProfileValue(item, 40))
    .filter((item): item is string => Boolean(item));

  const unique = Array.from(new Set(interests));
  return unique.length ? unique.slice(0, 8) : null;
}

function firstProfileMatch(text: string, patterns: RegExp[], max = 120): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = cleanProfileValue(match?.[1], max);
    if (value) return value;
  }
  return null;
}

function extractLabeledProfileValue(text: string, labels: string, max = 120): string | null {
  const pattern = new RegExp(
    `(?:^|[\\s,;])(?:${labels})\\s*(?:yangu\\s+ni|is|ni|=|:|-|to|as|ya)?\\s*([^,;\\n.]+?)(?=\\s+${PROFILE_LABEL_LOOKAHEAD}\\b|[,;\\n.]|$)`,
    "i",
  );
  const match = text.match(pattern);
  return cleanProfileValue(match?.[1], max);
}

function assignExplicitProfileUpdates(updates: ProfileUpdates, explicit: unknown): void {
  if (!explicit || typeof explicit !== "object" || Array.isArray(explicit)) return;
  const input = explicit as Record<string, unknown>;

  const fullName = cleanProfileValue(input.full_name || input.name, 120);
  if (fullName) updates.full_name = fullName;

  const idNumber = normalizeIdNumberValue(input.id_number || input.national_id);
  if (idNumber) updates.id_number = idNumber;

  const email = cleanString(input.email);
  if (email && extractEmail(email)) updates.email = extractEmail(email);

  const location = cleanProfileValue(input.location || input.area || input.village, 100);
  if (location) updates.location = location;

  const occupation = cleanProfileValue(input.occupation || input.job || input.work, 100);
  if (occupation) updates.occupation = occupation;

  const employmentStatus = normalizeEmploymentStatus(input.employment_status);
  if (employmentStatus) updates.employment_status = employmentStatus;

  const educationLevel = normalizeEducationLevel(input.education_level || input.education);
  if (educationLevel) updates.education_level = educationLevel;

  const interests = splitInterests(input.interests);
  if (interests) updates.interests = interests;

  const notes = cleanProfileValue(input.additional_notes || input.notes, 300);
  if (notes) updates.additional_notes = notes;
}

function extractProfileUpdates(text: string, explicit?: unknown): ProfileUpdates {
  const updates: ProfileUpdates = {};
  assignExplicitProfileUpdates(updates, explicit);

  const email = extractEmail(text);
  if (email) updates.email = email;

  const fullName = firstProfileMatch(text, [
    /\b(?:my\s+name\s+is|full\s+name\s+is|name\s+is|naitwa|jina\s+langu\s+ni|jina\s+ni)\s+([^,;.\n]{3,120})/i,
    /\b(?:full\s*name|name|jina)\s*[:=-]\s*([^,;.\n]{3,120})/i,
  ], 120);
  if (fullName) updates.full_name = fullName;

  const idNumber = normalizeIdNumberValue(
    firstProfileMatch(text, [
      /\b(?:id(?:\s*number)?|national\s+id|kitambulisho)\s*(?:yangu\s+ni|is|ni|:|#|-)?\s*(\d{6,8})\b/i,
    ], 20),
  );
  if (idNumber) updates.id_number = idNumber;

  const location =
    extractLabeledProfileValue(text, "(?:location|place|area|village|estate|mahali|mtaa|kijiji)", 100) ||
    firstProfileMatch(text, [
      /\b(?:i\s+live\s+in|i\s+stay\s+in|i\s+am\s+based\s+in|am\s+based\s+in|naishi|nakaa|natoka)\s+([^,;.\n]{2,100})/i,
      /\bniko\s+(?!na\b)(?:kwa\s+)?([^,;.\n]{2,100})/i,
    ], 100);
  if (location) updates.location = location;

  const occupation =
    extractLabeledProfileValue(text, "(?:occupation|job|work|kazi)", 100) ||
    firstProfileMatch(text, [
      /\b(?:i\s+work\s+as|i\s+work\s+in|nafanya\s+kazi\s+ya|nafanya\s+kazi\s+kama|kazi\s+yangu\s+ni)\s+([^,;.\n]{2,100})/i,
    ], 100);
  if (occupation) updates.occupation = occupation;

  const employmentStatus =
    normalizeEmploymentStatus(extractLabeledProfileValue(text, "(?:employment\\s*status|employment|ajira|hali\\s+ya\\s+ajira)", 80)) ||
    normalizeEmploymentStatus(text);
  if (employmentStatus && /\b(employed|unemployed|self|business|student|retired|ajira|kazi|biashara|mwanafunzi|mstaafu)\b/i.test(text)) {
    updates.employment_status = employmentStatus;
  }

  const educationLevel =
    normalizeEducationLevel(extractLabeledProfileValue(text, "(?:education\\s*level|education|elimu|masomo)", 80)) ||
    (/\b(primary|secondary|certificate|diploma|degree|masters?|phd|elimu|kidato|chuo)\b/i.test(text)
      ? normalizeEducationLevel(text)
      : null);
  if (educationLevel) updates.education_level = educationLevel;

  const interestsSource =
    extractLabeledProfileValue(text, "(?:interests?|areas?|napenda|ninapenda)", 180) ||
    firstProfileMatch(text, [
      /\b(?:napenda|ninapenda|i\s+am\s+interested\s+in|interested\s+in)\s+([^.\n]{2,180})/i,
    ], 180);
  const interests = splitInterests(interestsSource);
  if (interests) updates.interests = interests;

  const notes = extractLabeledProfileValue(text, "(?:notes?|additional\\s+info|maelezo)", 300);
  if (notes) updates.additional_notes = notes;

  return updates;
}

function hasProfileUpdateValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && cleanString(String(value)) !== null;
}

function profileUpdateKeys(updates: ProfileUpdates | null | undefined): ProfileUpdateKey[] {
  if (!updates) return [];
  return PROFILE_UPDATE_KEYS.filter((key) => hasProfileUpdateValue(updates[key]));
}

function isProfileUpdateLike(text: string): boolean {
  if (profileUpdateKeys(extractProfileUpdates(text)).length > 0) return true;
  return (
    /\b(update|change|edit|complete|set|add|badilisha|sahihisha|ongeza|kamilisha)\b/i.test(text) &&
    /\b(profile|account|details|name|jina|id|location|mahali|mtaa|kazi|occupation|education|elimu|interests?|notes?)\b/i.test(text)
  );
}

function profileRequiredMissing(values: {
  full_name?: string | null;
  phone?: string | null;
  registration_phone?: string | null;
  id_number?: string | null;
  location?: string | null;
}): Array<"full_name" | "phone" | "id_number" | "location"> {
  const missing: Array<"full_name" | "phone" | "id_number" | "location"> = [];
  if (!cleanString(values.full_name)) missing.push("full_name");
  if (!cleanString(values.phone || values.registration_phone)) missing.push("phone");
  if (!normalizeIdNumberValue(values.id_number)) missing.push("id_number");
  if (!cleanString(values.location)) missing.push("location");
  return missing;
}

function profileProgress(values: {
  full_name?: string | null;
  phone?: string | null;
  registration_phone?: string | null;
  id_number?: string | null;
  location?: string | null;
}): number {
  const missing = profileRequiredMissing(values).length;
  if (missing === 0) return 100;
  return Math.max(0, Math.round(((PROFILE_REQUIRED_KEYS.length - missing) / PROFILE_REQUIRED_KEYS.length) * 80));
}

function formatFieldList(keys: string[], language: "auto" | "en" | "sw"): string {
  return keys.map((key) => profileFieldLabel(key, language)).join(", ");
}

function formatProfileUpdateSummary(updates: ProfileUpdates, language: "auto" | "en" | "sw"): string {
  return formatFieldList(profileUpdateKeys(updates), language);
}

function profileUpdateClarificationReply(language: "auto" | "en" | "sw"): string {
  if (language === "sw") {
    return [
      "Naweza kusasisha profile yako hapa WhatsApp.",
      "Tuma details kama: jina langu ni Mary Wanjiku, ID 12345678, location Gatune.",
      "Optional: kazi, elimu, interests, na maelezo. Unaweza kuruka optional parts.",
    ].join("\n");
  }

  return [
    "I can update your profile here on WhatsApp.",
    "Send details like: my name is Mary Wanjiku, ID 12345678, location Gatune.",
    "Optional: occupation, education, interests, and notes. Optional parts can be skipped.",
  ].join("\n");
}

function isSkipOptionalProfile(text: string): boolean {
  return /^(skip|done|finish|finished|no|none|nothing|hakuna|ruka|maliza|sina)$/i.test(text.trim());
}

function inferPlainRequiredProfileUpdates(
  text: string,
  current: RegistrationRequest | Profile | { registration_phone?: string | null },
): ProfileUpdates {
  const updates: ProfileUpdates = {};
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || isSkipOptionalProfile(clean)) return updates;

  const missing = profileRequiredMissing({
    full_name: "full_name" in current ? current.full_name : null,
    phone: "phone" in current ? current.phone : null,
    registration_phone: "registration_phone" in current ? current.registration_phone : null,
    id_number: "id_number" in current ? current.id_number : null,
    location: "location" in current ? current.location : null,
  });

  const bundled = clean.match(/^([a-z][a-z\s.'-]{2,80})\s+(\d{6,8})\s+(.{2,100})$/i);
  if (bundled) {
    if (missing.includes("full_name")) updates.full_name = cleanProfileValue(bundled[1], 120) || undefined;
    if (missing.includes("id_number")) updates.id_number = normalizeIdNumberValue(bundled[2]) || undefined;
    if (missing.includes("location")) updates.location = cleanProfileValue(bundled[3], 100) || undefined;
    return updates;
  }

  const idNumber = normalizeIdNumberValue(clean);
  if (idNumber && missing.includes("id_number")) {
    updates.id_number = idNumber;
    return updates;
  }

  if (missing.length === 1) {
    const onlyMissing = missing[0];
    if (onlyMissing === "full_name" && /^[a-z][a-z\s.'-]{2,120}$/i.test(clean)) updates.full_name = clean;
    if (onlyMissing === "location" && /[a-z]/i.test(clean)) updates.location = shorten(clean, 100);
  }

  return updates;
}

function registrationProfileRequiredReply(
  language: "en" | "sw",
  missing: Array<"full_name" | "phone" | "id_number" | "location"> = ["full_name", "id_number", "location"],
): string {
  const missingText = formatFieldList(missing.filter((key) => key !== "phone"), language);
  if (language === "sw") {
    return [
      "Sasa tukamilishe required profile details.",
      `Nahitaji: ${missingText}.`,
      "Mfano: jina langu ni Mary Wanjiku, ID 12345678, location Gatune.",
      "Baada ya required details, kazi/elimu/interests/notes ni optional na unaweza kuziruka.",
    ].join("\n");
  }

  return [
    "Now let us complete the required profile details.",
    `I need: ${missingText}.`,
    "Example: my name is Mary Wanjiku, ID 12345678, location Gatune.",
    "After the required details, occupation/education/interests/notes are optional and can be skipped.",
  ].join("\n");
}

function registrationProfileOptionalReply(language: "en" | "sw", saved: ProfileUpdates): string {
  const savedText = formatProfileUpdateSummary(saved, language);
  if (language === "sw") {
    return [
      savedText ? `Nimehifadhi: ${savedText}.` : "Required profile details zimehifadhiwa.",
      "Optional: unaweza kuongeza kazi, employment status, elimu, interests, au notes.",
      "Reply na hizo details, au reply SKIP kumaliza.",
    ].join("\n");
  }

  return [
    savedText ? `Saved: ${savedText}.` : "Required profile details are saved.",
    "Optional: you can add occupation, employment status, education, interests, or notes.",
    "Reply with those details, or reply SKIP to finish.",
  ].join("\n");
}

function registrationProfileCompleteReply(language: "en" | "sw", saved?: ProfileUpdates): string {
  const savedText = saved ? formatProfileUpdateSummary(saved, language) : "";
  if (language === "sw") {
    return [
      savedText ? `Nimehifadhi: ${savedText}.` : "Profile details zako zimehifadhiwa.",
      "Ombi lako la usajili liko tayari kwa admin review.",
      "Huduma za member priority zitabaki zimefungwa hadi uidhinishwe kama member.",
    ].join("\n");
  }

  return [
    savedText ? `Saved: ${savedText}.` : "Your profile details have been saved.",
    "Your registration request is ready for admin review.",
    "Member-priority services remain locked until you are approved as a member.",
  ].join("\n");
}

function normalizeParsedIntent(value: Record<string, unknown>, originalText: string): ParsedIntent {
  const rawIntent = cleanString(value.intent) as IntentName | null;
  const intent = rawIntent && INTENTS.has(rawIntent) ? rawIntent : "unknown";
  const amount = value.amount == null ? extractAmount(originalText) : Number(value.amount);
  const profileUpdates = extractProfileUpdates(originalText, value.profile_updates);

  return {
    intent,
    confidence: clampConfidence(value.confidence),
    language: value.language === "sw" ? "sw" : value.language === "en" ? "en" : detectLanguage(originalText),
    amount: Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : null,
    contribution_type: normalizeContributionType(value.contribution_type, originalText),
    payment_method: normalizePaymentMethod(value.payment_method, originalText),
    transaction_date: cleanString(value.transaction_date),
    description: cleanString(value.description),
    category: cleanString(value.category),
    case_type: cleanString(value.case_type) || inferWelfareCaseType(originalText, value.category),
    title: cleanString(value.title),
    payee: cleanString(value.payee),
    reference_number: cleanString(value.reference_number)?.toUpperCase() || extractReference(originalText),
    target_member: cleanString(value.target_member),
    profile_updates: profileUpdateKeys(profileUpdates).length ? profileUpdates : null,
    raw: value,
  };
}

function fallbackInterpretMessage(text: string): ParsedIntent {
  const lower = text.toLowerCase();
  const language = detectLanguage(text);
  const amount = extractAmount(text);
  const reference = extractReference(text);
  const profileUpdates = extractProfileUpdates(text);
  const base: ParsedIntent = {
    intent: "unknown",
    confidence: amount ? 0.35 : 0.2,
    language,
    amount,
    reference_number: reference,
    contribution_type: normalizeContributionType(null, text),
    payment_method: normalizePaymentMethod(null, text),
    profile_updates: profileUpdateKeys(profileUpdates).length ? profileUpdates : null,
  };

  if (/^(hi|hello|hey|help|menu|start|habari|msaada|mambo)\b/i.test(lower)) {
    return { ...base, intent: "help", confidence: 0.85 };
  }

  if (isProfileUpdateLike(text)) {
    return {
      ...base,
      intent: "update_profile",
      confidence: profileUpdateKeys(profileUpdates).length ? 0.88 : 0.68,
      profile_updates: profileUpdateKeys(profileUpdates).length ? profileUpdates : null,
    };
  }

  if (/(create|add|open|start|record|new|fungua|ongeza|tengeneza).*(welfare\s+case|case|kesi|welfare|ustawi|msaada)/i.test(lower)) {
    return {
      ...base,
      intent: "create_welfare_case",
      confidence: amount ? 0.86 : 0.74,
      case_type: inferWelfareCaseType(text),
      title: extractWelfareTitle(text),
      description: text,
    };
  }

  if (/(expense|expenditure|spent|paid for|bought|purchase|matumizi|tumetumia|nilitumia|nimenunua|gharama|lipa supplier)/i.test(lower)) {
    return {
      ...base,
      intent: "record_expenditure",
      confidence: amount ? 0.82 : 0.68,
      category: inferExpenseCategory(text),
      description: text,
      payment_method: normalizePaymentMethod(null, text),
    };
  }

  if (/(paid|pay|payment|transaction|record transaction|record payment|make transaction|sent|send|deposit|contribution|contribute|mchango|changia|nimelipa|nimechangia|nimetuma|malipo|membership fee|ada|donation|msaada)/i.test(lower)) {
    return {
      ...base,
      intent: "record_contribution",
      confidence: amount ? 0.84 : 0.68,
      contribution_type: normalizeContributionType(null, text),
      description: text,
      payment_method: normalizePaymentMethod(null, text),
    };
  }

  if (/(wallet|mkoba)/i.test(lower)) {
    return { ...base, intent: "query_wallet", confidence: 0.86 };
  }

  if (/(announcement|notice|update|habari|tangazo|matangazo)/i.test(lower)) {
    return { ...base, intent: "query_announcements", confidence: 0.78 };
  }

  if (/(meeting|mkutano|agenda|venue|tarehe)/i.test(lower)) {
    return { ...base, intent: "query_meetings", confidence: 0.78 };
  }

  if (/(welfare|case|kesi|ustawi|msiba|matanga|medical)/i.test(lower)) {
    return { ...base, intent: "query_welfare", confidence: 0.7 };
  }

  if (/(profile|account|status|membership|member number|nambari|akaunti|usajili)/i.test(lower)) {
    return { ...base, intent: "query_profile", confidence: 0.76 };
  }

  if (/(balance|pending|owed|owe|debt|deni|nadaiwa|michango|contributions|history|statement|salio)/i.test(lower)) {
    return { ...base, intent: "query_contributions", confidence: 0.8 };
  }

  return base;
}

async function aiInterpretMessage(text: string, profile: Profile, roles: string[]): Promise<ParsedIntent | null> {
  const parsed = await requestAiJson(
    [
      {
        role: "system",
        content: [
          "You extract one actionable intent from a WhatsApp message for Turuturu Stars, a Kenyan community organization.",
          "Understand natural English, Kiswahili, Sheng, typos, and common Kenyan mixed language.",
          "Return JSON only with keys: intent, confidence, language, amount, contribution_type, payment_method, transaction_date, title, description, category, case_type, payee, reference_number, target_member, profile_updates.",
          "Allowed intent values: help, query_profile, update_profile, query_contributions, query_wallet, query_announcements, query_meetings, query_welfare, record_contribution, record_expenditure, create_welfare_case, unknown.",
          "Use record_contribution when a member says they paid, sent money, made a transaction, contributed, donated, or wants to record a member payment.",
          "Use record_expenditure when an official says money was spent, something was bought, or an expense should be recorded.",
          "Use create_welfare_case when an official/admin asks to add, open, or create a welfare case. Put the case title in title, case type in case_type, target amount in amount, and beneficiary/member name or phone in target_member when available.",
          "Use update_profile when a member wants to add, correct, or complete profile details. Put only safe editable fields inside profile_updates: full_name, id_number, email, location, occupation, employment_status, education_level, interests, additional_notes.",
          "Use ISO YYYY-MM-DD for transaction_date when a date is clear. Use null when unknown.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          message: text,
          member: {
            name: profile.full_name,
            membership_number: profile.membership_number,
            status: profile.status,
          },
          roles,
        }),
      },
    ],
    { task: "intent extraction", temperature: 0.1, timeoutMs: 8000 },
  );

  return parsed ? normalizeParsedIntent(parsed, text) : null;
}

async function interpretMessage(text: string, profile: Profile, roles: string[]): Promise<ParsedIntent> {
  const aiIntent = await aiInterpretMessage(text, profile, roles);
  if (aiIntent && aiIntent.confidence >= 0.45) return aiIntent;
  return fallbackInterpretMessage(text);
}

function mergeWithPendingIntent(intent: ParsedIntent, session: WhatsappSession | null): ParsedIntent {
  const pending = session?.state?.pending_intent;
  if (!pending?.intent) return intent;
  if (
    pending.intent !== "record_contribution" &&
    pending.intent !== "record_expenditure" &&
    pending.intent !== "create_welfare_case" &&
    pending.intent !== "update_profile"
  ) return intent;
  if (intent.intent !== "unknown" && intent.intent !== pending.intent) return intent;

  return {
    ...pending,
    amount: intent.amount ?? pending.amount ?? null,
    reference_number: intent.reference_number ?? pending.reference_number ?? null,
    description: pending.description ?? intent.description ?? null,
    category: pending.category ?? intent.category ?? null,
    payee: intent.payee ?? pending.payee ?? null,
    payment_method: intent.payment_method ?? pending.payment_method ?? null,
    transaction_date: intent.transaction_date ?? pending.transaction_date ?? null,
    contribution_type: intent.contribution_type ?? pending.contribution_type ?? null,
    case_type: intent.case_type ?? pending.case_type ?? null,
    title: intent.title ?? pending.title ?? null,
    target_member: intent.target_member ?? pending.target_member ?? null,
    profile_updates: {
      ...((pending.profile_updates || {}) as ProfileUpdates),
      ...((intent.profile_updates || {}) as ProfileUpdates),
    },
    intent: pending.intent as IntentName,
    confidence: Math.max(intent.confidence, Number(pending.confidence || 0.5)),
    language: intent.language === "auto" ? ((pending.language as "auto" | "en" | "sw" | undefined) || "auto") : intent.language,
    raw: {
      pending,
      latest: intent,
    },
  };
}

async function findRegisteredProfile(supabase: SupabaseClient, phone: string): Promise<Profile | null> {
  const variants = phoneLookupVariants(phone);
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .in("phone", variants)
    .limit(1);

  if (error) throw new HttpError(500, "Failed to look up registered WhatsApp number", error);
  return (data?.[0] as Profile | undefined) ?? null;
}

async function findRegistrationRequest(supabase: SupabaseClient, whatsappPhone: string): Promise<RegistrationRequest | null> {
  const { data, error } = await supabase
    .from("whatsapp_registration_requests")
    .select(REGISTRATION_REQUEST_SELECT)
    .eq("whatsapp_phone", whatsappPhone)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new HttpError(500, "Failed to load registration request", error);
  }

  return (data as RegistrationRequest | null) ?? null;
}

async function ensureRegistrationPhoneAvailable(supabase: SupabaseClient, registrationPhone: string): Promise<void> {
  const profile = await findRegisteredProfile(supabase, registrationPhone);
  if (profile) {
    throw new HttpError(
      409,
      "That phone number is already registered. Use the registered number for member access or contact an admin.",
    );
  }
}

async function upsertRegistrationRequest(
  supabase: SupabaseClient,
  payload: {
    whatsapp_phone: string;
    registration_phone: string;
    email?: string | null;
    email_otp_hash?: string | null;
    email_otp_expires_at?: string | null;
    email_otp_attempts?: number;
    email_otp_sent_at?: string | null;
    email_verified_at?: string | null;
    full_name?: string | null;
    id_number?: string | null;
    location?: string | null;
    occupation?: string | null;
    employment_status?: string | null;
    education_level?: string | null;
    interests?: string[] | null;
    additional_notes?: string | null;
    profile_progress?: number;
    profile_completed_at?: string | null;
    status: string;
    notes?: string | null;
  },
): Promise<RegistrationRequest> {
  const { data, error } = await supabase
    .from("whatsapp_registration_requests")
    .upsert(payload, { onConflict: "whatsapp_phone" })
    .select(REGISTRATION_REQUEST_SELECT)
    .single();

  if (error || !data) throw new HttpError(500, "Failed to save registration request", error);
  return data as RegistrationRequest;
}

async function updateRegistrationRequest(
  supabase: SupabaseClient,
  whatsappPhone: string,
  updates: Record<string, unknown>,
): Promise<RegistrationRequest | null> {
  const { data, error } = await supabase
    .from("whatsapp_registration_requests")
    .update(updates)
    .eq("whatsapp_phone", whatsappPhone)
    .select(REGISTRATION_REQUEST_SELECT)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new HttpError(500, "Failed to update registration request", error);
  }

  return (data as RegistrationRequest | null) ?? null;
}

async function upsertAnonymousSession(supabase: SupabaseClient, phone: string): Promise<WhatsappSession> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("whatsapp_sessions")
    .upsert({
      phone,
      profile_id: null,
      last_seen_at: now,
      last_inbound_at: now,
    }, { onConflict: "phone" })
    .select("id, phone, profile_id, preferred_language, last_intent, state, last_seen_at, last_inbound_at, last_outbound_at, awaiting_response, awaiting_response_since, inactivity_notice_sent_at, abandoned_at, welcome_back_sent_at")
    .single();

  if (error || !data) throw new HttpError(500, "Failed to update WhatsApp session", error);
  return data as WhatsappSession;
}

async function upsertSession(supabase: SupabaseClient, phone: string, profile: Profile): Promise<WhatsappSession> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("whatsapp_sessions")
    .upsert({
      phone,
      profile_id: profile.id,
      last_seen_at: now,
      last_inbound_at: now,
    }, { onConflict: "phone" })
    .select("id, phone, profile_id, preferred_language, last_intent, state, last_seen_at, last_inbound_at, last_outbound_at, awaiting_response, awaiting_response_since, inactivity_notice_sent_at, abandoned_at, welcome_back_sent_at")
    .single();

  if (error || !data) throw new HttpError(500, "Failed to update WhatsApp session", error);
  return data as WhatsappSession;
}

async function updateSessionState(
  supabase: SupabaseClient,
  phone: string,
  state: SessionState,
  lastIntent: string,
): Promise<void> {
  const now = new Date().toISOString();
  const awaitingResponse = isConversationAwaitingResponse(state);
  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({
      state,
      last_intent: lastIntent,
      last_seen_at: now,
      awaiting_response: awaitingResponse,
      awaiting_response_since: awaitingResponse ? now : null,
      inactivity_notice_sent_at: null,
      abandoned_at: null,
    })
    .eq("phone", phone);

  if (error) console.error("Failed to update WhatsApp session state", error);
}

async function markSessionOutbound(supabase: SupabaseClient, phone: string): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({
      last_outbound_at: new Date().toISOString(),
    })
    .eq("phone", phone);

  if (error) console.error("Failed to update WhatsApp session outbound time", error);
}

async function markWelcomeBackSent(supabase: SupabaseClient, phone: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({
      awaiting_response: false,
      inactivity_notice_sent_at: null,
      abandoned_at: null,
      welcome_back_sent_at: now,
      last_seen_at: now,
      last_inbound_at: now,
    })
    .eq("phone", phone);

  if (error) console.error("Failed to mark WhatsApp welcome-back state", error);
}

async function maybeSendWelcomeBack(
  supabase: SupabaseClient,
  message: InboundMessage,
  profile: Profile | null,
  session: WhatsappSession,
  language: "auto" | "en" | "sw",
): Promise<void> {
  if (!shouldSendWelcomeBack(session)) return;
  await sendAndLogReply(supabase, message, profile, welcomeBackReply(profile, session, language), false);
  await markWelcomeBackSent(supabase, message.phone);
}

function registrationStateFromRequest(request: RegistrationRequest | null): RegistrationState | null {
  if (!request) return null;
  if (request.status === "profile_completed" || request.status === "converted") {
    return {
      step: "completed",
      registration_phone: request.registration_phone,
      email: request.email || undefined,
      updated_at: new Date().toISOString(),
    };
  }
  if (request.status === "email_verified" || request.status === "needs_email_support" || request.status === "profile_started") {
    const missing = profileRequiredMissing(request);
    return {
      step: missing.length > 0 ? "awaiting_profile_required" : "awaiting_profile_optional",
      registration_phone: request.registration_phone,
      email: request.email || undefined,
      updated_at: new Date().toISOString(),
    };
  }
  if (request.status === "awaiting_email_otp") {
    return {
      step: "awaiting_email_otp",
      registration_phone: request.registration_phone,
      email: request.email || undefined,
      updated_at: new Date().toISOString(),
      otp_sent_at: request.email_otp_sent_at || undefined,
    };
  }
  if (request.status === "awaiting_email") {
    return {
      step: "awaiting_email",
      registration_phone: request.registration_phone,
      email: request.email || undefined,
      updated_at: new Date().toISOString(),
    };
  }
  if (request.status === "started") {
    return {
      step: "confirm_phone",
      registration_phone: request.registration_phone,
      updated_at: new Date().toISOString(),
    };
  }
  return null;
}

function resolveRegistrationState(session: WhatsappSession, request: RegistrationRequest | null): RegistrationState | null {
  const requestState = registrationStateFromRequest(request);
  const sessionState = session.state?.registration;
  if (!sessionState?.step) return requestState;
  if (requestState?.step === "completed") return requestState;
  if (sessionState.step === "completed" && requestState) return requestState;
  return sessionState;
}

async function moveRegistrationToEmailStep(
  supabase: SupabaseClient,
  whatsappPhone: string,
  registrationPhone: string,
  language: "en" | "sw",
): Promise<string> {
  await ensureRegistrationPhoneAvailable(supabase, registrationPhone);
  const now = new Date().toISOString();
  await upsertRegistrationRequest(supabase, {
    whatsapp_phone: whatsappPhone,
    registration_phone: registrationPhone,
    status: "awaiting_email",
    email: null,
    email_otp_hash: null,
    email_otp_expires_at: null,
    email_otp_attempts: 0,
    email_otp_sent_at: null,
  });
  await updateSessionState(
    supabase,
    whatsappPhone,
    {
      registration: {
        step: "awaiting_email",
        registration_phone: registrationPhone,
        started_at: now,
        updated_at: now,
      },
      updated_at: now,
    },
    "registration",
  );
  return registrationAskEmailReply(language);
}

async function issueRegistrationEmailOtp(
  supabase: SupabaseClient,
  whatsappPhone: string,
  registrationPhone: string,
  email: string,
): Promise<void> {
  const code = generateOtpCode();
  const codeHash = await hashEmailOtp(email, code);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresAtIso = new Date(now + REGISTRATION_OTP_TTL_SECONDS * 1000).toISOString();

  await upsertRegistrationRequest(supabase, {
    whatsapp_phone: whatsappPhone,
    registration_phone: registrationPhone,
    email,
    email_otp_hash: codeHash,
    email_otp_expires_at: expiresAtIso,
    email_otp_attempts: 0,
    email_otp_sent_at: nowIso,
    status: "awaiting_email_otp",
  });

  try {
    await sendRegistrationOtpEmail(email, code);
  } catch (error) {
    await updateRegistrationRequest(supabase, whatsappPhone, {
      status: "awaiting_email",
      email_otp_hash: null,
      email_otp_expires_at: null,
      email_otp_sent_at: null,
      notes: `Email OTP send failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    throw error;
  }
}

async function moveRegistrationToOtpStep(
  supabase: SupabaseClient,
  whatsappPhone: string,
  registrationPhone: string,
  email: string,
  language: "en" | "sw",
): Promise<string> {
  await ensureRegistrationPhoneAvailable(supabase, registrationPhone);
  await issueRegistrationEmailOtp(supabase, whatsappPhone, registrationPhone, email);
  const now = new Date().toISOString();
  await updateSessionState(
    supabase,
    whatsappPhone,
    {
      registration: {
        step: "awaiting_email_otp",
        registration_phone: registrationPhone,
        email,
        updated_at: now,
        otp_sent_at: now,
      },
      updated_at: now,
    },
    "registration",
  );
  return registrationOtpSentReply(email, language);
}

function registrationProfileCurrentValues(
  request: RegistrationRequest | null,
  state: RegistrationState,
  fallbackRegistrationPhone: string | null,
): RegistrationRequest | {
  full_name: string | null;
  id_number: string | null;
  location: string | null;
  occupation: string | null;
  employment_status: string | null;
  education_level: string | null;
  interests: string[] | null;
  additional_notes: string | null;
  registration_phone: string | null;
  profile_completed_at: string | null;
} {
  return request ?? {
    full_name: null,
    id_number: null,
    location: null,
    occupation: null,
    employment_status: null,
    education_level: null,
    interests: null,
    additional_notes: null,
    registration_phone: state.registration_phone || fallbackRegistrationPhone,
    profile_completed_at: null,
  };
}

function prepareRegistrationProfilePayload(
  current: ReturnType<typeof registrationProfileCurrentValues>,
  updates: ProfileUpdates,
  complete: boolean,
): Record<string, unknown> {
  const merged = {
    ...current,
    ...updates,
  };
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    ...updates,
    profile_progress: complete ? 100 : profileProgress(merged),
    status: complete ? "profile_completed" : "profile_started",
  };

  if (complete) {
    payload.profile_completed_at = current.profile_completed_at || now;
  }

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }

  return payload;
}

async function handleRegistrationProfileReply(
  supabase: SupabaseClient,
  message: InboundMessage,
  request: RegistrationRequest | null,
  state: RegistrationState,
  text: string,
  language: "en" | "sw",
): Promise<string> {
  const latest = request ?? await findRegistrationRequest(supabase, message.phone);
  const fallbackRegistrationPhone = normalizePhoneForProfile(message.phone);
  const current = registrationProfileCurrentValues(latest, state, fallbackRegistrationPhone);

  let updates: ProfileUpdates = extractProfileUpdates(text);
  const plainUpdates = inferPlainRequiredProfileUpdates(text, current);
  updates = { ...plainUpdates, ...updates };

  if (state.step === "awaiting_profile_required") {
    const existingMissing = profileRequiredMissing(current);
    if (isSkipOptionalProfile(text)) {
      return language === "sw"
        ? `Required details haziwezi kurukwa bado. Bado nahitaji: ${formatFieldList(existingMissing.filter((key) => key !== "phone"), language)}.`
        : `The required details cannot be skipped yet. I still need: ${formatFieldList(existingMissing.filter((key) => key !== "phone"), language)}.`;
    }

    if (profileUpdateKeys(updates).length === 0) {
      return registrationProfileRequiredReply(language, existingMissing);
    }

    const merged = { ...current, ...updates };
    const missing = profileRequiredMissing(merged);
    await updateRegistrationRequest(
      supabase,
      message.phone,
      prepareRegistrationProfilePayload(current, updates, false),
    );

    const now = new Date().toISOString();
    await updateSessionState(
      supabase,
      message.phone,
      {
        registration: {
          step: missing.length > 0 ? "awaiting_profile_required" : "awaiting_profile_optional",
          registration_phone: state.registration_phone || latest?.registration_phone || fallbackRegistrationPhone || undefined,
          email: state.email || latest?.email || undefined,
          updated_at: now,
        },
        updated_at: now,
      },
      "registration",
    );

    if (missing.length > 0) {
      const savedText = formatProfileUpdateSummary(updates, language);
      const missingText = formatFieldList(missing.filter((key) => key !== "phone"), language);
      return language === "sw"
        ? `Nimehifadhi: ${savedText}. Bado nahitaji: ${missingText}.`
        : `Saved: ${savedText}. I still need: ${missingText}.`;
    }

    return registrationProfileOptionalReply(language, updates);
  }

  if (state.step === "awaiting_profile_optional") {
    if (isSkipOptionalProfile(text)) {
      await updateRegistrationRequest(
        supabase,
        message.phone,
        prepareRegistrationProfilePayload(current, {}, true),
      );
      await updateSessionState(
        supabase,
        message.phone,
        {
          registration: {
            step: "completed",
            registration_phone: state.registration_phone || latest?.registration_phone || fallbackRegistrationPhone || undefined,
            email: state.email || latest?.email || undefined,
            updated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        "registration",
      );
      return registrationProfileCompleteReply(language);
    }

    if (profileUpdateKeys(updates).length === 0) {
      return registrationProfileOptionalReply(language, {});
    }

    await updateRegistrationRequest(
      supabase,
      message.phone,
      prepareRegistrationProfilePayload(current, updates, true),
    );
    await updateSessionState(
      supabase,
      message.phone,
      {
        registration: {
          step: "completed",
          registration_phone: state.registration_phone || latest?.registration_phone || fallbackRegistrationPhone || undefined,
          email: state.email || latest?.email || undefined,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      "registration",
    );
    return registrationProfileCompleteReply(language, updates);
  }

  return registrationProfileCompleteReply(language);
}

async function handleRegistrationOtpReply(
  supabase: SupabaseClient,
  message: InboundMessage,
  request: RegistrationRequest | null,
  state: RegistrationState,
  text: string,
  language: "en" | "sw",
): Promise<string> {
  const latest = request ?? await findRegistrationRequest(supabase, message.phone);
  const registrationPhone = latest?.registration_phone || state.registration_phone;
  const email = latest?.email || state.email;

  if (!registrationPhone) {
    await updateSessionState(supabase, message.phone, {}, "registration");
    return registrationConfirmPhoneReply(message.phone, language);
  }

  if (!email) {
    const now = new Date().toISOString();
    await updateSessionState(
      supabase,
      message.phone,
      {
        registration: { step: "awaiting_email", registration_phone: registrationPhone, updated_at: now },
        updated_at: now,
      },
      "registration",
    );
    return registrationAskEmailReply(language);
  }

  if (/^resend$/i.test(text.trim())) {
    const lastSent = latest?.email_otp_sent_at ? new Date(latest.email_otp_sent_at).getTime() : 0;
    const waitMs = lastSent + REGISTRATION_OTP_RESEND_SECONDS * 1000 - Date.now();
    if (Number.isFinite(waitMs) && waitMs > 0) {
      const waitSeconds = Math.ceil(waitMs / 1000);
      return language === "sw"
        ? `Tafadhali subiri ${waitSeconds}s kabla ya kutuma OTP nyingine.`
        : `Please wait ${waitSeconds}s before requesting another OTP.`;
    }

    return await moveRegistrationToOtpStep(supabase, message.phone, registrationPhone, email, language);
  }

  const code = extractOtpCode(text);
  if (!code) {
    return language === "sw"
      ? "Reply na OTP ya tarakimu 6 iliyotumwa kwa email yako, au andika RESEND."
      : "Reply with the 6-digit OTP sent to your email, or type RESEND.";
  }

  if (!latest?.email_otp_hash || !latest.email_otp_expires_at) {
    return await moveRegistrationToOtpStep(supabase, message.phone, registrationPhone, email, language);
  }

  const expiresAt = new Date(latest.email_otp_expires_at).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await updateRegistrationRequest(supabase, message.phone, {
      status: "expired",
      email_otp_hash: null,
      email_otp_expires_at: null,
    });
    return await moveRegistrationToOtpStep(supabase, message.phone, registrationPhone, email, language);
  }

  if (latest.email_otp_attempts >= REGISTRATION_OTP_MAX_ATTEMPTS) {
    await updateRegistrationRequest(supabase, message.phone, {
      status: "awaiting_email",
      email_otp_hash: null,
      email_otp_expires_at: null,
      email_otp_attempts: 0,
    });
    const now = new Date().toISOString();
    await updateSessionState(
      supabase,
      message.phone,
      {
        registration: { step: "awaiting_email", registration_phone: registrationPhone, updated_at: now },
        updated_at: now,
      },
      "registration",
    );
    return language === "sw"
      ? "Majaribio ya OTP yamezidi. Reply na email yako tena ili tutume code mpya."
      : "Too many OTP attempts. Reply with your email again so we can send a fresh code.";
  }

  const providedHash = await hashEmailOtp(email, code);
  if (!constantTimeCompare(providedHash, latest.email_otp_hash)) {
    const attempts = latest.email_otp_attempts + 1;
    await updateRegistrationRequest(supabase, message.phone, { email_otp_attempts: attempts });
    const attemptsLeft = Math.max(0, REGISTRATION_OTP_MAX_ATTEMPTS - attempts);
    return language === "sw"
      ? `OTP si sahihi. Umebakisha majaribio ${attemptsLeft}.`
      : `That OTP is not correct. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`;
  }

  const now = new Date().toISOString();
  const missingProfileFields = profileRequiredMissing({
    registration_phone: registrationPhone,
    full_name: latest?.full_name,
    id_number: latest?.id_number,
    location: latest?.location,
  });
  await updateRegistrationRequest(supabase, message.phone, {
    status: "profile_started",
    email_verified_at: now,
    email_otp_hash: null,
    email_otp_expires_at: null,
    email_otp_attempts: 0,
    profile_progress: profileProgress({
      registration_phone: registrationPhone,
      full_name: latest?.full_name,
      id_number: latest?.id_number,
      location: latest?.location,
    }),
  });
  await updateSessionState(
    supabase,
    message.phone,
    {
      registration: {
        step: missingProfileFields.length > 0 ? "awaiting_profile_required" : "awaiting_profile_optional",
        registration_phone: registrationPhone,
        email,
        updated_at: now,
      },
      updated_at: now,
    },
    "registration",
  );

  return [
    registrationCompleteReply(language),
    "",
    missingProfileFields.length > 0
      ? registrationProfileRequiredReply(language, missingProfileFields)
      : registrationProfileOptionalReply(language, {}),
  ].join("\n");
}

async function handleUnregisteredNumber(
  supabase: SupabaseClient,
  message: InboundMessage,
  inboundLog: { id: string | null; duplicate: boolean },
): Promise<void> {
  const language = detectLanguage(message.text || "");
  const text = message.text.trim();
  const session = await upsertAnonymousSession(supabase, message.phone);
  const request = await findRegistrationRequest(supabase, message.phone);
  const state = resolveRegistrationState(session, request);
  await maybeSendWelcomeBack(supabase, message, null, session, language);

  if (!text) {
    await sendAndLogReply(supabase, message, null, registrationGateReply(language));
    return;
  }

  if (isCancel(text)) {
    await updateRegistrationRequest(supabase, message.phone, { status: "cancelled" });
    await updateSessionState(supabase, message.phone, {}, "registration");
    await sendAndLogReply(supabase, message, null, registrationCancelledReply(language));
    return;
  }

  if (state?.step === "completed" && request && isProfileUpdateLike(text)) {
    const updates = extractProfileUpdates(text);
    if (profileUpdateKeys(updates).length === 0) {
      await sendAndLogReply(supabase, message, null, profileUpdateClarificationReply(language));
      return;
    }

    await updateRegistrationRequest(
      supabase,
      message.phone,
      prepareRegistrationProfilePayload(
        registrationProfileCurrentValues(request, state, normalizePhoneForProfile(message.phone)),
        updates,
        true,
      ),
    );
    await sendAndLogReply(supabase, message, null, registrationProfileCompleteReply(language, updates));
    return;
  }

  if (!state && request?.status === "profile_completed") {
    await sendAndLogReply(supabase, message, null, registrationCompleteReply(language));
    return;
  }

  const wantsRegistration = state ? true : await detectRegistrationInterest(text);
  if (!state && !wantsRegistration) {
    await sendAndLogReply(supabase, message, null, registrationGateReply(language));
    return;
  }

  if (!state) {
    const registrationPhone = normalizePhoneForProfile(message.phone);
    if (!registrationPhone) {
      await sendAndLogReply(
        supabase,
        message,
        null,
        "I can only start guided registration from a valid Kenyan mobile number. Please contact an admin for help.",
      );
      return;
    }

    const initialProfileUpdates = extractProfileUpdates(text);
    const initialProgress = profileProgress({
      registration_phone: registrationPhone,
      ...initialProfileUpdates,
    });

    await upsertRegistrationRequest(supabase, {
      whatsapp_phone: message.phone,
      registration_phone: registrationPhone,
      email: null,
      email_otp_hash: null,
      email_otp_expires_at: null,
      email_otp_attempts: 0,
      email_otp_sent_at: null,
      email_verified_at: null,
      ...initialProfileUpdates,
      profile_progress: initialProgress,
      status: "started",
      notes: inboundLog.id ? `Started from WhatsApp message ${inboundLog.id}` : "Started from WhatsApp",
    });
    const now = new Date().toISOString();
    await updateSessionState(
      supabase,
      message.phone,
      {
        registration: {
          step: "confirm_phone",
          registration_phone: registrationPhone,
          started_at: now,
          updated_at: now,
        },
        updated_at: now,
      },
      "registration",
    );
    await sendAndLogReply(supabase, message, null, registrationConfirmPhoneReply(message.phone, language));
    return;
  }

  if (state.step === "confirm_phone") {
    const inboundWhatsappPhone = normalizePhoneForWhatsapp(message.phone);
    const candidateWhatsappPhone = normalizePhoneForWhatsapp(text);

    if (isAffirmative(text) || (candidateWhatsappPhone && candidateWhatsappPhone === inboundWhatsappPhone)) {
      const registrationPhone = normalizePhoneForProfile(message.phone);
      if (!registrationPhone) throw new HttpError(400, "Invalid WhatsApp phone number for registration.");
      const reply = await moveRegistrationToEmailStep(supabase, message.phone, registrationPhone, language);
      await sendAndLogReply(supabase, message, null, reply);
      return;
    }

    if (candidateWhatsappPhone && candidateWhatsappPhone !== inboundWhatsappPhone) {
      await sendAndLogReply(
        supabase,
        message,
        null,
        language === "sw"
          ? "Kwa usalama, usajili wa WhatsApp unaweza kuendelea tu na nambari unayotumia sasa. Reply YES kuitumia, au wasiliana na admin kubadilisha nambari."
          : "For security, WhatsApp registration can only continue with the number you are messaging from. Reply YES to use it, or contact an admin to register a different number.",
      );
      return;
    }

    if (isNegative(text)) {
      await sendAndLogReply(
        supabase,
        message,
        null,
        language === "sw"
          ? "Sawa. Tafadhali tuma ujumbe ukitumia nambari unayotaka kusajili, au wasiliana na admin. Reply YES kama ungependa kutumia nambari hii."
          : "No problem. Please message us from the number you want to register, or contact an admin. Reply YES if you want to use this number.",
      );
      return;
    }

    await sendAndLogReply(supabase, message, null, registrationConfirmPhoneReply(message.phone, language));
    return;
  }

  if (state.step === "awaiting_email") {
    const registrationPhone = state.registration_phone || request?.registration_phone || normalizePhoneForProfile(message.phone);
    if (!registrationPhone) throw new HttpError(400, "Invalid registration phone.");

    if (isNoEmail(text)) {
      const now = new Date().toISOString();
      const missingProfileFields = profileRequiredMissing({
        registration_phone: registrationPhone,
        full_name: request?.full_name,
        id_number: request?.id_number,
        location: request?.location,
      });
      await updateRegistrationRequest(supabase, message.phone, {
        status: "needs_email_support",
        email: null,
        email_otp_hash: null,
        email_otp_expires_at: null,
        profile_progress: profileProgress({
          registration_phone: registrationPhone,
          full_name: request?.full_name,
          id_number: request?.id_number,
          location: request?.location,
        }),
        notes: "Registrant said they do not have email.",
      });
      await updateSessionState(
        supabase,
        message.phone,
        {
          registration: {
            step: missingProfileFields.length > 0 ? "awaiting_profile_required" : "awaiting_profile_optional",
            registration_phone: registrationPhone,
            updated_at: now,
          },
          updated_at: now,
        },
        "registration",
      );
      await sendAndLogReply(
        supabase,
        message,
        null,
        [
          registrationNoEmailSavedReply(language),
          "",
          missingProfileFields.length > 0
            ? registrationProfileRequiredReply(language, missingProfileFields)
            : registrationProfileOptionalReply(language, {}),
        ].join("\n"),
      );
      return;
    }

    const email = extractEmail(text);
    if (!email) {
      await sendAndLogReply(
        supabase,
        message,
        null,
        language === "sw"
          ? "Tafadhali reply na email sahihi, mfano name@example.com. Kama huna email, reply NO EMAIL."
          : "Please reply with a valid email, for example name@example.com. If you do not have one, reply NO EMAIL.",
      );
      return;
    }

    const reply = await moveRegistrationToOtpStep(supabase, message.phone, registrationPhone, email, language);
    await sendAndLogReply(supabase, message, null, reply);
    return;
  }

  if (state.step === "awaiting_email_otp") {
    const reply = await handleRegistrationOtpReply(supabase, message, request, state, text, language);
    await sendAndLogReply(supabase, message, null, reply);
    return;
  }

  if (state.step === "awaiting_profile_required" || state.step === "awaiting_profile_optional") {
    const reply = await handleRegistrationProfileReply(supabase, message, request, state, text, language);
    await sendAndLogReply(supabase, message, null, reply);
    return;
  }

  await sendAndLogReply(
    supabase,
    message,
    null,
    request?.status === "needs_email_support"
      ? registrationNoEmailSavedReply(language)
      : registrationCompleteReply(language),
  );
}

async function loadFinanceContext(supabase: SupabaseClient, profileId: string): Promise<FinanceContext> {
  const [contributionsRes, walletRes] = await Promise.all([
    supabase
      .from("contributions")
      .select("id, amount, contribution_type, status, created_at, paid_at, reference_number")
      .eq("member_id", profileId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("wallets")
      .select("balance, currency, status")
      .eq("user_id", profileId)
      .maybeSingle(),
  ]);

  if (contributionsRes.error) {
    throw new HttpError(500, "Failed to load contribution summary", contributionsRes.error);
  }

  if (walletRes.error && walletRes.error.code !== "PGRST116") {
    throw new HttpError(500, "Failed to load wallet summary", walletRes.error);
  }

  const contributions = ((contributionsRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    amount: Number(row.amount || 0),
    contribution_type: String(row.contribution_type || "general"),
    status: row.status == null ? null : String(row.status),
    created_at: row.created_at == null ? null : String(row.created_at),
    paid_at: row.paid_at == null ? null : String(row.paid_at),
    reference_number: row.reference_number == null ? null : String(row.reference_number),
  }));

  const walletRow = walletRes.data as Record<string, unknown> | null;
  return {
    contributions,
    wallet: walletRow
      ? {
        balance: Number(walletRow.balance || 0),
        currency: String(walletRow.currency || "KES"),
        status: String(walletRow.status || "active"),
      }
      : null,
  };
}

function formatMoney(amount: number): string {
  return `KSh ${Number(amount || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function shortDate(value: string | null | undefined): string {
  if (!value) return "unknown date";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function shorten(value: string, max = 150): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
}

function conversationTimeoutMinutes(): number {
  const configured = Number(Deno.env.get("WHATSAPP_ABANDONMENT_MINUTES") || "");
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_ABANDONMENT_MINUTES;
}

function isConversationAwaitingResponse(state: SessionState | null | undefined): boolean {
  if (!state) return false;
  const registrationStep = state.registration?.step;
  if (registrationStep && registrationStep !== "completed") return true;
  if (state.pending_intent?.intent) return true;
  return false;
}

function seededIndex(seed: string, count: number): number {
  if (count <= 1) return 0;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % count;
}

function conversationContextLabel(state: SessionState | null | undefined, language: "auto" | "en" | "sw"): string {
  const sw = language === "sw";
  const registrationStep = state?.registration?.step;

  if (registrationStep === "confirm_phone") {
    return sw ? "tulikuwa tunathibitisha nambari yako ya usajili" : "we were confirming your registration number";
  }
  if (registrationStep === "awaiting_email") {
    return sw ? "tulikuwa kwenye hatua ya email ya usajili" : "we were at the registration email step";
  }
  if (registrationStep === "awaiting_email_otp") {
    return sw ? "tulikuwa tunasubiri OTP ya email" : "we were waiting for your email OTP";
  }
  if (registrationStep === "awaiting_profile_required") {
    return sw ? "tulikuwa tunakamilisha details muhimu za usajili" : "we were completing the required registration details";
  }
  if (registrationStep === "awaiting_profile_optional") {
    return sw ? "tulikuwa kwenye details za ziada za usajili" : "we were on the optional registration details";
  }

  const pendingIntent = state?.pending_intent?.intent;
  if (pendingIntent === "record_contribution") {
    return sw ? "tulikuwa tunamalizia kurekodi transaction yako" : "we were finishing that transaction record";
  }
  if (pendingIntent === "record_expenditure") {
    return sw ? "tulikuwa tunamalizia kurekodi expenditure" : "we were finishing that expenditure record";
  }
  if (pendingIntent === "create_welfare_case") {
    return sw ? "tulikuwa tunafungua welfare case" : "we were opening that welfare case";
  }
  if (pendingIntent === "update_profile") {
    return sw ? "tulikuwa tunasasisha profile yako" : "we were updating your profile";
  }

  return sw ? "tunaweza kuendelea hapa" : "we can continue from here";
}

function shouldSendWelcomeBack(session: WhatsappSession): boolean {
  if (session.abandoned_at) return true;
  if (!session.awaiting_response || !session.awaiting_response_since) return false;

  const lastPromptAt = new Date(session.last_outbound_at || session.awaiting_response_since).getTime();
  if (!Number.isFinite(lastPromptAt)) return false;
  const elapsedMs = Date.now() - lastPromptAt;
  return elapsedMs >= conversationTimeoutMinutes() * 60 * 1000;
}

function welcomeBackReply(
  profile: Pick<Profile, "full_name"> | null,
  session: WhatsappSession,
  language: "auto" | "en" | "sw",
): string {
  const name = profile ? ` ${memberGreetingName(profile)}` : "";
  const context = conversationContextLabel(session.state, language);
  const seed = `${session.phone}:${session.abandoned_at || session.awaiting_response_since || ""}:${context}`;

  if (language === "sw") {
    const variants = [
      `Karibu tena${name}. Niliweka mazungumzo yako hapa; ${context}.`,
      `Nimefurahi kukuona tena${name}. Nilisimamisha chat ilipokuwa kimya; ${context}.`,
      `Umerudi${name}. Tuko sawa; ${context}.`,
      `Karibu back${name}. Niliihifadhi hatua yako, kwa hivyo ${context}.`,
    ];
    return variants[seededIndex(seed, variants.length)];
  }

  const variants = [
    `Welcome back${name}. I kept your place; ${context}.`,
    `Good to see you again${name}. I paused when the chat went quiet; ${context}.`,
    `You are back${name}. Nice. I saved the thread, and ${context}.`,
    `Welcome back${name}. We can pick this up smoothly; ${context}.`,
  ];
  return variants[seededIndex(seed, variants.length)];
}

function appendRatingPrompt(body: string): string {
  if (body.includes("Rate this chat:")) return body;
  return `${body}${RATING_PROMPT}`;
}

function detectConversationRating(text: string): ConversationRating | null {
  const normalized = text.trim();
  if (!normalized) return null;

  for (const rating of CONVERSATION_RATINGS) {
    if (normalized === rating.emoji) return rating;
    if (normalized.startsWith(`${rating.emoji} `) || normalized.startsWith(`${rating.emoji}\n`)) return rating;
    if (normalized.replaceAll(rating.emoji, "").trim() === "") return rating;
  }

  return null;
}

function ratingThanksReply(profile: Pick<Profile, "full_name">, rating: ConversationRating, language: "auto" | "en" | "sw"): string {
  const name = memberGreetingName(profile);
  if (language === "sw") {
    return `Asante ${name}, tumepokea rating yako ${rating.emoji}.`;
  }

  return `Thanks ${name}, we received your ${rating.emoji} rating.`;
}

function memberGreetingName(profile: Pick<Profile, "full_name">): string {
  const cleanName = profile.full_name.replace(/\s+/g, " ").trim();
  return cleanName.split(" ")[0] || cleanName || "Member";
}

function helpReply(language: "auto" | "en" | "sw", roles: string[] = [], profile?: Pick<Profile, "full_name">): string {
  const official = isOfficial(roles);
  const greetingName = profile ? memberGreetingName(profile) : null;

  if (language === "sw") {
    const lines = [
      greetingName
        ? `Habari ${greetingName}, karibu Turuturu Stars WhatsApp assistant.`
        : "Karibu Turuturu Stars WhatsApp assistant.",
      "Unaweza kuandika kawaida, kwa Kiswahili au English:",
      "1. Niko na deni gani?",
      "2. Nimelipa 500 welfare ref QJD123ABC",
      "3. Salio la wallet?",
      "4. Matangazo mapya?",
      "5. Update location to Gatune / kazi yangu ni teacher",
    ];

    if (official) {
      lines.push(
        "6. Add welfare case medical for Mary target 20000",
        "7. Record expense 1200 fare to Nyeri ref BUS12",
        "Nitatumia role zako kukupa huduma za member na official/admin.",
      );
    } else {
      lines.push("Nitakuelewa na kukusaidia moja kwa moja.");
    }

    return lines.join("\n");
  }

  const lines = [
    greetingName
      ? `Hi ${greetingName}, welcome to the Turuturu Stars WhatsApp assistant.`
      : "Welcome to the Turuturu Stars WhatsApp assistant.",
    "You can write naturally in English or Kiswahili:",
    "1. What do I owe?",
    "2. I paid 500 welfare ref QJD123ABC",
    "3. Wallet balance?",
    "4. Any new announcements?",
    "5. Update my location to Gatune / my occupation is teacher",
  ];

  if (official) {
    lines.push(
      "6. Add welfare case medical for Mary target 20000",
      "7. Record expense 1200 fare to Nyeri ref BUS12",
      "I will use your roles to unlock the member and official/admin actions available to you.",
    );
  } else {
    lines.push("I will understand and guide the next step.");
  }

  return lines.join("\n");
}

function contributionSummaryReply(profile: Profile, context: FinanceContext, language: "auto" | "en" | "sw"): string {
  const totalPaid = context.contributions
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + row.amount, 0);
  const totalPending = context.contributions
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + row.amount, 0);
  const recent = context.contributions.slice(0, 5);

  const lines = language === "sw"
    ? [
      `${profile.full_name}, muhtasari wako wa michango:`,
      `Paid: ${formatMoney(totalPaid)}`,
      `Pending: ${formatMoney(totalPending)}`,
    ]
    : [
      `${profile.full_name}, here is your contribution summary:`,
      `Paid: ${formatMoney(totalPaid)}`,
      `Pending: ${formatMoney(totalPending)}`,
    ];

  if (recent.length > 0) {
    lines.push(language === "sw" ? "Rekodi za karibuni:" : "Recent records:");
    for (const row of recent) {
      lines.push(`- ${row.contribution_type}: ${formatMoney(row.amount)} (${row.status || "unknown"}, ${shortDate(row.paid_at || row.created_at)})`);
    }
  } else {
    lines.push(language === "sw" ? "Hakuna rekodi ya mchango bado." : "No contribution records yet.");
  }

  return lines.join("\n");
}

function profileReply(profile: Profile, roles: string[], language: "auto" | "en" | "sw"): string {
  const memberNo = profile.membership_number || "not assigned";
  const roleText = roles.length ? roles.join(", ") : "member";
  const feeText = profile.registration_fee_paid ? "paid" : "not paid";
  const missing = profileRequiredMissing(profile).filter((key) => key !== "phone");
  const profileLines = [
    profile.location ? `Location: ${profile.location}` : null,
    profile.occupation ? `Occupation: ${profile.occupation}` : null,
    profile.education_level ? `Education: ${profile.education_level}` : null,
    profile.interests?.length ? `Interests: ${profile.interests.join(", ")}` : null,
  ].filter((line): line is string => Boolean(line));

  if (language === "sw") {
    const lines = [
      `Jina: ${profile.full_name}`,
      `Membership No: ${memberNo}`,
      `Hali ya account: ${profile.status || "unknown"}`,
      `Registration fee: ${feeText}`,
      `Roles: ${roleText}`,
      ...profileLines,
    ];

    if (missing.length > 0) {
      lines.push(`Profile bado inahitaji: ${formatFieldList(missing, language)}.`);
      lines.push("Unaweza ku-update hapa WhatsApp, mfano: update location to Gatune.");
    }

    return lines.join("\n");
  }

  const lines = [
    `Name: ${profile.full_name}`,
    `Membership No: ${memberNo}`,
    `Account status: ${profile.status || "unknown"}`,
    `Registration fee: ${feeText}`,
    `Roles: ${roleText}`,
    ...profileLines,
  ];

  if (missing.length > 0) {
    lines.push(`Profile still needs: ${formatFieldList(missing, language)}.`);
    lines.push("You can update it here on WhatsApp, for example: update location to Gatune.");
  }

  return lines.join("\n");
}

async function applyRegisteredProfileUpdates(
  supabase: SupabaseClient,
  profile: Profile,
  updates: ProfileUpdates,
): Promise<Profile> {
  const merged = { ...profile, ...updates };
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    ...updates,
    registration_progress: profileProgress(merged),
    updated_at: now,
  };

  if (profileRequiredMissing(merged).length === 0 && !profile.registration_completed_at) {
    payload.registration_completed_at = now;
  }

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profile.id)
    .select(PROFILE_SELECT)
    .single();

  if (error || !data) throw new HttpError(500, "Failed to update WhatsApp profile details", error);
  return data as Profile;
}

function profileUpdateSuccessReply(
  profile: Profile,
  updates: ProfileUpdates,
  language: "auto" | "en" | "sw",
): string {
  const savedText = formatProfileUpdateSummary(updates, language);
  const missing = profileRequiredMissing(profile).filter((key) => key !== "phone");

  if (language === "sw") {
    const lines = [`Nime-update profile yako: ${savedText}.`];
    if (missing.length > 0) {
      lines.push(`Bado inahitaji: ${formatFieldList(missing, language)}.`);
    } else {
      lines.push("Required profile details zako zimekamilika.");
    }
    return lines.join("\n");
  }

  const lines = [`I updated your profile: ${savedText}.`];
  if (missing.length > 0) {
    lines.push(`Still needed: ${formatFieldList(missing, language)}.`);
  } else {
    lines.push("Your required profile details are complete.");
  }
  return lines.join("\n");
}

function walletReply(context: FinanceContext, language: "auto" | "en" | "sw"): string {
  if (!context.wallet) {
    return language === "sw"
      ? "Sijapata wallet iliyo active kwa account yako."
      : "I could not find an active wallet for your account.";
  }

  return language === "sw"
    ? `Salio la wallet yako ni ${formatMoney(context.wallet.balance)} (${context.wallet.status}).`
    : `Your wallet balance is ${formatMoney(context.wallet.balance)} (${context.wallet.status}).`;
}

async function announcementsReply(supabase: SupabaseClient, language: "auto" | "en" | "sw"): Promise<string> {
  const { data, error } = await supabase
    .from("announcements")
    .select("title, content, priority, published_at, created_at")
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(3);

  if (error) throw new HttpError(500, "Failed to load announcements", error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return language === "sw" ? "Hakuna tangazo jipya kwa sasa." : "There are no published announcements right now.";
  }

  const lines = [language === "sw" ? "Matangazo ya karibuni:" : "Latest announcements:"];
  for (const row of rows) {
    lines.push(`- ${row.title} (${shortDate(String(row.published_at || row.created_at || ""))}): ${shorten(String(row.content || ""), 110)}`);
  }
  return lines.join("\n");
}

async function meetingsReply(supabase: SupabaseClient, language: "auto" | "en" | "sw"): Promise<string> {
  const { data, error } = await supabase
    .from("meetings")
    .select("title, meeting_type, scheduled_date, venue, status")
    .gte("scheduled_date", new Date().toISOString())
    .order("scheduled_date", { ascending: true })
    .limit(3);

  if (error) throw new HttpError(500, "Failed to load meetings", error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return language === "sw" ? "Hakuna mkutano ujao uliorekodiwa." : "There are no upcoming meetings recorded.";
  }

  const lines = [language === "sw" ? "Mikutano ijayo:" : "Upcoming meetings:"];
  for (const row of rows) {
    lines.push(`- ${row.title} (${row.meeting_type}) on ${shortDate(String(row.scheduled_date || ""))}${row.venue ? ` at ${row.venue}` : ""}`);
  }
  return lines.join("\n");
}

async function welfareReply(supabase: SupabaseClient, language: "auto" | "en" | "sw"): Promise<string> {
  const { data, error } = await supabase
    .from("welfare_cases")
    .select("title, case_type, target_amount, collected_amount, status, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw new HttpError(500, "Failed to load welfare cases", error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return language === "sw" ? "Hakuna welfare case iliyo active kwa sasa." : "There are no active welfare cases right now.";
  }

  const lines = [language === "sw" ? "Welfare cases active:" : "Active welfare cases:"];
  for (const row of rows) {
    const target = formatMoney(Number(row.target_amount || 0));
    const collected = formatMoney(Number(row.collected_amount || 0));
    lines.push(`- ${row.title} (${row.case_type}): ${collected} collected of ${target}`);
  }
  return lines.join("\n");
}

function parseExpenseDate(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

async function resolveContributionProfile(
  supabase: SupabaseClient,
  requester: Profile,
  roles: string[],
  targetMember: string | null | undefined,
): Promise<{ profile: Profile; needsClarification?: string }> {
  const target = targetMember?.trim();
  if (!target || !isOfficial(roles) || /^me|myself|self|mimi$/i.test(target)) {
    return { profile: requester };
  }

  const phoneVariants = phoneLookupVariants(target);
  if (phoneVariants.length > 1 || /^\+?\d[\d\s-]+$/.test(target)) {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .in("phone", phoneVariants)
      .limit(2);

    if (error) throw new HttpError(500, "Failed to look up target member", error);
    if (data?.length === 1) return { profile: data[0] as Profile };
  }

  const cleaned = target.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return { profile: requester };

  const { data: membershipMatches, error: membershipError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .ilike("membership_number", cleaned)
    .limit(2);

  if (membershipError) throw new HttpError(500, "Failed to search target membership number", membershipError);
  if (membershipMatches?.length === 1) return { profile: membershipMatches[0] as Profile };

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .ilike("full_name", `%${cleaned}%`)
    .limit(3);

  if (error) throw new HttpError(500, "Failed to search target member", error);
  if (data?.length === 1) return { profile: data[0] as Profile };
  if ((data?.length || 0) > 1) {
    return {
      profile: requester,
      needsClarification: "I found more than one member with that name. Please include the membership number or phone number.",
    };
  }

  return {
    profile: requester,
    needsClarification: "I could not find that member. Please use their registered phone number or membership number.",
  };
}

async function resolveOptionalMemberProfile(
  supabase: SupabaseClient,
  targetMember: string | null | undefined,
): Promise<{ profile: Profile | null; needsClarification?: string }> {
  const target = targetMember?.trim();
  if (!target || /^unknown|null|none|n\/a$/i.test(target)) return { profile: null };

  const phoneVariants = phoneLookupVariants(target);
  if (phoneVariants.length > 1 || /^\+?\d[\d\s-]+$/.test(target)) {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .in("phone", phoneVariants)
      .limit(2);

    if (error) throw new HttpError(500, "Failed to look up welfare beneficiary", error);
    if (data?.length === 1) return { profile: data[0] as Profile };
    if ((data?.length || 0) > 1) {
      return { profile: null, needsClarification: "I found more than one member for that phone. Please use the membership number." };
    }
  }

  const cleaned = target.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return { profile: null };

  const { data: membershipMatches, error: membershipError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .ilike("membership_number", cleaned)
    .limit(2);

  if (membershipError) throw new HttpError(500, "Failed to search welfare beneficiary membership number", membershipError);
  if (membershipMatches?.length === 1) return { profile: membershipMatches[0] as Profile };

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .ilike("full_name", `%${cleaned}%`)
    .limit(3);

  if (error) throw new HttpError(500, "Failed to search welfare beneficiary", error);
  if (data?.length === 1) return { profile: data[0] as Profile };
  if ((data?.length || 0) > 1) {
    return { profile: null, needsClarification: "I found more than one member with that name. Please include their membership number or phone." };
  }

  return { profile: null };
}

async function executeIntent(
  supabase: SupabaseClient,
  intent: ParsedIntent,
  profile: Profile,
  roles: string[],
  context: FinanceContext,
  inboundText: string,
): Promise<ExecutionResult> {
  const language = intent.language === "auto" ? detectLanguage(inboundText) : intent.language;

  if (intent.intent === "help") {
    return { actionStatus: "completed", reply: helpReply(language, roles, profile), result: { intent: "help", roles }, nextState: {} };
  }

  if (intent.intent === "query_profile") {
    return {
      actionStatus: "completed",
      reply: profileReply(profile, roles, language),
      result: { profile_id: profile.id, roles },
      nextState: {},
    };
  }

  if (intent.intent === "update_profile") {
    const updates = intent.profile_updates || extractProfileUpdates(inboundText);
    if (profileUpdateKeys(updates).length === 0) {
      return {
        actionStatus: "needs_clarification",
        reply: profileUpdateClarificationReply(language),
        result: { missing: ["profile_updates"] },
        nextState: {
          pending_intent: { ...intent, intent: "update_profile" },
          asked_for: ["profile_updates"],
          updated_at: new Date().toISOString(),
        },
      };
    }

    const updatedProfile = await applyRegisteredProfileUpdates(supabase, profile, updates);
    return {
      actionStatus: "completed",
      reply: profileUpdateSuccessReply(updatedProfile, updates, language),
      result: {
        profile_id: profile.id,
        updated_fields: profileUpdateKeys(updates),
        registration_progress: updatedProfile.registration_progress,
      },
      nextState: {},
    };
  }

  if (intent.intent === "query_contributions") {
    return {
      actionStatus: "completed",
      reply: contributionSummaryReply(profile, context, language),
      result: { records: context.contributions.length },
      nextState: {},
    };
  }

  if (intent.intent === "query_wallet") {
    return {
      actionStatus: "completed",
      reply: walletReply(context, language),
      result: { wallet: context.wallet },
      nextState: {},
    };
  }

  if (intent.intent === "query_announcements") {
    return {
      actionStatus: "completed",
      reply: await announcementsReply(supabase, language),
      result: { source: "announcements" },
      nextState: {},
    };
  }

  if (intent.intent === "query_meetings") {
    return {
      actionStatus: "completed",
      reply: await meetingsReply(supabase, language),
      result: { source: "meetings" },
      nextState: {},
    };
  }

  if (intent.intent === "query_welfare") {
    return {
      actionStatus: "completed",
      reply: await welfareReply(supabase, language),
      result: { source: "welfare_cases" },
      nextState: {},
    };
  }

  if (intent.intent === "create_welfare_case") {
    if (!isOfficial(roles)) {
      return {
        actionStatus: "blocked",
        reply: language === "sw"
          ? "Ni official/admin pekee anaweza kuongeza welfare case kupitia WhatsApp."
          : "Only an official/admin can add a welfare case through WhatsApp.",
        result: { roles },
        nextState: {},
      };
    }

    const title = extractWelfareTitle(inboundText, intent.title || intent.description || intent.target_member);
    if (!title) {
      return {
        actionStatus: "needs_clarification",
        reply: language === "sw"
          ? "Nimeelewa unataka kuongeza welfare case. Tafadhali tuma title/name ya case. Mfano: Add welfare case medical for Mary target 20000."
          : "I understood that you want to add a welfare case. Please send the case title/name. Example: Add welfare case medical for Mary target 20000.",
        result: { missing: ["title"] },
        nextState: {
          pending_intent: intent,
          asked_for: ["title"],
          updated_at: new Date().toISOString(),
        },
      };
    }

    const beneficiary = await resolveOptionalMemberProfile(supabase, intent.target_member);
    if (beneficiary.needsClarification) {
      return {
        actionStatus: "needs_clarification",
        reply: beneficiary.needsClarification,
        result: { missing: ["target_member"], target_member: intent.target_member || null },
        nextState: {
          pending_intent: intent,
          asked_for: ["target_member"],
          updated_at: new Date().toISOString(),
        },
      };
    }

    const targetAmount = intent.amount ? parsePositiveAmount(intent.amount) : null;
    const caseType = inferWelfareCaseType(inboundText, intent.case_type || intent.category);
    const description = intent.description || `Created via WhatsApp assistant. Original message: ${inboundText}`;

    const { data, error } = await supabase
      .from("welfare_cases")
      .insert({
        title,
        description,
        case_type: caseType,
        target_amount: targetAmount,
        beneficiary_id: beneficiary.profile?.id || null,
        status: "active",
        collected_amount: 0,
        created_by: profile.id,
      })
      .select("id, title, case_type, target_amount, status, beneficiary_id, created_at")
      .single();

    if (error || !data) throw new HttpError(500, "Failed to create WhatsApp welfare case", error);

    const beneficiaryText = beneficiary.profile ? ` for ${beneficiary.profile.full_name}` : "";
    const amountText = targetAmount ? ` with target ${formatMoney(targetAmount)}` : "";
    const reply = language === "sw"
      ? `Nimefungua welfare case "${title}" (${caseType})${beneficiaryText}${amountText}. Status ni active.`
      : `I created welfare case "${title}" (${caseType})${beneficiaryText}${amountText}. Status is active.`;

    return {
      actionStatus: "completed",
      reply,
      result: data as Record<string, unknown>,
      welfareCaseId: String((data as Record<string, unknown>).id),
      nextState: {},
    };
  }

  if (intent.intent === "record_contribution") {
    if (!canRecordFinance(profile, roles)) {
      return {
        actionStatus: "blocked",
        reply: language === "sw"
          ? `Account yako iko ${profile.status || "unknown"}, kwa hivyo siwezi kurekodi transaction mpya. Tafadhali wasiliana na admin.`
          : `Your account is ${profile.status || "unknown"}, so I cannot record a new transaction. Please contact an admin.`,
        result: { blocked_status: profile.status },
        nextState: {},
      };
    }

    if (!intent.amount) {
      return {
        actionStatus: "needs_clarification",
        reply: language === "sw"
          ? "Umetaja mchango, lakini sijapata kiasi. Ni KSh ngapi nirekodi?"
          : "I understood this as a contribution, but I need the amount. How much should I record?",
        result: { missing: ["amount"] },
        nextState: {
          pending_intent: intent,
          asked_for: ["amount"],
          updated_at: new Date().toISOString(),
        },
      };
    }

    const target = await resolveContributionProfile(supabase, profile, roles, intent.target_member);
    if (target.needsClarification) {
      return {
        actionStatus: "needs_clarification",
        reply: target.needsClarification,
        result: { missing: ["target_member"], target_member: intent.target_member || null },
        nextState: {
          pending_intent: intent,
          asked_for: ["target_member"],
          updated_at: new Date().toISOString(),
        },
      };
    }

    const amount = parsePositiveAmount(intent.amount);
    const contributionType = normalizeContributionType(intent.contribution_type, inboundText);
    const referenceNumber = intent.reference_number || null;
    const notes = [
      "Submitted via WhatsApp assistant; awaiting finance verification.",
      `Original message: ${inboundText}`,
    ].join("\n");

    const { data, error } = await supabase
      .from("contributions")
      .insert({
        member_id: target.profile.id,
        amount,
        contribution_type: contributionType,
        status: "pending",
        reference_number: referenceNumber,
        notes,
      })
      .select("id, amount, contribution_type, status, reference_number, created_at")
      .single();

    if (error || !data) throw new HttpError(500, "Failed to record WhatsApp contribution", error);

    const targetText = target.profile.id === profile.id ? "" : ` for ${target.profile.full_name}`;
    const reply = language === "sw"
      ? `Nimerekodi mchango${targetText} wa ${formatMoney(amount)} (${contributionType}). Status ni pending verification.${referenceNumber ? ` Ref: ${referenceNumber}.` : ""}`
      : `I recorded a ${formatMoney(amount)} ${contributionType} contribution${targetText}. It is pending finance verification.${referenceNumber ? ` Ref: ${referenceNumber}.` : ""}`;

    return {
      actionStatus: "completed",
      reply,
      result: data as Record<string, unknown>,
      contributionId: String((data as Record<string, unknown>).id),
      nextState: {},
    };
  }

  if (intent.intent === "record_expenditure") {
    if (!roles.some((role) => FINANCE_ROLES.has(role))) {
      return {
        actionStatus: "blocked",
        reply: language === "sw"
          ? "Ni treasurer au admin pekee anaweza kurekodi expenditure kupitia WhatsApp."
          : "Only a treasurer or admin can record an expenditure through WhatsApp.",
        result: { roles },
        nextState: {},
      };
    }

    if (!intent.amount) {
      return {
        actionStatus: "needs_clarification",
        reply: language === "sw"
          ? "Nimeelewa ni expenditure, lakini sijapata kiasi. Ni KSh ngapi?"
          : "I understood this as an expenditure, but I need the amount. How much was spent?",
        result: { missing: ["amount"] },
        nextState: {
          pending_intent: intent,
          asked_for: ["amount"],
          updated_at: new Date().toISOString(),
        },
      };
    }

    const amount = parsePositiveAmount(intent.amount);
    const description = intent.description || inboundText;
    const category = inferExpenseCategory(inboundText, intent.category);
    const paymentMethod = normalizePaymentMethod(intent.payment_method, inboundText);

    const { data, error } = await supabase
      .from("expenditures")
      .insert({
        amount,
        category,
        description,
        payment_method: paymentMethod,
        expense_date: parseExpenseDate(intent.transaction_date),
        payee: intent.payee || null,
        reference_number: intent.reference_number || null,
        fund: "general",
        notes: `Submitted via WhatsApp assistant. Original message: ${inboundText}`,
        initiated_by: profile.id,
        status: "pending_approval",
      })
      .select("id, amount, category, description, payment_method, expense_date, status, reference_number")
      .single();

    if (error || !data) throw new HttpError(500, "Failed to record WhatsApp expenditure", error);

    const reply = language === "sw"
      ? `Nimerekodi expenditure ya ${formatMoney(amount)} (${category}). Status ni pending approval.${intent.reference_number ? ` Ref: ${intent.reference_number}.` : ""}`
      : `I recorded an expenditure of ${formatMoney(amount)} (${category}). It is pending approval.${intent.reference_number ? ` Ref: ${intent.reference_number}.` : ""}`;

    return {
      actionStatus: "completed",
      reply,
      result: data as Record<string, unknown>,
      expenditureId: String((data as Record<string, unknown>).id),
      nextState: {},
    };
  }

  return {
    actionStatus: "needs_clarification",
    reply: language === "sw"
      ? `Sijakuelewa vizuri. ${helpReply("sw", roles, profile)}`
      : `I did not fully understand that. ${helpReply("en", roles, profile)}`,
    result: { intent: "unknown" },
    nextState: {},
  };
}

async function logInboundMessage(
  supabase: SupabaseClient,
  message: InboundMessage,
  profile: Profile | null,
): Promise<{ id: string | null; duplicate: boolean }> {
  const { data: existing, error: existingError } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("provider_message_id", message.providerMessageId)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    throw new HttpError(500, "Failed to check WhatsApp message idempotency", existingError);
  }

  if (existing?.id) return { id: String(existing.id), duplicate: true };

  const { data, error } = await supabase
    .from("whatsapp_messages")
    .insert({
      provider_message_id: message.providerMessageId,
      direction: "inbound",
      phone: message.phone,
      profile_id: profile?.id || null,
      message_type: message.type,
      body: message.text || null,
      status: "received",
      raw_payload: message.raw,
    })
    .select("id")
    .single();

  if (error || !data) throw new HttpError(500, "Failed to log inbound WhatsApp message", error);
  return { id: String((data as Record<string, unknown>).id), duplicate: false };
}

async function logOutboundMessage(
  supabase: SupabaseClient,
  phone: string,
  profile: Profile | null,
  body: string,
  status: string,
  providerResponse: unknown,
  providerMessageId: string | null,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .insert({
      provider_message_id: providerMessageId,
      direction: "outbound",
      phone,
      profile_id: profile?.id || null,
      message_type: "text",
      body,
      status,
      provider_response: providerResponse ?? null,
      raw_payload: {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to log outbound WhatsApp message", error);
    return null;
  }

  return data ? String((data as Record<string, unknown>).id) : null;
}

async function sendWhatsAppText(
  to: string,
  body: string,
  phoneNumberId: string | null,
): Promise<{ status: string; providerResponse: unknown; providerMessageId: string | null }> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const resolvedPhoneNumberId = phoneNumberId || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();

  if (!accessToken || !resolvedPhoneNumberId) {
    return {
      status: "skipped_missing_provider_config",
      providerResponse: { skipped: true, reason: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID" },
      providerMessageId: null,
    };
  }

  const apiVersion = Deno.env.get("WHATSAPP_GRAPH_API_VERSION")?.trim() || "v20.0";
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${resolvedPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: shorten(body, 3900),
      },
    }),
  });

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    console.error("WhatsApp send failed", response.status, payload);
    return { status: "send_failed", providerResponse: payload, providerMessageId: null };
  }

  const messages = payload?.messages as Array<Record<string, unknown>> | undefined;
  const providerMessageId = cleanString(messages?.[0]?.id);
  return { status: "sent", providerResponse: payload, providerMessageId };
}

async function sendAndLogReply(
  supabase: SupabaseClient,
  message: InboundMessage,
  profile: Profile | null,
  body: string,
  includeRatingPrompt = profile !== null,
): Promise<string | null> {
  const finalBody = includeRatingPrompt ? appendRatingPrompt(body) : body;
  const sendResult = await sendWhatsAppText(message.phone, finalBody, message.phoneNumberId);
  const outboundMessageId = await logOutboundMessage(
    supabase,
    message.phone,
    profile,
    finalBody,
    sendResult.status,
    sendResult.providerResponse,
    sendResult.providerMessageId,
  );
  await markSessionOutbound(supabase, message.phone);
  return outboundMessageId;
}

async function recordAction(
  supabase: SupabaseClient,
  profile: Profile,
  phone: string,
  inboundMessageId: string | null,
  text: string,
  parsed: ParsedIntent,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("whatsapp_actions")
    .insert({
      profile_id: profile.id,
      phone,
      inbound_message_id: inboundMessageId,
      intent: parsed.intent,
      confidence: parsed.confidence,
      language: parsed.language,
      status: "received",
      input_text: text,
      parsed,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create WhatsApp action audit", error);
    return null;
  }

  return data ? String((data as Record<string, unknown>).id) : null;
}

async function completeAction(
  supabase: SupabaseClient,
  actionId: string | null,
  execution: ExecutionResult,
  outboundMessageId: string | null,
): Promise<void> {
  if (!actionId) return;

  const { error } = await supabase
    .from("whatsapp_actions")
    .update({
      status: execution.actionStatus,
      result: execution.result,
      contribution_id: execution.contributionId || null,
      expenditure_id: execution.expenditureId || null,
      welfare_case_id: execution.welfareCaseId || null,
      outbound_message_id: outboundMessageId,
    })
    .eq("id", actionId);

  if (error) console.error("Failed to complete WhatsApp action audit", error);
}

async function recordConversationRating(
  supabase: SupabaseClient,
  message: InboundMessage,
  profile: Profile,
  inboundMessageId: string | null,
  rating: ConversationRating,
): Promise<void> {
  const { data: ratedMessage, error: ratedMessageError } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("phone", message.phone)
    .eq("profile_id", profile.id)
    .eq("direction", "outbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ratedMessageError && ratedMessageError.code !== "PGRST116") {
    throw new HttpError(500, "Failed to find latest WhatsApp assistant reply for rating", ratedMessageError);
  }

  const ratedMessageId = ratedMessage ? String((ratedMessage as Record<string, unknown>).id) : null;
  let ratedActionId: string | null = null;

  if (ratedMessageId) {
    const { data: ratedAction, error: ratedActionError } = await supabase
      .from("whatsapp_actions")
      .select("id")
      .eq("outbound_message_id", ratedMessageId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ratedActionError && ratedActionError.code !== "PGRST116") {
      throw new HttpError(500, "Failed to find latest WhatsApp action for rating", ratedActionError);
    }

    ratedActionId = ratedAction ? String((ratedAction as Record<string, unknown>).id) : null;
  }

  const { error } = await supabase
    .from("whatsapp_conversation_ratings")
    .insert({
      profile_id: profile.id,
      phone: message.phone,
      inbound_message_id: inboundMessageId,
      rated_message_id: ratedMessageId,
      rated_action_id: ratedActionId,
      rating_emoji: rating.emoji,
      rating_score: rating.score,
      rating_label: rating.label,
      raw_text: message.text,
    });

  if (error) {
    throw new HttpError(500, "Failed to save WhatsApp conversation rating", error);
  }
}

async function handleInboundMessage(supabase: SupabaseClient, message: InboundMessage): Promise<void> {
  const profile = await findRegisteredProfile(supabase, message.from);
  const inboundLog = await logInboundMessage(supabase, message, profile);
  if (inboundLog.duplicate) return;

  if (!profile) {
    try {
      await handleUnregisteredNumber(supabase, message, inboundLog);
    } catch (error) {
      console.error("WhatsApp registration flow failed", error);
      const language = detectLanguage(message.text || "");
      await sendAndLogReply(
        supabase,
        message,
        null,
        language === "sw"
          ? "Samahani, sijaweza kukamilisha hatua hiyo sasa. Jaribu tena baada ya muda mfupi au wasiliana na admin."
          : "Sorry, I could not complete that step right now. Please try again shortly or contact an admin.",
      );
    }
    return;
  }

  if (!message.text) {
    await sendAndLogReply(
      supabase,
      message,
      profile,
      `Hi ${memberGreetingName(profile)}, please send a text message. I can understand English or Kiswahili and help with contributions, balances, announcements, meetings, welfare, and finance records.`,
    );
    return;
  }

  const conversationRating = detectConversationRating(message.text);
  if (conversationRating) {
    try {
      await recordConversationRating(supabase, message, profile, inboundLog.id, conversationRating);
      await updateSessionState(supabase, message.phone, {}, "feedback_rating");
      await sendAndLogReply(
        supabase,
        message,
        profile,
        ratingThanksReply(profile, conversationRating, detectLanguage(message.text)),
        false,
      );
    } catch (error) {
      console.error("WhatsApp rating save failed", error);
      await sendAndLogReply(
        supabase,
        message,
        profile,
        "Sorry, I could not save that rating right now. Please try again shortly.",
        false,
      );
    }
    return;
  }

  const roles = await getUserRoles(supabase, profile.id);
  const [session, context] = await Promise.all([
    upsertSession(supabase, message.phone, profile),
    loadFinanceContext(supabase, profile.id),
  ]);
  await maybeSendWelcomeBack(supabase, message, profile, session, detectLanguage(message.text));

  const interpreted = await interpretMessage(message.text, profile, roles);
  const parsed = mergeWithPendingIntent(interpreted, session);
  const actionId = await recordAction(supabase, profile, message.phone, inboundLog.id, message.text, parsed);

  try {
    const execution = await executeIntent(supabase, parsed, profile, roles, context, message.text);
    const outboundMessageId = await sendAndLogReply(supabase, message, profile, execution.reply);
    await completeAction(supabase, actionId, execution, outboundMessageId);
    await updateSessionState(supabase, message.phone, execution.nextState ?? {}, parsed.intent);
  } catch (error) {
    const language = parsed.language === "auto" ? detectLanguage(message.text) : parsed.language;
    const reply = language === "sw"
      ? "Samahani, nimepata hitilafu nikishughulikia ujumbe wako. Jaribu tena baada ya muda mfupi."
      : "Sorry, I hit an error while handling your message. Please try again shortly.";
    const outboundMessageId = await sendAndLogReply(supabase, message, profile, reply);
    await completeAction(
      supabase,
      actionId,
      {
        actionStatus: "failed",
        reply,
        result: { error: error instanceof Error ? error.message : String(error) },
        nextState: session.state ?? {},
      },
      outboundMessageId,
    );
    console.error("WhatsApp message handling failed", error);
  }
}

function verifyWebhook(req: Request): Response {
  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN")?.trim();
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (!verifyToken) throw new HttpError(500, "Missing WHATSAPP_VERIFY_TOKEN");
  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain",
      },
    });
  }

  throw new HttpError(403, "WhatsApp webhook verification failed");
}

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") return verifyWebhook(req);
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");

    const rawBody = await req.text();
    const signatureValid = await verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"));
    if (!signatureValid) throw new HttpError(401, "Invalid WhatsApp webhook signature");

    const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    const messages = extractInboundMessages(payload);
    const supabase = createServiceClient();

    for (const message of messages) {
      await handleInboundMessage(supabase, message);
    }

    return jsonResponse({ ok: true, received: messages.length });
  } catch (error) {
    console.error("whatsapp-bot failed", error);
    return errorResponse(error);
  }
});
