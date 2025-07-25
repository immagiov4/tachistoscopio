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

    // Send welcome email using Brevo
    let emailSent = false;
    let emailError = null;
    
    try {
      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': Deno.env.get('BREVO_API_KEY') || ''
        },
        body: JSON.stringify({
          sender: {
            name: 'Tachistoscopio',
            email: 'noreply@tachistoscopio.app'
          },
          to: [
            {
              email: email,
              name: fullName
            }
          ],
          subject: 'Benvenuto su Tachistoscopio - Credenziali di accesso',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h1 style="color: #2563eb; margin-bottom: 20px; text-align: center;">
                  🎯 Benvenuto su Tachistoscopio
                </h1>
                
                <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                  Ciao <strong>${fullName}</strong>,
                </p>
                
                <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                  Il tuo terapista ha creato un account per te sulla piattaforma Tachistoscopio. 
                  Questa piattaforma ti aiuterà a migliorare le tue capacità di lettura attraverso esercizi mirati.
                </p>
                
                <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <h3 style="color: #1d4ed8; margin-top: 0;">📋 Le tue credenziali di accesso:</h3>
                  <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background-color: #dbeafe; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${password}</code></p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${magicLinkData?.properties?.action_link || `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/`}" 
                     style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    🚀 Accedi alla Piattaforma
                  </a>
                </div>
                
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #92400e;">
                    <strong>💡 Suggerimento:</strong> Dopo il primo accesso, potrai cambiare la password dalle impostazioni del tuo profilo.
                  </p>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
                  Se hai problemi con l'accesso, contatta il tuo terapista.<br>
                  Buon allenamento! 📚
                </p>
              </div>
            </div>
          `
        })
      });

      if (brevoResponse.ok) {
        emailSent = true;
        console.log(`Welcome email sent successfully to ${email} via Brevo`);
      } else {
        const errorData = await brevoResponse.json();
        emailError = `Brevo error: ${errorData.message || 'Unknown error'}`;
        console.error('Brevo error:', errorData);
      }
    } catch (emailException) {
      console.error('Failed to send email via Brevo:', emailException);
      emailError = emailException.message;
    }

    // Prepare response message
    let message = `Paziente ${fullName} creato con successo.`;
    let warning = null;
    
    if (emailSent) {
      message += ` Email di benvenuto inviata a ${email} con credenziali di accesso.`;
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