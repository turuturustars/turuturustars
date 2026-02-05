 import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers':
     'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 interface SignUpRequest {
   email: string;
   password: string;
   fullName?: string;
   phone?: string;
   redirectTo?: string;
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
     const { email, password, fullName, phone, redirectTo } = body;
     
     if (!email || !password) {
       return new Response(
         JSON.stringify({ success: false, error: 'Email and password are required' }),
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
     if (password.length < 6) {
       return new Response(
         JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
         { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
       );
     }
     
     // Create user with admin API (sends verification email automatically)
     const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
       email,
       password,
       email_confirm: false, // Require email confirmation
       user_metadata: {
         full_name: fullName || '',
         phone: phone || '',
       },
     });
     
     if (signUpError) {
       console.error('Sign up error:', signUpError);
       
       // Check if user already exists
       if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
         return new Response(
           JSON.stringify({ success: false, error: 'An account with this email already exists. Please sign in.' }),
           { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
         );
       }
       
       return new Response(
         JSON.stringify({ success: false, error: signUpError.message }),
         { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
       );
     }
     
     if (!userData.user) {
       return new Response(
         JSON.stringify({ success: false, error: 'Failed to create user' }),
         { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
       );
     }
     
     // Send verification email using invite link (sends email automatically)
     const emailRedirectUrl = redirectTo || 'https://turuturustars.co.ke/auth/callback';
     
     const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
       redirectTo: emailRedirectUrl,
     });
     
     if (inviteError) {
       console.error('Invite error (non-blocking):', inviteError);
       // User was created, invite may fail if already exists - that's okay
     }
     
     console.log('User created successfully:', userData.user.id);
     
     return new Response(
       JSON.stringify({
         success: true,
         message: 'Account created. Please check your email to verify your account.',
         userId: userData.user.id,
         email: userData.user.email,
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