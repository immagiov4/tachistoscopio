import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the current user (therapist) from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get therapist profile
    const { data: therapistProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !therapistProfile || therapistProfile.role !== 'therapist') {
      return new Response(
        JSON.stringify({ error: 'Only therapists can delete patients' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { patientId } = await req.json()

    if (!patientId) {
      return new Response(
        JSON.stringify({ error: 'Patient ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get patient profile to find the user_id
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, created_by')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single()

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: 'Patient not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the therapist owns this patient
    if (patient.created_by !== therapistProfile.id) {
      return new Response(
        JSON.stringify({ error: 'You can only delete your own patients' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Try to delete patient from auth.users first
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(patient.user_id)
    
    let warningMessage = ''
    
    // Check if the error is because user doesn't exist (already deleted)
    if (deleteAuthError) {
      console.error('Errore eliminazione utente dall\'auth:', deleteAuthError)
      
      // Se l'utente non è stato trovato, è già stato eliminato dall'auth - procedi con pulizia database
      if (deleteAuthError.message?.includes('User not found') || deleteAuthError.status === 404) {
        console.log('Utente già eliminato dall\'auth, procedo con pulizia database')
        warningMessage = ' (Utente già eliminato dal sistema di autenticazione)'
      } else {
        // Per altri errori, fallisci comunque
        return new Response(
          JSON.stringify({ error: 'Errore durante l\'eliminazione del paziente dal sistema di autenticazione' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Elimina profilo paziente e dati correlati dal database
    // Questo garantisce la pulizia anche se l'eliminazione dall'auth è fallita per utente non trovato
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', patientId)

    if (deleteProfileError) {
      console.error('Errore eliminazione profilo paziente:', deleteProfileError)
      return new Response(
        JSON.stringify({ error: 'Errore durante l\'eliminazione del profilo paziente dal database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: `Paziente ${patient.full_name} eliminato con successo dal database${warningMessage}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Errore nella funzione delete-patient:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})