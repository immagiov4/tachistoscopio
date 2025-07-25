import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

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
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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
      // Create new user
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
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

    // Generate magic link for login
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL').replace('supabase.co', 'supabase.app')}/`
      }
    });

    // Send welcome email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">Benvenuto nel Sistema Tachistoscopio</h1>
        
        <p>Gentile genitore/tutore,</p>
        
        <p>È stato creato un account per il paziente <strong>${fullName}</strong> nel nostro sistema di esercizi tachistoscopici.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Accesso Rapido (Consigliato)</h3>
          <p>Per accedere immediatamente senza inserire password, clicca su questo link:</p>
          <a href="${magicLinkData?.properties?.action_link || '#'}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">
            Accedi Subito
          </a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0;">Credenziali di Accesso (se necessario)</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password temporanea:</strong> <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 3px;">${password}</code></p>
          <p><small>Queste credenziali possono essere utilizzate per accedere manualmente al sistema se il link magico non funziona.</small></p>
        </div>
        
        <h3>Come utilizzare il sistema:</h3>
        <ol>
          <li>Accedi utilizzando il link magico o le credenziali fornite</li>
          <li>Il paziente troverà gli esercizi assegnati dal terapeuta</li>
          <li>Segui le istruzioni per completare gli esercizi</li>
          <li>I progressi vengono tracciati automaticamente</li>
        </ol>
        
        <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #bee5eb;">
          <p><strong>Supporto:</strong> Per qualsiasi domanda o problema tecnico, contatta il terapeuta che ha creato questo account.</p>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
          Questo messaggio è stato generato automaticamente dal Sistema Tachistoscopio.<br>
          Non rispondere a questa email.
        </p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'Sistema Tachistoscopio <onboarding@resend.dev>',
        to: [email],
        subject: `Account creato per ${fullName} - Sistema Tachistoscopio`,
        html: emailHtml,
      });
      console.log(`Email sent successfully to ${email}`);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({ success: true, password: password }),
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