import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
}

interface WebhookPayload {
  user: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  email_data: EmailData;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { user, email_data } = payload;

    let subject = "";
    let htmlContent = "";
    const userName = user.user_metadata?.full_name || user.email.split('@')[0];

    if (email_data.email_action_type === "recovery") {
      subject = "Tachistoscopio - Reimposta la tua password";
      
      const resetUrl = `${email_data.site_url}/reset-password?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reimposta Password - Tachistoscopio</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Tachistoscopio</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Piattaforma per esercizi di lettura rapida</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Ciao ${userName}!</h2>
            <p style="font-size: 16px; margin-bottom: 25px;">
              Hai richiesto di reimpostare la password per il tuo account Tachistoscopio.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;">
                Reimposta Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Se non riesci a cliccare il pulsante, copia e incolla questo link nel tuo browser:
            </p>
            <p style="font-size: 12px; word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>⚠️ Importante:</strong> Questo link è valido per 60 minuti. Se non hai richiesto tu questa reimpostazione, ignora questa email.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; border-top: 1px solid #e9ecef; margin-top: 30px;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              Questa email è stata inviata automaticamente da <strong>Tachistoscopio</strong><br>
              Per qualsiasi problema, contatta il supporto.
            </p>
          </div>
        </body>
        </html>
      `;
    } else if (email_data.email_action_type === "signup") {
      subject = "Benvenuto in Tachistoscopio - Conferma il tuo account";
      
      const confirmUrl = `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Benvenuto - Tachistoscopio</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Benvenuto in Tachistoscopio!</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">La tua piattaforma per esercizi di lettura rapida</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Ciao ${userName}!</h2>
            <p style="font-size: 16px; margin-bottom: 25px;">
              Grazie per esserti registrato a Tachistoscopio. Per completare la registrazione, conferma il tuo indirizzo email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;">
                Conferma Email
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; border-top: 1px solid #e9ecef; margin-top: 30px;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              Questa email è stata inviata automaticamente da <strong>Tachistoscopio</strong>
            </p>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Tachistoscopio <noreply@resend.dev>",
      to: [user.email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-custom-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);