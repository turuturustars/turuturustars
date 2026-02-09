import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import sourcesData from "./sources.json" assert { type: "json" };

const DEFAULT_SOURCES = ["MyGov Job Adverts", "Public Service Commission", "Murang'a County Government"];
const MAX_PER_SOURCE = Number(Deno.env.get("MAX_PER_SOURCE") || 20);
const REQUEST_DELAY_MS = Number(Deno.env.get("REQUEST_DELAY_MS") || 1200);

const JOBS_INGEST_URL =
  Deno.env.get("JOBS_INGEST_URL") ||
  (Deno.env.get("SUPABASE_URL")
    ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/jobs-ingest`
    : "");

const JOBS_INGEST_KEY = Deno.env.get("JOBS_INGEST_KEY") || "";
const SOURCE_FILTER = (Deno.env.get("JOB_SOURCES") || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const stripTags = (value: string) => value.replace(/<[^>]+>/g, "");

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

const looksLikeJob = (text: string, url: string) => {
  const haystack = `${text} ${url}`.toLowerCase();
  return haystack.includes("job") ||
    haystack.includes("vacan") ||
    haystack.includes("advert") ||
    haystack.includes("career") ||
    haystack.includes("recruit");
};

const buildJobs = (links: Array<{ url: string; text: string }>, source: any): Job[] => {
  const now = new Date().toISOString();
  return links.map((link) => ({
    title: link.text,
    organization: source.name,
    location: "Kenya",
    county: "Kenya",
    job_type: "other",
    deadline: null,
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

  if (!JOBS_INGEST_URL || !JOBS_INGEST_KEY) {
    return new Response(JSON.stringify({ error: "Missing JOBS_INGEST_URL or JOBS_INGEST_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const selected = (sourcesData.sources as any[]).filter((source) =>
    SOURCE_FILTER.length ? SOURCE_FILTER.includes(source.name) : DEFAULT_SOURCES.includes(source.name) || source.priority <= 2
  );

  const summary: Array<{ source: string; found: number; sent: number; error?: string }> = [];

  for (const source of selected) {
    try {
      const resp = await fetch(source.url, {
        headers: {
          "User-Agent": "TuruturuStarsJobsBot/1.0 (+https://turuturustars.co.ke)",
        },
      });
      const html = await resp.text();
      const links = extractLinks(html, source.url)
        .filter((link) => looksLikeJob(link.text, link.url))
        .slice(0, MAX_PER_SOURCE);

      if (!links.length) {
        summary.push({ source: source.name, found: 0, sent: 0 });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const jobs = buildJobs(links, source);

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

      await sleep(REQUEST_DELAY_MS);
    } catch (error) {
      summary.push({ source: source.name, found: 0, sent: 0, error: String(error) });
    }
  }

  return new Response(JSON.stringify({ success: true, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
