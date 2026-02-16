import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse } from "../_shared/http.ts";

type SignInIdentifierKind = "email" | "phone" | "membership_number";

type SignInRequest = {
  identifier?: string;
  password?: string;
  captchaToken?: string;
};

type IdentifierLookup = {
  kind: SignInIdentifierKind;
  normalized: string;
};

type ProfileLookupRow = {
  id: string;
  email: string | null;
  phone: string | null;
  membership_number: string | null;
  id_number: string | null;
};

const INVALID_CREDENTIALS_MESSAGE = "Invalid credentials. Use your email/phone and password.";
const DEFAULT_SITE_URL = "https://turuturustars.co.ke";

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new HttpError(500, "Missing Supabase service credentials");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createAnonClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !anonKey) {
    throw new HttpError(500, "Missing Supabase anon credentials");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseMembershipNumber(value: string): string | null {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact.startsWith("TS")) return null;

  const digits = compact.slice(2).replace(/\D/g, "");
  if (!digits) return null;

  const normalizedDigits = digits.length < 5 ? digits.padStart(5, "0") : digits;
  return `TS-${normalizedDigits}`;
}

function normalizeKenyanPhone(rawPhone: string): string | null {
  const digits = rawPhone.trim().replace(/\D/g, "");
  if (/^0[17][0-9]{8}$/.test(digits)) {
    return `+254${digits.slice(1)}`;
  }
  if (/^254[17][0-9]{8}$/.test(digits)) {
    return `+${digits}`;
  }
  return null;
}

function resolveIdentifier(rawIdentifier: string): IdentifierLookup | null {
  const trimmed = rawIdentifier.trim();
  if (!trimmed) return null;

  const maybeMembership = parseMembershipNumber(trimmed);
  if (maybeMembership) {
    return { kind: "membership_number", normalized: maybeMembership };
  }

  const maybePhone = normalizeKenyanPhone(trimmed);
  if (maybePhone) {
    return { kind: "phone", normalized: maybePhone };
  }

  const normalizedEmail = trimmed.toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(normalizedEmail)) {
    return { kind: "email", normalized: normalizedEmail };
  }

  return null;
}

function normalizeSecret(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}

async function resolveProfile(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  lookup: IdentifierLookup,
): Promise<ProfileLookupRow | null> {
  const query = supabaseAdmin
    .from("profiles")
    .select("id, email, phone, membership_number, id_number")
    .limit(1);

  const { data, error } = lookup.kind === "phone"
    ? await query.eq("phone", lookup.normalized).maybeSingle()
    : lookup.kind === "membership_number"
      ? await query.ilike("membership_number", lookup.normalized).maybeSingle()
      : await query.ilike("email", lookup.normalized).maybeSingle();

  if (error) {
    throw new HttpError(500, "Failed to resolve account profile", error);
  }

  return (data as ProfileLookupRow | null) ?? null;
}

async function tryPasswordSignIn(
  supabaseAnon: ReturnType<typeof createAnonClient>,
  email: string,
  password: string,
  captchaToken: string | undefined,
) {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken,
    },
  });

  if (error || !data.session || !data.user) {
    return null;
  }

  return {
    session: data.session,
    user: data.user,
    usedIdNumberPassword: false,
  };
}

async function tryIdNumberFallbackSignIn(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  supabaseAnon: ReturnType<typeof createAnonClient>,
  profile: ProfileLookupRow | null,
  providedPassword: string,
) {
  if (!profile || !profile.email) return null;

  const expectedIdPassword = normalizeSecret(profile.id_number);
  if (!expectedIdPassword) return null;
  if (normalizeSecret(providedPassword) !== expectedIdPassword) return null;

  const redirectTo = Deno.env.get("SITE_URL")?.trim() || DEFAULT_SITE_URL;
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
    options: { redirectTo },
  });

  if (linkError) {
    throw new HttpError(500, "Unable to process ID-number login", linkError);
  }

  const tokenHash = (linkData as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token;
  if (!tokenHash) {
    throw new HttpError(500, "Unable to process ID-number login");
  }

  const { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (verifyError || !verifyData.session || !verifyData.user) {
    throw new HttpError(400, INVALID_CREDENTIALS_MESSAGE);
  }

  return {
    session: verifyData.session,
    user: verifyData.user,
    usedIdNumberPassword: true,
  };
}

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    let body: SignInRequest;
    try {
      body = await req.json() as SignInRequest;
    } catch {
      throw new HttpError(400, "Invalid JSON payload");
    }

    const identifierRaw = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const captchaToken = typeof body.captchaToken === "string" && body.captchaToken.trim()
      ? body.captchaToken.trim()
      : undefined;

    if (!identifierRaw || !password) {
      throw new HttpError(400, "Identifier and password are required.");
    }

    const lookup = resolveIdentifier(identifierRaw);
    if (!lookup) {
      throw new HttpError(400, "Use a valid email address or Kenyan phone number.");
    }

    const supabaseAdmin = createAdminClient();
    const supabaseAnon = createAnonClient();

    const profile = await resolveProfile(supabaseAdmin, lookup);
    const resolvedEmail = lookup.kind === "email"
      ? lookup.normalized
      : (profile?.email || "").trim().toLowerCase();

    if (!resolvedEmail) {
      throw new HttpError(400, INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordSignIn = await tryPasswordSignIn(supabaseAnon, resolvedEmail, password, captchaToken);
    if (passwordSignIn) {
      return jsonResponse({
        success: true,
        identifierType: lookup.kind,
        usedIdNumberPassword: false,
        user: {
          id: passwordSignIn.user.id,
          email: passwordSignIn.user.email,
        },
        accessToken: passwordSignIn.session.access_token,
        refreshToken: passwordSignIn.session.refresh_token,
      });
    }

    const idFallbackSignIn = await tryIdNumberFallbackSignIn(supabaseAdmin, supabaseAnon, profile, password);
    if (idFallbackSignIn) {
      return jsonResponse({
        success: true,
        identifierType: lookup.kind,
        usedIdNumberPassword: true,
        user: {
          id: idFallbackSignIn.user.id,
          email: idFallbackSignIn.user.email,
        },
        accessToken: idFallbackSignIn.session.access_token,
        refreshToken: idFallbackSignIn.session.refresh_token,
      });
    }

    throw new HttpError(400, INVALID_CREDENTIALS_MESSAGE);
  } catch (error) {
    console.error("auth-signin failed", error instanceof Error ? error.message : error);
    return errorResponse(error);
  }
});
