-- Enrich WhatsApp assistant knowledge with practical support answers and search terms.
do $$
declare
  entry jsonb;
begin
  for entry in
    select value
    from jsonb_array_elements($json$
[
  {
    "category": "commands",
    "bot_scope": "both",
    "title": "WhatsApp command guide",
    "content": "The assistant supports MENU or HELP for options, START to opt in, STOP to opt out, ANNOUNCEMENTS for notices, and CONTACT or SUPPORT for official help. Registered members can also use PAY, CONTRIBUTE 500, BALANCE, WALLET, FUND 500, WELFARE, KITTY, MEETING, PROFILE, RECEIPTS, and NOTIFICATIONS. If a user writes naturally, guide them to the safest exact command.",
    "search_terms": ["menu", "help", "commands", "options", "msaada", "nisaidie", "what can you do", "habari", "hello"]
  },
  {
    "category": "language",
    "bot_scope": "both",
    "title": "English Swahili and typo handling",
    "content": "Users may write in English, Swahili, Sheng, abbreviations, or with typing mistakes. Interpret common phrases such as michango yangu as BALANCE, salio as BALANCE or WALLET depending on context, malipo or nimelipa as RECEIPTS, matangazo as ANNOUNCEMENTS, mkutano as MEETING, wasifu or taarifa zangu as PROFILE, msaada as SUPPORT, and lipa as PAY. Reply in the same language where possible.",
    "search_terms": ["swahili", "sheng", "michango", "salio", "malipo", "nimelipa", "matangazo", "mkutano", "wasifu", "msaada", "lipa"]
  },
  {
    "category": "payments",
    "bot_scope": "member",
    "title": "Contribution payment help",
    "content": "For pending contributions, tell members to reply PAY to receive an M-Pesa STK push. For a specific amount, tell them to reply CONTRIBUTE 500, replacing 500 with the amount. The member should enter the PIN only in the M-Pesa prompt, never in WhatsApp. After a successful payment, the system records the receipt and updates the member record.",
    "search_terms": ["pay", "payment", "contribute", "contribution", "michango", "lipa", "stk", "mpesa", "m-pesa", "arrears", "due"]
  },
  {
    "category": "wallet",
    "bot_scope": "member",
    "title": "Member wallet help",
    "content": "Members can reply WALLET to see wallet balance and recent wallet top-ups. They can reply FUND 500 to receive an M-Pesa STK push for a wallet top-up. Wallet top-ups are separate from contribution payments until officials or the system applies them according to the club rules.",
    "search_terms": ["wallet", "fund", "top up", "topup", "deposit", "salio", "akiba", "ledger"]
  },
  {
    "category": "receipts",
    "bot_scope": "member",
    "title": "Receipts and payment history",
    "content": "Members can reply RECEIPTS to see recent confirmed contribution payments. If a payment is missing, ask them to wait a few minutes after M-Pesa confirmation and then check again. If it still does not appear, they should contact the treasurer with the M-Pesa confirmation code.",
    "search_terms": ["receipt", "receipts", "history", "paid", "payment history", "risiti", "stakabadhi", "nimelipa", "malipo"]
  },
  {
    "category": "membership",
    "bot_scope": "both",
    "title": "Membership and registration",
    "content": "Public users can reply JOIN to learn how to become a member. During registration, mandatory profile fields must be completed, while optional profile fields can be skipped and completed later. A user should use the WhatsApp number saved on their member profile to unlock member-only services.",
    "search_terms": ["join", "register", "registration", "membership", "jiunga", "sajili", "usajili", "mwanachama", "skip"]
  },
  {
    "category": "profile",
    "bot_scope": "member",
    "title": "Profile status and profile changes",
    "content": "Members can reply PROFILE to see their current member status. For profile changes, collect only the needed correction and direct sensitive or official changes to an official review. The assistant must not claim a profile was updated unless the profile update flow confirms it.",
    "search_terms": ["profile", "status", "account", "wasifu", "akaunti", "taarifa zangu", "change my details", "update phone"]
  },
  {
    "category": "meetings",
    "bot_scope": "member",
    "title": "Meetings and audience rules",
    "content": "Members can reply MEETING to see the next scheduled meeting. Meeting messages may be for all members or only official members, depending on the meeting audience. Do not disclose official-only meeting details to public users or unauthorised members; ask them to contact an official if they believe they should have access.",
    "search_terms": ["meeting", "meetings", "mkutano", "mikutano", "agenda", "venue", "official members", "all members"]
  },
  {
    "category": "announcements",
    "bot_scope": "both",
    "title": "Announcements and notices",
    "content": "Users can reply ANNOUNCEMENTS to see latest published notices available to their audience. Understand common misspellings such as anoucements, annoucements, and anoucments. For audience-limited notices, show only what the user is allowed to see.",
    "search_terms": ["announcement", "announcements", "anoucements", "annoucements", "notice", "news", "matangazo", "tangazo"]
  },
  {
    "category": "welfare",
    "bot_scope": "member",
    "title": "Welfare and kitty cases",
    "content": "Members can reply WELFARE or KITTY to see active welfare cases, targets, and collected amounts when available. If a user asks to create or approve a welfare case, explain that officials must use the official workflow; the assistant should not create a case unless a deterministic official action flow handles it.",
    "search_terms": ["welfare", "kitty", "kity", "case", "dhiki", "msiba", "ustawi", "fundraiser", "target"]
  },
  {
    "category": "notifications",
    "bot_scope": "member",
    "title": "Notifications and reminders",
    "content": "Members can reply NOTIFICATIONS to see unread alerts. WhatsApp notifications may include successful payment confirmations, new welfare cases, announcements, meeting notices, voting notices, and membership fee reminders. Reminder messages must respect member preferences and audience rules.",
    "search_terms": ["notification", "notifications", "alert", "alerts", "reminder", "remind me", "taarifa", "notisi", "membership fee", "expiry"]
  },
  {
    "category": "voting",
    "bot_scope": "member",
    "title": "Voting notifications and safety",
    "content": "WhatsApp may notify members about voting, deadlines, eligibility, and results when authorised. The assistant must not cast a vote or change a vote in free text. If voting is available, direct the member to the official voting link or deterministic voting flow and remind them to follow the official instructions.",
    "search_terms": ["vote", "voting", "poll", "election", "kura", "piga kura", "ballot", "deadline"]
  },
  {
    "category": "security",
    "bot_scope": "both",
    "title": "WhatsApp safety and privacy",
    "content": "Never ask members to send their M-Pesa PIN, account password, OTP, full ID number, or card details in WhatsApp. For sensitive account changes, official approvals, or private disputes, direct the user to official support. Keep replies short and do not expose internal system details.",
    "search_terms": ["pin", "otp", "password", "privacy", "security", "fraud", "scam", "private", "sensitive"]
  },
  {
    "category": "troubleshooting",
    "bot_scope": "both",
    "title": "When WhatsApp does not understand",
    "content": "If the assistant does not understand, the user can reply MENU to see options. Members should use their registered WhatsApp number for member-only services. If a valid command fails repeatedly, ask the user to try again shortly and contact support with the message they sent.",
    "search_terms": ["not working", "stopped", "does not respond", "understand", "error", "fail", "failed", "menu"]
  }
]$json$::jsonb)
  loop
    update public.ai_knowledge_base
       set content = entry->>'content',
           metadata = jsonb_build_object('seed', true, 'source', 'whatsapp_ai_knowledge_enhancement', 'search_terms', entry->'search_terms'),
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
        jsonb_build_object('seed', true, 'source', 'whatsapp_ai_knowledge_enhancement', 'search_terms', entry->'search_terms'),
        true
      );
    end if;
  end loop;
end $$;
