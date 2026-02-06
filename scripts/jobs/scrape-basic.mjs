import fs from "node:fs/promises";
import { URL } from "node:url";

const DEFAULT_SOURCES = [
  "MyGov Job Adverts",
  "Public Service Commission",
  "Murang'a County Government",
];

const JOBS_INGEST_URL =
  process.env.JOBS_INGEST_URL ||
  (process.env.SUPABASE_URL
    ? `${process.env.SUPABASE_URL}/functions/v1/jobs-ingest`
    : "");

const JOBS_INGEST_KEY = process.env.JOBS_INGEST_KEY || "";
const SOURCE_FILTER = process.env.JOB_SOURCES
  ? process.env.JOB_SOURCES.split(",").map((value) => value.trim())
  : DEFAULT_SOURCES;

const MAX_PER_SOURCE = Number(process.env.MAX_PER_SOURCE || 20);
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 1200);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stripTags = (value) => value.replace(/<[^>]+>/g, "");

const extractLinks = (html, baseUrl) => {
  const links = [];
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = null;
  while ((match = regex.exec(html))) {
    const href = match[1];
    if (!href || href.startsWith("mailto:") || href.startsWith("javascript:")) {
      continue;
    }
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

const looksLikeJob = (text, url) => {
  const haystack = `${text} ${url}`.toLowerCase();
  return (
    haystack.includes("job") ||
    haystack.includes("vacan") ||
    haystack.includes("advert") ||
    haystack.includes("career") ||
    haystack.includes("recruit")
  );
};

const main = async () => {
  if (!JOBS_INGEST_URL || !JOBS_INGEST_KEY) {
    console.error("Missing JOBS_INGEST_URL or JOBS_INGEST_KEY env vars.");
    process.exit(1);
  }

  const registryRaw = await fs.readFile("data/job-sources.json", "utf8");
  const registry = JSON.parse(registryRaw);
  const sources = registry.sources.filter((source) =>
    SOURCE_FILTER.includes(source.name)
  );

  if (!sources.length) {
    console.error("No matching sources found. Check JOB_SOURCES env.");
    process.exit(1);
  }

  for (const source of sources) {
    console.log(`Fetching ${source.name} -> ${source.url}`);
    let html = "";
    try {
      const response = await fetch(source.url, {
        headers: {
          "User-Agent": "TuruturuStarsJobsBot/1.0 (+https://turuturustars.co.ke)",
        },
      });
      html = await response.text();
    } catch (error) {
      console.error(`Failed to fetch ${source.url}`, error);
      continue;
    }

    const links = extractLinks(html, source.url)
      .filter((link) => looksLikeJob(link.text, link.url))
      .slice(0, MAX_PER_SOURCE);

    if (!links.length) {
      console.log(`No job-like links found for ${source.name}.`);
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    const jobs = links.map((link) => ({
      title: link.text,
      organization: source.name,
      location: "Kenya",
      county: "Kenya",
      job_type: "other",
      deadline: null,
      posted_at: new Date().toISOString(),
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

    const response = await fetch(JOBS_INGEST_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ingest-key": JOBS_INGEST_KEY,
      },
      body: JSON.stringify({ jobs }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Ingest failed for ${source.name}: ${response.status}`, body);
    } else {
      const body = await response.json();
      console.log(`Ingested ${source.name}`, body);
    }

    await sleep(REQUEST_DELAY_MS);
  }
};

main();
