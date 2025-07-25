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

    // Send welcome email using admin generateLink
    let emailSent = false;
    let emailError = null;
    
    try {
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          redirectTo: `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/`,
          data: {
            full_name: fullName,
            password: password,
            welcome_message: `Benvenuto ${fullName}! Usa la password: ${password}`
          }
        }
      });

      if (inviteError) {
        console.error('Error sending email:', inviteError);
        emailError = inviteError.message;
      } else {
        console.log(`Welcome email sent successfully to ${email}`);
        emailSent = true;
      }
    } catch (emailException) {
      console.error('Failed to send email:', emailException);
      emailError = emailException.message;
    }

    // Prepare response message
    let message = `Paziente ${fullName} creato con successo.`;
    let warning = null;
    
    if (emailSent) {
      message += ` Email inviata a ${email} con credenziali di accesso.`;
    } else {
      warning = `ATTENZIONE: Il paziente è stato creato ma l'email non è stata inviata. Errore: ${emailError}. Fornisci manualmente le credenziali al paziente.`;
      message += ` IMPORTANTE: Fornisci al paziente la password: ${password}`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        password: password,
        magic_link: magicLinkData?.properties?.action_link,
        message: message,
        warning: warning,
        emailSent: emailSent,
        emailError: emailError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating patient:', error);
    return new Response(
      JSON.stringify({ 
        error: `Errore durante la creazione del paziente: ${error.message}`,
        details: error.message
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});