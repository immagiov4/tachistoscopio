import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

console.log("Funzione send-custom-email avviata");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("=== RICHIESTA RICEVUTA ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  // Test endpoint
  if (req.method === "GET") {
    console.log("GET request - test endpoint");
    return new Response(JSON.stringify({ 
      status: "ok", 
      message: "Funzione attiva",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle webhook
  if (req.method === "POST") {
    console.log("POST request - webhook ricevuto");
    try {
      const body = await req.text();
      console.log("Body ricevuto, lunghezza:", body.length);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Webhook ricevuto",
        bodyLength: body.length 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      console.error("Errore:", error);
      return new Response(JSON.stringify({ error: "Errore processing webhook" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
};

serve(handler);