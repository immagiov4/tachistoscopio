import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Funzione per verificare la signature del webhook
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    console.log("Verifying signature...");
    console.log("Secret format:", secret.substring(0, 10) + "...");
    
    // Supabase usa il formato v1,secret - estraiamo solo il secret
    const actualSecret = secret.startsWith('v1,') ? secret.substring(3) : secret;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(actualSecret);
    const messageData = encoder.encode(payload);
    
    // Per ora accettiamo sempre - implementeremo HMAC dopo
    console.log("Signature verification skipped for debugging");
    return true;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== WEBHOOK RICEVUTO ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  
  // Test endpoint
  if (req.method === "GET") {
    console.log("GET request - test endpoint");
    return new Response(JSON.stringify({ 
      status: "ok", 
      message: "Funzione attiva",
      timestamp: new Date().toISOString(),
      secrets: {
        resend: !!Deno.env.get("RESEND_API_KEY"),
        webhook: !!Deno.env.get("SEND_EMAIL_HOOK_SECRET")
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    console.log("Body length:", body.length);
    console.log("Body preview:", body.substring(0, 200));
    
    // Verifica signature
    const signature = req.headers.get("webhook-signature") || "";
    const webhookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "";
    
    console.log("Signature header:", signature);
    console.log("Has secret:", !!webhookSecret);
    
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.log("Signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    const payload: WebhookPayload = JSON.parse(body);
    console.log("Payload keys:", Object.keys(payload));
    console.log("Email action type:", payload.email_data?.email_action_type);
    
    const { user, email_data } = payload;
    const userName = user.user_metadata?.full_name || user.email.split('@')[0];

    if (email_data.email_action_type === "recovery") {
      console.log("Sending recovery email to:", user.email);
      
      const resetUrl = `${email_data.site_url}/reset-password?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      
      const emailResponse = await resend.emails.send({
        from: "Tachistoscopio <onboarding@resend.dev>",
        to: [user.email],
        subject: "Tachistoscopio - Reimposta la tua password",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Reimposta Password</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px;">
              <h1>Tachistoscopio</h1>
              <p>Reimposta la tua password</p>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa; margin: 20px 0; border-radius: 8px;">
              <h2>Ciao ${userName}!</h2>
              <p>Hai richiesto di reimpostare la password per il tuo account Tachistoscopio.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: #667eea; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Reimposta Password
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                Se non riesci a cliccare il pulsante, copia questo link: ${resetUrl}
              </p>
              
              <p style="font-size: 12px; color: #999;">
                Questo link è valido per 60 minuti. Se non hai richiesto questa reimpostazione, ignora questa email.
              </p>
            </div>
          </body>
          </html>
        `
      });

      console.log("Email inviata:", emailResponse);
      
      return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Webhook ricevuto ma non processato" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Errore:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);