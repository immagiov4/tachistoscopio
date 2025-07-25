import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("=== FUNZIONE CHIAMATA ===");
  console.log("Method:", req.method);
  
  try {
    // Test endpoint
    if (req.method === "GET") {
      console.log("GET request");
      
      // Test Resend se c'è il parametro test=email
      const url = new URL(req.url);
      if (url.searchParams.get('test') === 'email') {
        console.log("Test invio email...");
        try {
          const emailResponse = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'giovbran03@gmail.com',  // Il tuo indirizzo registrato
            subject: 'Test Tachistoscopio',
            html: '<h1>Test email funziona!</h1><p>Se ricevi questa email, Resend è configurato correttamente.</p>'
          });
          
          console.log("Test email inviata:", emailResponse);
          
          return new Response(JSON.stringify({ 
            status: "ok", 
            message: "Test email inviata",
            emailResponse: emailResponse
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          console.error("Errore test email:", error);
          return new Response(JSON.stringify({ 
            status: "error", 
            message: "Errore nell'invio test email",
            error: error.message
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        status: "ok", 
        message: "Funzione attiva" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Handle CORS
    if (req.method === "OPTIONS") {
      console.log("OPTIONS request");
      return new Response(null, { headers: corsHeaders });
    }

    // Handle webhook
    if (req.method === "POST") {
      console.log("POST webhook ricevuto");
      
      const body = await req.text();
      console.log("Body length:", body.length);
      
      // Parse del payload
      const payload = JSON.parse(body);
      console.log("Email action type:", payload.email_data?.email_action_type);
      console.log("User email:", payload.user?.email);
      
      // Invia email solo per recovery
      if (payload.email_data?.email_action_type === "recovery") {
        const user = payload.user;
        const email_data = payload.email_data;
        const userName = user.user_metadata?.full_name || user.email.split('@')[0];
        
        const resetUrl = `${email_data.site_url}/reset-password?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
        
        console.log("Invio email di recovery a:", user.email);
        
        const emailResponse = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: user.email,
          subject: 'Tachistoscopio - Reimposta la tua password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24px;">Tachistoscopio</h1>
                <p style="margin: 10px 0 0 0;">Reimposta la tua password</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">Ciao ${userName}!</h2>
                <p style="font-size: 16px;">Hai richiesto di reimpostare la password per il tuo account Tachistoscopio.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background: #667eea; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Reimposta Password
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                  Se non riesci a cliccare il pulsante, copia questo link nel browser:
                </p>
                <p style="font-size: 12px; word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">
                  ${resetUrl}
                </p>
                
                <p style="font-size: 12px; color: #999; margin-top: 20px;">
                  Questo link è valido per 60 minuti. Se non hai richiesto questa reimpostazione, ignora questa email.
                </p>
              </div>
            </div>
          `
        });
        
        console.log("Email inviata:", emailResponse);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Webhook processato con successo" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error("ERRORE nella funzione:", error);
    return new Response(JSON.stringify({ 
      error: "Errore interno", 
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);