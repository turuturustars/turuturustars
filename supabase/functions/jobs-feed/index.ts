import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://turuturustars.co.ke";

type Job = {
  id: string;
  title: string;
  organization: string;
  location: string;
  county: string;
  job_type: string;
  deadline: string;
  posted_at: string;
  source_name: string;
  source_url: string;
  apply_url?: string | null;
  excerpt?: string | null;
};

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const renderSitemap = (jobs: Job[]) => {
  const items = jobs
    .map((job) => {
      const loc = job.apply_url || job.source_url;
      return `<url><loc>${esc(loc)}</loc><lastmod>${esc(job.posted_at)}</lastmod><changefreq>daily</changefreq><priority>0.5</priority></url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
};

const renderAtom = (jobs: Job[]) => {
  const updated = jobs[0]?.posted_at || new Date().toISOString();
  const entries = jobs
    .map((job) => {
      const link = job.apply_url || job.source_url;
      const summary = esc(job.excerpt || `${job.title} at ${job.organization} in ${job.location}`);
      return `
      <entry>
        <id>tag:turuturustars.co.ke,job:${job.id}</id>
        <title>${esc(job.title)} - ${esc(job.organization)}</title>
        <link href="${esc(link)}" />
        <updated>${esc(job.posted_at)}</updated>
        <summary>${summary}</summary>
      </entry>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Turuturu Stars Jobs</title>
  <link href="${esc(SITE_URL)}/careers" />
  <updated>${esc(updated)}</updated>
  <id>tag:turuturustars.co.ke,jobs</id>
  ${entries}
</feed>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "sitemap";

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id,title,organization,location,county,job_type,deadline,posted_at,source_name,source_url,apply_url,excerpt"
      )
      .eq("status", "approved")
      .gte("deadline", new Date().toISOString().split("T")[0])
      .order("deadline", { ascending: true })
      .limit(200);

    if (error) throw error;
    const jobs = (data || []) as Job[];

    if (format === "atom") {
      return new Response(renderAtom(jobs), {
        headers: { ...corsHeaders, "Content-Type": "application/atom+xml; charset=utf-8" },
      });
    }

    return new Response(renderSitemap(jobs), {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(message, { status: 400, headers: corsHeaders });
  }
});
