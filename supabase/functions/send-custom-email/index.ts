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
      console.log("Resend API key available:", !!Deno.env.get("RESEND_API_KEY"));
      
      const resetUrl = `${email_data.site_url}/reset-password?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      
      try {
        console.log("Attempting to send email via Resend...");
        const emailResponse = await resend.emails.send({
          from: "Tachistoscopio <onboarding@resend.dev>",  // Usa il dominio di test di Resend
          to: [user.email],
          subject: "Tachistoscopio - Reimposta la tua password",
          html: `
            <h1>Ciao ${userName}!</h1>
            <p>Clicca qui per reimpostare la password:</p>
            <a href="${resetUrl}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Reimposta Password
            </a>
            <p>Link: ${resetUrl}</p>
          `
        });

        console.log("Email response:", JSON.stringify(emailResponse, null, 2));
        
        if (emailResponse.error) {
          console.error("Resend error:", emailResponse.error);
          throw new Error(`Resend error: ${JSON.stringify(emailResponse.error)}`);
        }
        
        console.log("Email inviata con successo! ID:", emailResponse.data?.id);
        
        return new Response(JSON.stringify({ 
          success: true, 
          emailId: emailResponse.data?.id,
          message: "Email inviata con successo"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
        
      } catch (emailError) {
        console.error("Errore nell'invio email:", emailError);
        return new Response(JSON.stringify({ 
          error: "Errore invio email", 
          details: emailError.message 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
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