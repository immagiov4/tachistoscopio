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
    // Use service role to bypass RLS
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

    console.log('🧹 Starting database cleanup with admin privileges...');

    // Delete in correct order to avoid foreign key constraints
    
    // 1. Delete all exercise sessions
    const { error: sessionsError, count: sessionsCount } = await supabaseAdmin
      .from('exercise_sessions')
      .delete({ count: 'exact' })
      .gte('completed_at', '1900-01-01');
    
    console.log(`📊 Exercise sessions: ${sessionsCount} deleted`, sessionsError || '✅');

    // 2. Delete all exercises
    const { error: exercisesError, count: exercisesCount } = await supabaseAdmin
      .from('exercises')
      .delete({ count: 'exact' })
      .gte('created_at', '1900-01-01');
    
    console.log(`🏃 Exercises: ${exercisesCount} deleted`, exercisesError || '✅');

    // 3. Delete all word lists
    const { error: wordListsError, count: wordListsCount } = await supabaseAdmin
      .from('word_lists')
      .delete({ count: 'exact' })
      .gte('created_at', '1900-01-01');
    
    console.log(`📝 Word lists: ${wordListsCount} deleted`, wordListsError || '✅');

    // 4. Delete all patient profiles
    const { error: patientsError, count: patientsCount } = await supabaseAdmin
      .from('profiles')
      .delete({ count: 'exact' })
      .eq('role', 'patient');
    
    console.log(`👥 Patients: ${patientsCount} deleted`, patientsError || '✅');

    const summary = {
      success: true,
      deletedCounts: {
        sessions: sessionsCount || 0,
        exercises: exercisesCount || 0,
        wordLists: wordListsCount || 0,
        patients: patientsCount || 0
      },
      errors: {
        sessions: sessionsError?.message || null,
        exercises: exercisesError?.message || null,
        wordLists: wordListsError?.message || null,
        patients: patientsError?.message || null
      }
    };

    console.log('🎯 Database cleanup completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});