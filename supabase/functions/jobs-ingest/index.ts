import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JOBS_INGEST_KEY = Deno.env.get("JOBS_INGEST_KEY")!;

type JobType =
  | "casual"
  | "contract"
  | "part_time"
  | "full_time"
  | "permanent"
  | "temporary"
  | "internship"
  | "volunteer"
  | "other";

type JobPayload = {
  title: string;
  organization: string;
  location: string;
  county: string;
  job_type?: JobType;
  deadline?: string | null;
  posted_at?: string;
  source_name: string;
  source_url: string;
  apply_url?: string | null;
  excerpt?: string | null;
  external_id?: string | null;
  is_government?: boolean;
  is_priority_location?: boolean;
  status?: "pending" | "approved" | "rejected";
  rejected_reason?: string | null;
};

const normalizeJobType = (value?: string): JobType => {
  if (!value) return "other";
  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  const allowed: JobType[] = [
    "casual",
    "contract",
    "part_time",
    "full_time",
    "permanent",
    "temporary",
    "internship",
    "volunteer",
    "other",
  ];
  return allowed.includes(normalized as JobType) ? (normalized as JobType) : "other";
};

const normalizeText = (value?: string | null, fallback = "") =>
  (value ?? fallback).toString().trim();

const isMuranga = (value: string) => value.toLowerCase().includes("murang");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const ingestKey = req.headers.get("x-ingest-key");
    if (!JOBS_INGEST_KEY || ingestKey !== JOBS_INGEST_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawJobs = Array.isArray(body?.jobs) ? body.jobs : [];
    if (rawJobs.length === 0) {
      return new Response(JSON.stringify({ error: "No jobs provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();
    const cleaned = rawJobs
      .map((job: JobPayload) => {
        const title = normalizeText(job.title);
        const organization = normalizeText(job.organization);
        const location = normalizeText(job.location, "Kenya");
        const county = normalizeText(job.county, "Kenya");
        const sourceName = normalizeText(job.source_name);
        const sourceUrl = normalizeText(job.source_url);
        const deadline = normalizeText(job.deadline ?? null, null as unknown as string) || null;
        const postedAt = normalizeText(job.posted_at ?? nowIso);
        if (!title || !organization || !sourceName || !sourceUrl || !deadline) {
          if (!title || !organization || !sourceName || !sourceUrl) {
            return null;
          }
        }

        const priority =
          job.is_priority_location ??
          (isMuranga(county) || isMuranga(location));

        const status = job.status ?? (deadline ? "approved" : "pending");

        return {
          title,
          organization,
          location,
          county,
          job_type: normalizeJobType(job.job_type),
          deadline,
          posted_at: postedAt,
          source_name: sourceName,
          source_url: sourceUrl,
          apply_url: normalizeText(job.apply_url || sourceUrl, sourceUrl),
          excerpt: normalizeText(job.excerpt, null as unknown as string) || null,
          external_id: normalizeText(job.external_id ?? null, null as unknown as string) || null,
          is_government: Boolean(job.is_government),
          is_priority_location: Boolean(priority),
          status,
          rejected_reason: normalizeText(job.rejected_reason ?? null, null as unknown as string) || null,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    if (cleaned.length === 0) {
      return new Response(JSON.stringify({ error: "No valid jobs after validation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const withExternalId = cleaned.filter((job) => job.external_id);
    const withoutExternalId = cleaned.filter((job) => !job.external_id);

    const results = [];

    if (withExternalId.length > 0) {
      const { error } = await supabase
        .from("jobs")
        .upsert(withExternalId, { onConflict: "source_name,external_id" });
      if (error) throw error;
      results.push({ group: "external_id", count: withExternalId.length });
    }

    if (withoutExternalId.length > 0) {
      const { error } = await supabase
        .from("jobs")
        .upsert(withoutExternalId, { onConflict: "source_url" });
      if (error) throw error;
      results.push({ group: "source_url", count: withoutExternalId.length });
    }

    return new Response(JSON.stringify({ success: true, inserted: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
