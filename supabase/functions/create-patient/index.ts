import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  sanitizeInput, 
  generateSecurePassword, 
  checkRateLimit, 
  sanitizeErrorMessage,
  validateEmail,
  findOrphanedProfile,
  cleanOrphanedData
} from "./securityHelpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const createUserAuth = async (supabaseAdmin: any, email: string, password: string, fullName: string) => {
  return await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: fullName }
  });
};

const deleteOrphanedProfileData = async (supabaseAdmin: any, profileId: string) => {
  await supabaseAdmin.from('exercise_sessions').delete().eq('patient_id', profileId);
  await supabaseAdmin.from('exercises').delete().eq('patient_id', profileId);
  await supabaseAdmin.from('profiles').delete().eq('id', profileId);
};

const createStudentProfile = async (supabaseAdmin: any, userId: string, fullName: string, therapistId: string) => {
  // Delete any existing profile first
  await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
  
  return await supabaseAdmin.from('profiles').insert({
    user_id: userId,
    role: 'student',
    full_name: fullName,
    created_by: therapistId,
  });
};

const sendWelcomeEmail = async (supabaseAdmin: any, email: string, fullName: string, password: string) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/`,
      data: {
        full_name: fullName,
        welcome_message: `Ciao ${fullName}! Le tue credenziali: Email: ${email}, Password: ${password}`
      }
    });

    if (error) {
      console.error('Errore invio email:', error);
      return { success: false, error: sanitizeErrorMessage(error) };
    }

    console.log(`Email di benvenuto inviata con successo a ${email}`);
    return { success: true, error: null };
  } catch (emailException) {
    console.error('Errore invio email:', emailException);
    return { success: false, error: sanitizeErrorMessage(emailException) };
  }
};

const handleUserCreation = async (
  supabaseAdmin: any,
  sanitizedEmail: string,
  sanitizedFullName: string,
  password: string,
  therapistId: string
) => {
  const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
  const existingUserRecord = existingUser?.users?.find((u: any) => u.email === sanitizedEmail);
  
  if (existingUserRecord) {
    return { userId: existingUserRecord.id, userRecreated: false };
  }
  
  const matchingProfile = await findOrphanedProfile(supabaseAdmin, sanitizedFullName, therapistId);
  
  if (matchingProfile) {
    console.log(`Trovato profilo orfano per ${sanitizedFullName}, pulizia e ricreazione utente`);
    await cleanOrphanedData(supabaseAdmin, matchingProfile.id);
    
    const { data: newUser, error } = await createUserAuth(
      supabaseAdmin,
      sanitizedEmail,
      password,
      sanitizedFullName
    );
    
    if (error) throw new Error(sanitizeErrorMessage(error));
    return { userId: newUser.user.id, userRecreated: true };
  }
  
  const { data: newUser, error } = await createUserAuth(
    supabaseAdmin,
    sanitizedEmail,
    password,
    sanitizedFullName
  );
  
  if (error) throw new Error(sanitizeErrorMessage(error));
  return { userId: newUser.user.id, userRecreated: false };
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
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const { email, fullName, therapistId } = await req.json();
    
    if (!email || !fullName || !therapistId) {
      throw new Error('Parametri mancanti');
    }
    
    const sanitizedEmail = sanitizeInput(email, 254);
    const sanitizedFullName = sanitizeInput(fullName, 100);
    
    if (!validateEmail(sanitizedEmail)) {
      throw new Error('Formato email non valido');
    }
    
    if (!checkRateLimit(therapistId)) {
      throw new Error('Troppi tentativi di creazione studenti. Riprova tra qualche minuto.');
    }
    
    const password = generateSecurePassword();
    const { userId, userRecreated } = await handleUserCreation(
      supabaseAdmin,
      sanitizedEmail,
      sanitizedFullName,
      password,
      therapistId
    );

    await createStudentProfile(supabaseAdmin, userId, sanitizedFullName, therapistId);

    const { data: resetData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: sanitizedEmail,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/reset-password`
      }
    });

    const emailResult = await sendWelcomeEmail(supabaseAdmin, sanitizedEmail, sanitizedFullName, password);

    console.log(`SECURITY_LOG: Student created - Coach: ${therapistId}, Student: ${sanitizedEmail}, Timestamp: ${new Date().toISOString()}`);

    let message = userRecreated 
      ? `Studente ${sanitizedFullName} ricreato con successo (dati precedenti eliminati).`
      : `Studente ${sanitizedFullName} creato con successo.`;
    
    if (emailResult.success) {
      message += ` Email di benvenuto inviata a ${sanitizedEmail} con credenziali di accesso.`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        password,
        magic_link: resetData?.properties?.action_link,
        message,
        warning: !emailResult.success ? `ATTENZIONE: Lo studente è stato creato ma l'email non è stata inviata. Fornisci manualmente le credenziali allo studente.` : null,
        emailSent: emailResult.success,
        emailError: emailResult.error
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SECURITY_LOG: Student creation failed:', error.message);
    return new Response(
      JSON.stringify({ 
        error: sanitizeErrorMessage(error),
        details: 'Contatta l\'amministratore se il problema persiste'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});