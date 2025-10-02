import { supabase } from '@/integrations/supabase/client';
import { WordList as DBWordList, ExerciseSettings } from '@/types/database';
import { sanitizeInput, sanitizeWordList } from '@/utils/passwordValidation';

export const loadSavedWordLists = async (therapistId: string): Promise<DBWordList[]> => {
  const { data, error } = await supabase
    .from('word_lists')
    .select('*')
    .eq('created_by', therapistId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading word lists:', error);
    throw error;
  }

  return (data || []).map(list => ({
    ...list,
    settings: typeof list.settings === 'object' && list.settings !== null && !Array.isArray(list.settings)
      ? list.settings as any
      : {
          exposureDuration: 500,
          intervalDuration: 200,
          textCase: 'original' as const,
          useMask: false,
          maskDuration: 200
        }
  }));
};

export const saveWordList = async (
  name: string,
  description: string,
  words: string[],
  settings: ExerciseSettings,
  therapistId: string
) => {
  const sanitizedName = sanitizeInput(name, 100);
  const sanitizedDescription = sanitizeInput(description, 500);
  const sanitizedWords = sanitizeWordList(words);

  if (sanitizedWords.length === 0) {
    throw new Error('Nessuna parola valida da salvare');
  }

  const { data, error } = await supabase
    .from('word_lists')
    .insert({
      created_by: therapistId,
      name: sanitizedName,
      description: sanitizedDescription,
      words: sanitizedWords,
      settings: settings as any
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving word list:', error);
    throw error;
  }

  return data;
};

export const updateWordList = async (
  listId: string,
  name: string,
  description: string,
  words: string[],
  settings: ExerciseSettings
) => {
  const sanitizedName = sanitizeInput(name, 100);
  const sanitizedDescription = sanitizeInput(description, 500);
  const sanitizedWords = sanitizeWordList(words);

  if (sanitizedWords.length === 0) {
    throw new Error('Nessuna parola valida da salvare');
  }

  const { data, error } = await supabase
    .from('word_lists')
    .update({
      name: sanitizedName,
      description: sanitizedDescription,
      words: sanitizedWords,
      settings: settings as any
    })
    .eq('id', listId)
    .select()
    .single();

  if (error) {
    console.error('Error updating word list:', error);
    throw error;
  }

  return data;
};

export const deleteWordList = async (listId: string) => {
  const { error } = await supabase
    .from('word_lists')
    .delete()
    .eq('id', listId);

  if (error) {
    console.error('Error deleting word list:', error);
    throw error;
  }
};
