-- Community memory collection for the WhatsApp assistant.
-- Stores community-submitted facts separately until officials review them.

create table if not exists public.community_knowledge_submissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  phone text,
  source text not null default 'whatsapp',
  topic text not null default 'general',
  area text,
  question text,
  answer text not null,
  attribution_name text,
  consent_to_use boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'archived')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  ai_knowledge_base_id uuid references public.ai_knowledge_base(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_knowledge_submissions_status_created_idx
  on public.community_knowledge_submissions (status, created_at desc);

create index if not exists community_knowledge_submissions_profile_created_idx
  on public.community_knowledge_submissions (profile_id, created_at desc);

create index if not exists community_knowledge_submissions_topic_area_idx
  on public.community_knowledge_submissions (topic, area);

alter table public.community_knowledge_submissions enable row level security;

drop policy if exists "Officials can manage community knowledge submissions" on public.community_knowledge_submissions;
create policy "Officials can manage community knowledge submissions"
on public.community_knowledge_submissions
for all
to authenticated
using (public.is_official((select auth.uid())))
with check (public.is_official((select auth.uid())));

drop policy if exists "Members can create own community knowledge submissions" on public.community_knowledge_submissions;
create policy "Members can create own community knowledge submissions"
on public.community_knowledge_submissions
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "Members can view own community knowledge submissions" on public.community_knowledge_submissions;
create policy "Members can view own community knowledge submissions"
on public.community_knowledge_submissions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop trigger if exists update_community_knowledge_submissions_updated_at
  on public.community_knowledge_submissions;
create trigger update_community_knowledge_submissions_updated_at
  before update on public.community_knowledge_submissions
  for each row execute function public.update_updated_at();

grant select, insert, update on public.community_knowledge_submissions to authenticated;
revoke all on public.community_knowledge_submissions from anon;

do $$
declare
  entry jsonb;
begin
  for entry in
    select value
    from jsonb_array_elements($json$
[
  {
    "category": "community",
    "bot_scope": "both",
    "title": "Turuturu Stars community identity",
    "content": "Turuturu Stars began from the Turuturu Primary alumni idea, then expanded into a wider community platform so it can include people connected to the area, including alumni of other schools, people married into the village, neighbours, students, families, and supporters. When asked who belongs, explain that the spirit is community inclusion, not only Turuturu Primary alumni.",
    "metadata": {
      "seed": true,
      "source": "community_owner_prompt",
      "confidence": "community_submitted",
      "search_terms": ["turuturu stars", "turuturu primary alumni", "community", "who can join", "village", "married into village", "other schools"]
    }
  },
  {
    "category": "community",
    "bot_scope": "both",
    "title": "Turuturu Stars villages and neighbouring areas",
    "content": "Community-submitted areas connected to Turuturu Stars include Turuturu, Githima, Mutoho, Githeru, Duka Moja, Gatune, Daboo, Kiangige, Githioro, and Jogoo. Neighbouring or closely connected villages mentioned by the community include Kahariro, Kadiri, Kiugu, Nguku, Kiahigaini, Ngaru, Kahethu, and Kairi in Kandara. Treat spellings and boundaries as community knowledge that officials can refine.",
    "metadata": {
      "seed": true,
      "source": "community_owner_prompt",
      "confidence": "community_submitted",
      "search_terms": ["turuturu", "githima", "mutoho", "githeru", "duka moja", "gatune", "daboo", "kiangige", "githioro", "jogoo", "kahariro", "kadiri", "kiugu", "nguku", "kiahigaini", "ngaru", "kahethu", "kairi", "kandara", "villages", "areas"]
    }
  },
  {
    "category": "schools",
    "bot_scope": "both",
    "title": "Turuturu Primary School verified public details",
    "content": "Public directories identify Turuturu Primary School as a public mixed day primary school in Kigumo Constituency, Murang'a County, Kenya. Data Afro lists the school as public, primary level, Ministry of Education 2016 source, code 21202, ward Kigumo, zone Kigumo, latitude -0.834423 and longitude 37.01094. ShuleZote also lists nearby schools including Turuturu Secondary, Githima Secondary, Githima Primary, Kahariro Primary, and Gatitu-Ini Primary.",
    "metadata": {
      "seed": true,
      "source": "web_research",
      "confidence": "verified_public_directory",
      "web_sources": ["https://data.afro.co.ke/schools/turuturu/", "https://shulezote.co.ke/school/turuturu-pri-2/"],
      "search_terms": ["turuturu primary", "turuturu pri", "school code 21202", "kigumo", "muranga", "githima primary", "kahariro primary", "latitude", "longitude"]
    }
  },
  {
    "category": "schools",
    "bot_scope": "both",
    "title": "Turuturu Secondary School verified public details",
    "content": "Public school directories identify Turuturu Secondary School as a public mixed day secondary school in Kigumo Subcounty or Kigumo Constituency, Murang'a County, Kenya. Published listings include KNEC code 10227106 and describe it as a sub-county day school. Older public directory data lists school code C2070397, address Box 240 Sabasaba, and nearby Turuturu Primary.",
    "metadata": {
      "seed": true,
      "source": "web_research",
      "confidence": "verified_public_directory",
      "web_sources": ["https://newsblaze.co.ke/turuturu-secondary-schools-cbe-subjects-pathways-contacts-location-full-details/", "https://shulezote.co.ke/school/turuturu-sec/", "https://www.businesslist.co.ke/company/139024/turuturu-secondary-school"],
      "search_terms": ["turuturu secondary", "turuturu sec", "knec 10227106", "C2070397", "sabasaba", "mixed day secondary", "kigumo subcounty"]
    }
  },
  {
    "category": "cohorts",
    "bot_scope": "both",
    "title": "Turuturu Primary cohort grouping",
    "content": "Community-submitted guidance says Turuturu Primary School started in 1977 and Turuturu Stars identifies people by cohorts. A cohort is grouped in 4-year gaps based on the year someone graduated from the school or left Class 8. When a user asks for their cohort, ask for the year they finished or left Class 8, then explain that officials can confirm the exact cohort mapping.",
    "metadata": {
      "seed": true,
      "source": "community_owner_prompt",
      "confidence": "community_submitted_needs_verification",
      "search_terms": ["cohort", "cohorts", "class 8", "graduated", "left class 8", "1977", "turuturu primary"]
    }
  },
  {
    "category": "community",
    "bot_scope": "both",
    "title": "Community names and stories needing verification",
    "content": "The community has mentioned local names and memories to verify, including Bishop Kinyua, the owner of Duka Moja, Mwalimu Mwaura nicknamed Bubu by children, Waflora, Chief Wakimani, Sub-chief Kimani, and young leader Peter Muraya Ndung'u. The assistant should not present personal stories about living people as official facts until officials approve them. Instead, ask contributors for the person's full name, area, role, story, source, and permission to preserve the memory.",
    "metadata": {
      "seed": true,
      "source": "community_owner_prompt",
      "confidence": "community_submitted_needs_review",
      "search_terms": ["bishop kinyua", "duka moja", "mwalimu mwaura", "bubu", "waflora", "chief wakimani", "sub chief kimani", "peter muraya ndungu", "leaders", "famous people", "stories"]
    }
  },
  {
    "category": "community_collection",
    "bot_scope": "both",
    "title": "How to collect community knowledge",
    "content": "When someone wants to teach the bot about Turuturu Stars, ask short questions: what topic is it, which village or area does it relate to, what should the bot remember, who shared it or where it can be verified, and whether they give permission for officials to use it in the community knowledge base. Save submissions for official review before turning them into public bot answers.",
    "metadata": {
      "seed": true,
      "source": "system_design",
      "confidence": "operational_guidance",
      "search_terms": ["teach bot", "train bot", "add knowledge", "community memory", "submit story", "history", "landmark", "village", "approve"]
    }
  }
]$json$::jsonb)
  loop
    update public.ai_knowledge_base
       set content = entry->>'content',
           metadata = entry->'metadata',
           is_active = true,
           updated_at = now()
     where title = entry->>'title'
       and category = entry->>'category'
       and bot_scope = entry->>'bot_scope';

    if not found then
      insert into public.ai_knowledge_base (category, bot_scope, title, content, metadata, is_active)
      values (
        entry->>'category',
        entry->>'bot_scope',
        entry->>'title',
        entry->>'content',
        entry->'metadata',
        true
      );
    end if;
  end loop;
end $$;
