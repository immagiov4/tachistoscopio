import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, fullName, therapistId } = await req.json();
    
    // Generate secure password
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    
    const password = generatePassword();

    // Check if user already exists
    const { data: existingUser, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers();
    
    let user;
    let userId;
    
    const existingUserRecord = existingUser?.users?.find(u => u.email === email);
    
    if (existingUserRecord) {
      // User already exists, use existing user ID
      userId = existingUserRecord.id;
      user = { user: existingUserRecord };
    } else {
      // Create new user with email confirmation enabled
      // This will trigger Supabase's built-in email system
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // Set to false so we can send custom email
        user_metadata: {
          full_name: fullName,
          password: password // Include password in metadata for custom email
        }
      });

      if (userError) {
        throw userError;
      }
      
      user = newUser;
      userId = newUser.user.id;
    }

    // Create patient profile (delete existing profile if needed)
    // First, delete any existing profile (in case trigger created one)
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    // Now create the correct patient profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        role: 'patient',
        full_name: fullName,
        created_by: therapistId,
      });

    if (profileError) {
      throw profileError;
    }

    // Generate magic link for immediate login
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/`
      }
    });

    if (magicLinkError) {
      console.error('Error generating magic link:', magicLinkError);
    }

    // Send password reset email using the same method as AuthPage
    try {
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/reset-password`,
      });

      if (resetError) {
        console.error('Error sending email:', resetError);
      } else {
        console.log(`Password reset email sent successfully to ${email}`);
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        password: password,
        magic_link: magicLinkData?.properties?.action_link,
        message: `Paziente ${fullName} creato con successo. Email inviata a ${email} con credenziali di accesso.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});