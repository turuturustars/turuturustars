 import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers':
     'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
interface SignUpRequest {
  email: string;
  password?: string;
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
   // Handle CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
   
   try {
     const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
     
     if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
       throw new Error('Missing Supabase environment variables');
     }
     
     const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
       auth: {
         autoRefreshToken: false,
         persistSession: false,
       },
     });
     
    const body: SignUpRequest = await req.json();
    const {
      email,
      password,
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
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!resend && !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
     
     // Validate email format
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(email)) {
       return new Response(
         JSON.stringify({ success: false, error: 'Invalid email format' }),
         { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
       );
     }
     
     // Validate password length
    if (!resend && password && password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    const emailRedirectUrl = redirectTo || 'https://turuturustars.co.ke/auth/callback';

    // Helper: find user by email via Admin REST API
    const fetchUserByEmail = async () => {
      const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      if (!usersRes.ok) {
        const text = await usersRes.text();
        console.error('Failed to query users:', usersRes.status, text);
        return null;
      }

      const usersJson = await usersRes.json();
      const foundUser = Array.isArray(usersJson) && usersJson.length > 0 ? usersJson[0] : null;
      return foundUser || null;
    };

    let userId: string | null = null;

    if (!resend) {
      const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: password as string,
        email_confirm: false,
        user_metadata: {
          full_name: fullName || '',
          phone: phone || '',
          id_number: idNumber || '',
          location: location || '',
          occupation: occupation || '',
        },
      });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        if (
          signUpError.message.includes('already registered') ||
          signUpError.message.includes('already exists')
        ) {
          const existingUser = await fetchUserByEmail();
          userId = existingUser?.id || null;
        } else {
          return new Response(
            JSON.stringify({ success: false, error: signUpError.message }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      } else {
        userId = userData.user?.id || null;
      }
    } else {
      const existingUser = await fetchUserByEmail();
      userId = existingUser?.id || null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found or could not be created' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Ensure membership number exists (fast check + fill if missing)
    try {
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=membership_number&id=eq.${userId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
        }
      );

      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const currentMembership = Array.isArray(profileJson) ? profileJson[0]?.membership_number : null;

        if (!currentMembership) {
          const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/generate_membership_number`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });

          if (rpcRes.ok) {
            const newMembershipNumber = await rpcRes.json();
            if (newMembershipNumber) {
              await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  apikey: SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json',
                  Prefer: 'return=minimal',
                },
                body: JSON.stringify({ membership_number: newMembershipNumber }),
              });
            }
          }
        }
      }
    } catch (membershipError) {
      console.error('Membership number check failed (non-blocking):', membershipError);
    }

    // Upsert profile with provided data (non-blocking if already exists)
    try {
      const profilePayload = {
        id: userId,
        email,
        full_name: fullName || null,
        phone: phone || null,
        id_number: idNumber || null,
        location: location || null,
        occupation: occupation || null,
        employment_status: employmentStatus || null,
        interests: Array.isArray(interests) ? interests : null,
        education_level: educationLevel || null,
        additional_notes: additionalNotes || null,
        is_student: typeof isStudent === 'boolean' ? isStudent : null,
        status: 'pending',
        updated_at: new Date().toISOString(),
      };

      const upsertUrl = `${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`;
      const upsertRes = await fetch(upsertUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(profilePayload),
      });

      if (!upsertRes.ok) {
        const upsertText = await upsertRes.text();
        console.error('Failed to upsert profile:', upsertRes.status, upsertText);
      }
    } catch (profileError) {
      console.error('Profile upsert error (non-blocking):', profileError);
    }

    // Send verification email using invite link (sends email automatically)
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: emailRedirectUrl,
    });

    if (inviteError) {
      console.error('Invite error (non-blocking):', inviteError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: resend
          ? 'Verification email resent. Please check your inbox.'
          : 'Account created. Please check your email to verify your account.',
        userId,
        email,
        emailConfirmRequired: true,
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
