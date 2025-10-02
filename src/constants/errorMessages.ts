// Centralized error messages to avoid duplicate string literals
export const ERROR_MESSAGES = {
  // Authentication errors
  AUTH_LOGIN_FAILED: 'Errore durante l\'accesso. Riprova.',
  AUTH_SIGNUP_FAILED: 'Errore durante la registrazione. Riprova.',
  AUTH_RESET_FAILED: 'Errore durante l\'invio dell\'email. Riprova.',
  AUTH_PASSWORD_UPDATE_FAILED: 'Errore durante l\'aggiornamento della password. Riprova.',
  AUTH_INVALID_CREDENTIALS: 'Credenziali di accesso non valide',
  AUTH_EMAIL_ALREADY_REGISTERED: 'Un utente con questa email è già registrato',
  
  // Patient management errors
  PATIENT_CREATE_FAILED: 'Errore durante la creazione dello studente',
  PATIENT_DELETE_FAILED: 'Errore durante l\'eliminazione dello studente',
  
  // Exercise errors
  EXERCISE_CREATE_FAILED: 'Errore durante la creazione del template',
  EXERCISE_DELETE_FAILED: 'Errore durante l\'eliminazione dell\'esercizio',
  EXERCISE_SESSION_SAVE_FAILED: 'Errore nel salvare i risultati',
  
  // Word list errors
  WORDLIST_SAVE_FAILED: 'Impossibile salvare la lista.',
  WORDLIST_DELETE_FAILED: 'Lista non trovata o non hai i permessi per eliminarla.',
  WORDLIST_UPDATE_FAILED: 'Impossibile aggiornare la lista.',
  WORDLIST_USED_IN_EXERCISES: 'Impossibile eliminare la lista perché è utilizzata in esercizi attivi. Per procedere, rimuovi prima gli esercizi dalla sezione Gestione Pazienti.',
  WORDLIST_NOT_FOUND: 'Lista non trovata o non hai i permessi per modificarla.',
  
  // Network errors
  NETWORK_ERROR: 'Errore di connessione. Controlla la rete e riprova.',
  
  // Generic errors
  UNKNOWN_ERROR: 'Errore sconosciuto',
  SYSTEM_ERROR: 'Errore di sistema',
} as const;

export const SUCCESS_MESSAGES = {
  AUTH_SIGNUP_SUCCESS: 'Registrazione completata! Controlla la tua email per confermare l\'account.',
  AUTH_RESET_EMAIL_SENT: 'Ti abbiamo inviato un link per reimpostare la password. Controlla la tua email.',
} as const;
