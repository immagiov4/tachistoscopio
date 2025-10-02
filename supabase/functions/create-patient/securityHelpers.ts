// Security utilities for create-patient edge function

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 10;

export const sanitizeInput = (input: string, maxLength: number = 255): string => {
  return input
    .replace(/<[^>]{0,100}>/g, '')
    .replace(/[<>'"&]/g, '')
    .trim()
    .substring(0, maxLength);
};

export const generateSecurePassword = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(array[i] % chars.length);
  }
  
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasUpper || !hasLower || !hasNumber) {
    const complexChars = 'Aa1';
    password = password.substring(0, 9) + complexChars;
  }
  
  return password;
};

export const checkRateLimit = (therapistId: string): boolean => {
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

export const sanitizeErrorMessage = (error: any): string => {
  const message = error?.message || 'Unknown error';
  
  const sanitized = message
    .replace(/user with email [^\s]{1,100} already exists/i, 'Email già registrata')
    .replace(/password [^\s]{1,100} does not meet requirements/i, 'Password non valida')
    .replace(/database [a-zA-Z0-9\s]{1,50}/i, 'Errore di sistema')
    .replace(/auth [a-zA-Z0-9\s]{1,50}/i, 'Errore di autenticazione');
  
  return sanitized;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
  return emailRegex.test(email);
};

export const findOrphanedProfile = async (
  supabaseAdmin: any,
  fullName: string,
  therapistId: string
) => {
  const { data: existingPatientProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, user_id, full_name')
    .eq('role', 'student')
    .eq('created_by', therapistId);
  
  return existingPatientProfile?.find((p: any) => 
    p.full_name.toLowerCase() === fullName.toLowerCase()
  );
};

export const cleanOrphanedData = async (supabaseAdmin: any, profileId: string) => {
  await supabaseAdmin.from('exercise_sessions').delete().eq('patient_id', profileId);
  await supabaseAdmin.from('exercises').delete().eq('patient_id', profileId);
  await supabaseAdmin.from('profiles').delete().eq('id', profileId);
};
