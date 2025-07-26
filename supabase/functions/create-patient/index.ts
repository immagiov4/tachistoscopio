import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 patient creations per 5 minutes per therapist

// Security utilities
const sanitizeInput = (input: string, maxLength: number = 255): string => {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, maxLength);
};

const generateSecurePassword = (): string => {
  // Use crypto.getRandomValues for cryptographically secure random generation
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(array[i] % chars.length);
  }
  
  // Ensure password meets complexity requirements
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasUpper || !hasLower || !hasNumber) {
    // Add required characters to ensure complexity
    const complexChars = 'Aa1';
    password = password.substring(0, 9) + complexChars;
  }
  
  return password;
};

const checkRateLimit = (therapistId: string): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(therapistId);
  
  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(therapistId, { count: 1, lastReset: now });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  entry.count++;
  return true;
};

const sanitizeErrorMessage = (error: any): string => {
  // Sanitize error messages to prevent information disclosure
  const message = error?.message || 'Unknown error';
  
  // Remove sensitive information patterns
  const sanitized = message
    .replace(/user with email .* already exists/i, 'Email già registrata')
    .replace(/password .* does not meet requirements/i, 'Password non valida')
    .replace(/database .*/i, 'Errore di sistema')
    .replace(/auth .*/i, 'Errore di autenticazione');
  
  return sanitized;
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
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, fullName, therapistId } = await req.json();
    
    // Input validation and sanitization
    if (!email || !fullName || !therapistId) {
      throw new Error('Parametri mancanti');
    }
    
    const sanitizedEmail = sanitizeInput(email, 254);
    const sanitizedFullName = sanitizeInput(fullName, 100);
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new Error('Formato email non valido');
    }
    
    // Rate limiting check
    if (!checkRateLimit(therapistId)) {
      throw new Error('Troppi tentativi di creazione pazienti. Riprova tra qualche minuto.');
    }
    
    const password = generateSecurePassword();

    // Check if user already exists in auth
    const { data: existingUser, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers();
    
    let user;
    let userId;
    let userRecreated = false;
    
    const existingUserRecord = existingUser?.users?.find(u => u.email === sanitizedEmail);
    
    // Check if there's an existing patient profile with this email
    const { data: existingPatientProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, full_name')
      .eq('role', 'patient')
      .eq('created_by', therapistId);
    
    // Find profile by matching the full name
    const matchingProfile = existingPatientProfile?.find(p => 
      p.full_name.toLowerCase() === sanitizedFullName.toLowerCase()
    );
    
    if (existingUserRecord) {
      // User exists in auth, use existing user ID
      userId = existingUserRecord.id;
      user = { user: existingUserRecord };
    } else if (matchingProfile) {
      // Found orphaned profile with same name, clean and recreate user
      console.log(`Trovato profilo orfano per ${sanitizedFullName}, pulizia e ricreazione utente`);
      
      // Delete orphaned profile and related data
      await supabaseAdmin
        .from('exercise_sessions')
        .delete()
        .eq('patient_id', matchingProfile.id);
        
      await supabaseAdmin
        .from('exercises')
        .delete()
        .eq('patient_id', matchingProfile.id);
        
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', matchingProfile.id);
      
      userRecreated = true;
      
      // Create new user
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: sanitizedEmail,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: sanitizedFullName,
          password: password
        }
      });

      if (userError) {
        throw new Error(sanitizeErrorMessage(userError));
      }
      
      user = newUser;
      userId = newUser.user.id;
    } else {
      // Create completely new user
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: sanitizedEmail,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: sanitizedFullName,
          password: password
        }
      });

      if (userError) {
        throw new Error(sanitizeErrorMessage(userError));
      }
      
      user = newUser;
      userId = newUser.user.id;
    }

    // Create patient profile (delete existing profile if needed)
    // First, delete any existing profile (in case trigger created one)
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    // Now create the correct patient profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        role: 'patient',
        full_name: sanitizedFullName,
        created_by: therapistId,
      });

    if (profileError) {
      throw new Error(sanitizeErrorMessage(profileError));
    }

    // Generate password reset link that works properly
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: sanitizedEmail,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/reset-password`
      }
    });

    if (resetError) {
      console.error('Errore generazione link reset:', resetError);
    }

    // Send welcome email using Supabase invite system
    let emailSent = false;
    let emailError = null;
    
    try {
      // Use the same invite system that works from Supabase dashboard
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(sanitizedEmail, {
        redirectTo: `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '.supabase.app')}/`,
        data: {
          full_name: sanitizedFullName,
          password: password,
          welcome_message: `Ciao ${sanitizedFullName}! Le tue credenziali: Email: ${sanitizedEmail}, Password: ${password}`
        }
      });

      if (inviteError) {
        console.error('Errore invio email:', inviteError);
        emailError = sanitizeErrorMessage(inviteError);
      } else {
        console.log(`Email di benvenuto inviata con successo a ${sanitizedEmail}`);
        emailSent = true;
      }
    } catch (emailException) {
      console.error('Errore invio email:', emailException);
      emailError = sanitizeErrorMessage(emailException);
    }

    // Log security event
    console.log(`SECURITY_LOG: Patient created - Therapist: ${therapistId}, Patient: ${sanitizedEmail}, Timestamp: ${new Date().toISOString()}`);

    // Prepare response message
    let message = userRecreated 
      ? `Paziente ${sanitizedFullName} ricreato con successo (dati precedenti eliminati).`
      : `Paziente ${sanitizedFullName} creato con successo.`;
    let warning = null;
    
    if (emailSent) {
      message += ` Email di benvenuto inviata a ${sanitizedEmail} con credenziali di accesso.`;
    } else {
      warning = `ATTENZIONE: Il paziente è stato creato ma l'email non è stata inviata. Fornisci manualmente le credenziali al paziente.`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        password: password,
        magic_link: resetData?.properties?.action_link,
        message: message,
        warning: warning,
        emailSent: emailSent,
        emailError: emailError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SECURITY_LOG: Patient creation failed:', error.message);
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