import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import sourcesData from "./sources.json" assert { type: "json" };

export const config = {
  // We handle auth manually to support cron token and official user auth.
  verify_jwt: false,
};

const DEFAULT_MAX_PER_SOURCE = 20;
const DEFAULT_REQUEST_DELAY_MS = 1200;
const DEFAULT_MAX_PRIORITY = 2;

const JOBS_INGEST_URL =
  Deno.env.get("JOBS_INGEST_URL") ||
  (Deno.env.get("SUPABASE_URL")
    ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/jobs-ingest`
    : "");

const JOBS_INGEST_KEY = Deno.env.get("JOBS_INGEST_KEY") || "";
const CRON_SECRET = Deno.env.get("JOBS_CRON_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const SCRAPE_CONTROL_ROLES = ["admin"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-key, x-cron-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

type Actor =
  | { ok: true; actor: "cron"; role: "cron"; userId?: undefined }
  | { ok: true; actor: "admin"; role: string; userId: string }
  | { ok: false; status: number; message: string };

type Job = {
  title: string;
  organization: string;
  location: string;
  county: string;
  job_type: string;
  deadline: string | null;
  posted_at: string;
  source_name: string;
  source_url: string;
  apply_url: string;
  excerpt: string | null;
  external_id: string | null;
  is_government: boolean;
  status: "pending" | "approved" | "rejected";
};

type Source = {
  name: string;
  url: string;
  category?: string;
  priority?: number;
  is_active?: boolean;
};

type RuntimeSettings = {
  maxPerSource: number;
  requestDelayMs: number;
  maxPriority: number;
  sourceMode: "database" | "fallback_json";
  availableSources: Source[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const stripTags = (value: string) => value.replace(/<[^>]+>/g, "");
const keywordRegex = /(job|vacan|career|recruit|opportunit|internship|position|employment)/i;
const utilityTextRegex = /^(skip|increase text|decrease text|search|menu|close|open|read more|click here|home|vacancies?|job adverts?)$/i;

const createServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

const authorize = async (req: Request): Promise<Actor> => {
  if (CRON_SECRET && req.headers.get("x-cron-key") === CRON_SECRET) {
    return { ok: true, actor: "cron", role: "cron" };
  }

  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "Missing auth" };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, status: 500, message: "Missing SUPABASE_URL or SERVICE_ROLE_KEY" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const userId = userData.user.id;
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (roleError || !roles?.length) {
    return { ok: false, status: 403, message: "No role" };
  }

  const matchedRole = roles
    .map((row: { role: string }) => row.role)
    .find((role: string) => SCRAPE_CONTROL_ROLES.includes(role));

  if (!matchedRole) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  return { ok: true, actor: "admin", role: matchedRole, userId };
};

const extractLinks = (html: string, baseUrl: string) => {
  const links: Array<{ url: string; text: string }> = [];
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const href = match[1];
    if (!href || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    const text = stripTags(match[2]).replace(/\s+/g, " ").trim();
    if (!text) continue;
    let absolute = href;
    try {
      absolute = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    links.push({ url: absolute, text });
  }
  return links;
};

const dedupeLinks = (links: Array<{ url: string; text: string }>) => {
  const seen = new Set<string>();
  const unique: Array<{ url: string; text: string }> = [];
  for (const link of links) {
    if (seen.has(link.url)) continue;
    seen.add(link.url);
    unique.push(link);
  }
  return unique;
};

const isSameDocumentLink = (candidateUrl: string, sourceUrl: string) => {
  try {
    const candidate = new URL(candidateUrl);
    const source = new URL(sourceUrl);
    return candidate.origin === source.origin &&
      candidate.pathname === source.pathname &&
      candidate.search === source.search;
  } catch {
    return false;
  }
};

const looksLikeJob = (text: string, url: string, sourceUrl: string) => {
  const normalizedText = text.trim().toLowerCase();
  if (!normalizedText || normalizedText.length < 3) return false;
  if (utilityTextRegex.test(normalizedText)) return false;
  if (isSameDocumentLink(url, sourceUrl)) return false;

  const haystack = `${normalizedText} ${url}`.toLowerCase();
  if (keywordRegex.test(haystack)) return true;

  // Dedicated jobs/careers pages often link to job PDF adverts with non-keyword titles.
  const sourceHintsJobs = /(job|vacan|career|recruit)/i.test(sourceUrl);
  const isLikelyAdDocument = /\.(pdf|doc|docx)$/i.test(url);
  if (sourceHintsJobs && isLikelyAdDocument && normalizedText.length >= 8) return true;

  return false;
};

const buildJobs = (links: Array<{ url: string; text: string }>, source: Source, defaultDeadline: string): Job[] => {
  const now = new Date().toISOString();
  return links.map((link) => ({
    title: link.text,
    organization: source.name,
    location: "Kenya",
    county: "Kenya",
    job_type: "other",
    deadline: defaultDeadline,
    posted_at: now,
    source_name: source.name,
    source_url: link.url,
    apply_url: link.url,
    excerpt: null,
    external_id: null,
    is_government:
      source.category === "county" ||
      source.category === "government_portal" ||
      source.category === "state_corporation",
    status: "pending",
  }));
};

const loadRuntimeSettings = async (): Promise<RuntimeSettings> => {
  const fallbackSources = (sourcesData.sources || []) as Source[];
  const fallback: RuntimeSettings = {
    maxPerSource: DEFAULT_MAX_PER_SOURCE,
    requestDelayMs: DEFAULT_REQUEST_DELAY_MS,
    maxPriority: DEFAULT_MAX_PRIORITY,
    sourceMode: "fallback_json",
    availableSources: fallbackSources,
  };

  const supabase = createServiceClient();
  if (!supabase) return fallback;

  const settingsQuery = supabase
    .from("job_scrape_settings")
    .select("max_per_source,request_delay_ms,job_max_priority")
    .eq("id", 1)
    .maybeSingle();

  const sourcesQuery = supabase
    .from("job_scrape_sources")
    .select("name,url,category,priority,is_active")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("name", { ascending: true });

  const [settingsResp, sourcesResp] = await Promise.all([settingsQuery, sourcesQuery]);

  const row = settingsResp.error ? null : settingsResp.data;
  const dbSources = sourcesResp.error ? null : sourcesResp.data;

  if (!row && (!dbSources || dbSources.length === 0)) {
    return fallback;
  }

  return {
    maxPerSource: Number(row?.max_per_source ?? DEFAULT_MAX_PER_SOURCE),
    requestDelayMs: Number(row?.request_delay_ms ?? DEFAULT_REQUEST_DELAY_MS),
    maxPriority: Number(row?.job_max_priority ?? DEFAULT_MAX_PRIORITY),
    sourceMode: dbSources && dbSources.length > 0 ? "database" : "fallback_json",
    availableSources: (dbSources && dbSources.length > 0
      ? (dbSources as Source[])
      : fallbackSources),
  };
};

const asNumber = (value: unknown, fallback: number) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await authorize(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.message }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!JOBS_INGEST_URL || !JOBS_INGEST_KEY) {
    return new Response(JSON.stringify({ error: "Missing JOBS_INGEST_URL or JOBS_INGEST_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
  }

  const runtime = await loadRuntimeSettings();
  const query = new URL(req.url).searchParams;

  const overrideSources = Array.isArray(payload.sources)
    ? (payload.sources as string[]).map((v) => v.trim()).filter(Boolean)
    : (query.get("sources") || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const priorityCutoff = asNumber(
    payload.max_priority ?? query.get("max_priority"),
    runtime.maxPriority,
  );

  const maxPerSource = asNumber(
    payload.max_per_source ?? query.get("max_per_source"),
    runtime.maxPerSource,
  );

  const requestDelayMs = asNumber(
    payload.request_delay_ms ?? query.get("request_delay_ms"),
    runtime.requestDelayMs,
  );

  const selected = runtime.availableSources
    .filter((source) => {
      if (overrideSources.length > 0) return overrideSources.includes(source.name);
      return (source.priority ?? 99) <= priorityCutoff;
    })
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  const defaultDeadline = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  })();

  const summary: Array<{ source: string; found: number; sent: number; error?: string }> = [];

  for (const source of selected) {
    try {
      const resp = await fetch(source.url, {
        headers: {
          "User-Agent": "TuruturuStarsJobsBot/1.0 (+https://turuturustars.co.ke)",
        },
      });
      if (!resp.ok) {
        summary.push({
          source: source.name,
          found: 0,
          sent: 0,
          error: `Source request failed with status ${resp.status}`,
        });
        await sleep(requestDelayMs);
        continue;
      }

      const html = await resp.text();
      const links = dedupeLinks(extractLinks(html, source.url)
        .filter((link) => looksLikeJob(link.text, link.url, source.url))
        .slice(0, maxPerSource));

      if (links.length === 0) {
        summary.push({ source: source.name, found: 0, sent: 0 });
        await sleep(requestDelayMs);
        continue;
      }

      const jobs = buildJobs(links, source, defaultDeadline);
      const ingestResp = await fetch(JOBS_INGEST_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ingest-key": JOBS_INGEST_KEY,
        },
        body: JSON.stringify({ jobs }),
      });

      if (!ingestResp.ok) {
        const text = await ingestResp.text();
        summary.push({ source: source.name, found: links.length, sent: 0, error: text });
      } else {
        summary.push({ source: source.name, found: links.length, sent: jobs.length });
      }

      await sleep(requestDelayMs);
    } catch (error) {
      summary.push({ source: source.name, found: 0, sent: 0, error: String(error) });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    actor: auth.actor,
    role: auth.role,
    ran_at: new Date().toISOString(),
    settings: {
      max_per_source: maxPerSource,
      request_delay_ms: requestDelayMs,
      job_max_priority: priorityCutoff,
      source_mode: runtime.sourceMode,
    },
    sources_requested: overrideSources.length > 0 ? overrideSources : undefined,
    selected_sources: selected.length,
    summary,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
