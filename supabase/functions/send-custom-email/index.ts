import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Handle webhook - senza signature verification per ora
    if (req.method === "POST") {
      console.log("POST webhook ricevuto");
      
      const body = await req.text();
      console.log("Body length:", body.length);
      
      // Parse del payload
      const payload = JSON.parse(body);
      console.log("Email action type:", payload.email_data?.email_action_type);
      console.log("User email:", payload.user?.email);
      
      // Per ora restituiamo sempre successo senza inviare email
      console.log("Webhook processato con successo (senza invio email)");
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Webhook ricevuto correttamente" 
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