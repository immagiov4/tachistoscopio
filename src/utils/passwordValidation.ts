// Password validation utilities for secure registration
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  
  // Minimum length check
  if (password.length < 8) {
    errors.push('La password deve essere di almeno 8 caratteri');
  }
  
  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('La password deve contenere almeno una lettera maiuscola');
  }
  
  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('La password deve contenere almeno una lettera minuscola');
  }
  
  // Number check
  if (!/\d/.test(password)) {
    errors.push('La password deve contenere almeno un numero');
  }
  
  // Optional: Special character check (uncomment if needed)
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   errors.push('La password deve contenere almeno un carattere speciale');
  // }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string, maxLength: number = 255): string => {
  // Remove HTML tags and limit length
  // Using a safer regex that limits backtracking with length constraints
  const sanitized = input
    .replace(/<[^>]{0,100}>/g, '') // Remove HTML tags with max 100 chars (prevents ReDoS)
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, maxLength);
  
  return sanitized;
};

export const sanitizeWordList = (words: string[]): string[] => {
  return words
    .map(word => sanitizeInput(word, 50)) // Limit word length
    .filter(word => word.length > 0) // Remove empty words
    .slice(0, 1000); // Limit total words
};