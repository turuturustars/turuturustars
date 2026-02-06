import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-invite-secret',
};

interface InviteRequest {
  email: string;
  fullName?: string;
  phone?: string;
  idNumber?: string;
  location?: string;
  occupation?: string;
  employmentStatus?: string;
  interests?: string[];
  educationLevel?: string;
  additionalNotes?: string;
  isStudent?: boolean;
  redirectTo?: string;
  resend?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const INVITE_FUNCTION_SECRET = Deno.env.get('INVITE_FUNCTION_SECRET');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!INVITE_FUNCTION_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVITE_FUNCTION_SECRET is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const providedSecret = req.headers.get('x-invite-secret') || '';
    if (providedSecret !== INVITE_FUNCTION_SECRET) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body: InviteRequest = await req.json();
    const {
      email,
      fullName,
      phone,
      idNumber,
      location,
      occupation,
      employmentStatus,
      interests,
      educationLevel,
      additionalNotes,
      isStudent,
      redirectTo,
      resend,
    } = body;

    if (!email) {
      return new Response(JSON.stringify({ success: false, error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const emailRedirectUrl = redirectTo || 'https://turuturustars.co.ke/auth/confirm';

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: emailRedirectUrl,
      data: {
        full_name: fullName || '',
        phone: phone || '',
        id_number: idNumber || '',
        location: location || '',
        occupation: occupation || '',
        employment_status: employmentStatus || '',
        interests: Array.isArray(interests) ? interests : null,
        education_level: educationLevel || '',
        additional_notes: additionalNotes || '',
        is_student: typeof isStudent === 'boolean' ? isStudent : false,
      },
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: resend
          ? 'Invitation email resent. Please check the inbox.'
          : 'Invitation email sent. Please check the inbox.',
        userId: data?.user?.id || null,
        email,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
