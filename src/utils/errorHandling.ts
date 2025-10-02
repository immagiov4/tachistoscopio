import { ERROR_MESSAGES } from '@/constants/errorMessages';

interface ErrorDetails {
  message?: string;
  code?: string;
}

export const getErrorMessage = (error: ErrorDetails, defaultMessage: string): string => {
  if (error.message?.includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return defaultMessage;
};

export const getWordListErrorMessage = (error: ErrorDetails): string => {
  if (error.code === '23503') {
    return ERROR_MESSAGES.WORDLIST_USED_IN_EXERCISES;
  }
  
  if (error.code === 'PGRST116') {
    return ERROR_MESSAGES.WORDLIST_DELETE_FAILED;
  }
  
  if (error.message?.includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (error.message?.includes('unique')) {
    return 'Esiste già una lista con questo nome. Scegli un nome diverso.';
  }
  
  if (error.message) {
    return `Errore durante l'eliminazione: ${error.message}`;
  }
  
  return ERROR_MESSAGES.WORDLIST_DELETE_FAILED;
};

export const getWordListUpdateErrorMessage = (error: ErrorDetails): string => {
  if (error.code === 'PGRST116') {
    return ERROR_MESSAGES.WORDLIST_NOT_FOUND;
  }
  
  if (error.message?.includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (error.message) {
    return `Errore durante l'aggiornamento: ${error.message}`;
  }
  
  return ERROR_MESSAGES.WORDLIST_UPDATE_FAILED;
};
