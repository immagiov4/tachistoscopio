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

    // Get the current user (coach) from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get coach profile
    const { data: coachProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !coachProfile || coachProfile.role !== 'coach') {
      return new Response(
        JSON.stringify({ error: 'Solo i coach possono eliminare studenti' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { patientId } = await req.json()

    if (!patientId) {
      return new Response(
        JSON.stringify({ error: 'Student ID è richiesto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get student profile to find the user_id
    const { data: student, error: studentError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, created_by')
      .eq('id', patientId)
      .eq('role', 'student')
      .single()

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ error: 'Studente non trovato' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the coach owns this student
    if (student.created_by !== coachProfile.id) {
      return new Response(
        JSON.stringify({ error: 'Puoi eliminare solo i tuoi studenti' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Try to delete student from auth.users first
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(student.user_id)
    
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
          JSON.stringify({ error: 'Errore durante l\'eliminazione dello studente dal sistema di autenticazione' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Delete exercises with CASCADE handled by foreign keys
    const { error: deleteExercisesError } = await supabaseAdmin
      .from('exercises')
      .delete()
      .eq('student_id', patientId)

    if (deleteExercisesError) {
      console.error('Errore eliminazione esercizi studente:', deleteExercisesError)
      return new Response(
        JSON.stringify({ error: 'Errore durante l\'eliminazione degli esercizi dello studente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete exercise sessions with CASCADE handled by foreign keys
    const { error: deleteSessionsError } = await supabaseAdmin
      .from('exercise_sessions')
      .delete()
      .eq('student_id', patientId)

    if (deleteSessionsError) {
      console.error('Errore eliminazione sessioni studente:', deleteSessionsError)
      return new Response(
        JSON.stringify({ error: 'Errore durante l\'eliminazione delle sessioni dello studente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete student profile from database
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', patientId)

    if (deleteProfileError) {
      console.error('Errore eliminazione profilo studente:', deleteProfileError)
      return new Response(
        JSON.stringify({ error: 'Errore durante l\'eliminazione del profilo studente dal database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: `Studente ${student.full_name} eliminato con successo dal database${warningMessage}` 
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