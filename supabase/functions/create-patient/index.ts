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

    // Check if user already exists in auth
    const { data: existingUser, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers();
    
    let user;
    let userId;
    let userRecreated = false;
    
    const existingUserRecord = existingUser?.users?.find(u => u.email === email);
    
    // Check if there's an existing patient profile with this email
    const { data: existingPatientProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, full_name')
      .eq('role', 'patient')
      .eq('created_by', therapistId);
    
    // Find profile by matching the full name or email pattern
    const matchingProfile = existingPatientProfile?.find(p => 
      p.full_name.toLowerCase() === fullName.toLowerCase()
    );
    
    if (existingUserRecord) {
      // User exists in auth, use existing user ID
      userId = existingUserRecord.id;
      user = { user: existingUserRecord };
    } else if (matchingProfile) {
      // Trova profilo orfano con lo stesso nome, pulisce e ricrea l'utente
      console.log(`Trovato profilo orfano per ${fullName}, pulizia e ricreazione utente`);
      
      // Delete orphaned profile and related data
      await supabaseAdmin
        .from('exercise_sessions')
        .delete()
        .eq('patient_id', matchingProfile.id);
        
      await supabaseAdmin
        .from('exercises')
        .delete()
        .eq('patient_id', matchingProfile.id);
        
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', matchingProfile.id);
      
      userRecreated = true;
      
      // Create new user
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          password: password
        }
      });

      if (userError) {
        throw userError;
      }
      
      user = newUser;
      userId = newUser.user.id;
    } else {
      // Create completely new user
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          password: password
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

    // Generate password reset link that works properly
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/reset-password`
      }
    });

    if (resetError) {
      console.error('Errore generazione link reset:', resetError);
    }

    // Send welcome email using Supabase invite system
    let emailSent = false;
    let emailError = null;
    
    try {
      // Use the same invite system that works from Supabase dashboard
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/`,
        data: {
          full_name: fullName,
          password: password,
          welcome_message: `Ciao ${fullName}! Le tue credenziali: Email: ${email}, Password: ${password}`
        }
      });

      if (inviteError) {
        console.error('Errore invio email:', inviteError);
        emailError = inviteError.message;
      } else {
        console.log(`Email di benvenuto inviata con successo a ${email}`);
        emailSent = true;
      }
    } catch (emailException) {
      console.error('Errore invio email:', emailException);
      emailError = emailException.message;
    }

    // Prepare response message
    let message = userRecreated 
      ? `Paziente ${fullName} ricreato con successo (dati precedenti eliminati).`
      : `Paziente ${fullName} creato con successo.`;
    let warning = null;
    
    if (emailSent) {
      message += ` Email di benvenuto inviata a ${email} con credenziali di accesso.`;
    } else {
      warning = `ATTENZIONE: Il paziente è stato creato ma l'email non è stata inviata. Errore: ${emailError}. Fornisci manualmente le credenziali al paziente: Email: ${email}, Password: ${password}`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        password: password,
        magic_link: resetData?.properties?.action_link,
        message: message,
        warning: warning,
        emailSent: emailSent,
        emailError: emailError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Errore durante la creazione del paziente:', error);
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