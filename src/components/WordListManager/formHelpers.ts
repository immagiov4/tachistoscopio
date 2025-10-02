import { sanitizeInput, sanitizeWordList } from '@/utils/passwordValidation';
import { ExerciseSettings } from '@/types/database';
import { VALIDATION } from '@/constants/timing';

export interface FormData {
  listName: string;
  words: string[];
  settings: ExerciseSettings;
}

export const prepareFormData = (
  customListName: string,
  generatedWords: string[],
  customWords: string,
  activeTab: 'manual' | 'generator',
  exerciseSettings: ExerciseSettings
): FormData => {
  const sanitizedListName = sanitizeInput(customListName || 'Nuovo esercizio', 100);
  const rawWords = activeTab === 'generator' 
    ? generatedWords 
    : customWords.split(/[,\n]+/).map(word => word.trim()).filter(word => word.length > 0);
  const wordsToSave = sanitizeWordList(rawWords);

  return {
    listName: sanitizedListName,
    words: wordsToSave,
    settings: exerciseSettings
  };
};

export const generateDescriptionText = (
  wordCount: number,
  settings: ExerciseSettings
): string => {
  return `${wordCount} parole • Esp: ${settings.exposureDuration}ms • Int: ${settings.intervalDuration}ms${
    settings.useMask ? ` • Maschera: ${settings.maskDuration}ms` : ''
  }`;
};

export const validateWordList = (words: string[]): { isValid: boolean; error?: string } => {
  if (words.length === 0) {
    return {
      isValid: false,
      error: 'Nessuna parola da salvare'
    };
  }

  if (words.length > VALIDATION.MAX_WORDS_PER_LIST) {
    return {
      isValid: false,
      error: `Troppo parole (massimo ${VALIDATION.MAX_WORDS_PER_LIST})`
    };
  }

  return { isValid: true };
};

export const createTempWordList = (
  formData: FormData,
  activeTab: 'manual' | 'generator'
) => {
  return {
    id: 'temp-' + Date.now(),
    name: formData.listName,
    description: `Lista ${activeTab === 'generator' ? 'generata' : 'personalizzata'} con ${formData.words.length} parole`,
    words: formData.words
  };
};

export const clearForm = (
  activeTab: 'manual' | 'generator',
  setCustomWords: (words: string) => void,
  setCustomListName: (name: string) => void
) => {
  if (activeTab === 'manual') {
    setCustomWords('');
  }
  setCustomListName('Nuovo esercizio');
};
