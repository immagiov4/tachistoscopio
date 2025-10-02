import { supabase } from '@/integrations/supabase/client';
import { Exercise, ExerciseSession as DBExerciseSession } from '@/types/database';

export interface ExerciseSession {
  words: string[];
  settings: any;
  startTime: number;
  currentWordIndex: number;
  errors: number[];
  isRunning: boolean;
  isPaused: boolean;
}

export interface SessionResult {
  totalWords: number;
  correctWords: number;
  incorrectWords: number;
  accuracy: number;
  duration: number;
  missedWords: string[];
  settings: any;
}

export const fetchTodayExercise = async (effectiveStudentId: string) => {
  const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday

  // Check if exercise for today exists
  const { data: exercise, error: exerciseError } = await supabase
    .from('exercises')
    .select(`
      *,
      word_list:word_lists(*)
    `)
    .eq('student_id', effectiveStudentId)
    .eq('day_of_week', today)
    .single();

  if (exerciseError && exerciseError.code !== 'PGRST116') {
    throw exerciseError;
  }

  return exercise as any || null;
};

export const checkIfCompletedToday = async (exerciseId: string, effectiveStudentId: string) => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const { data: sessions, error: sessionsError } = await supabase
    .from('exercise_sessions')
    .select('*')
    .eq('exercise_id', exerciseId)
    .eq('student_id', effectiveStudentId)
    .gte('completed_at', startOfDay.toISOString())
    .lte('completed_at', endOfDay.toISOString());

  if (sessionsError) {
    throw sessionsError;
  }

  return sessions && sessions.length > 0;
};

export const fetchRecentSessions = async (effectiveStudentId: string) => {
  const { data: sessions, error } = await supabase
    .from('exercise_sessions')
    .select('*')
    .eq('student_id', effectiveStudentId)
    .order('completed_at', { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return sessions || [];
};

export const createExerciseSession = (
  words: string[],
  settings: any,
  accessibilitySettings: any,
  selectedTheme: string
): ExerciseSession => {
  return {
    words,
    settings: {
      ...settings,
      fontSize: accessibilitySettings.fontSize,
      theme: selectedTheme
    },
    startTime: Date.now(),
    currentWordIndex: 0,
    errors: [],
    isRunning: true,
    isPaused: false
  };
};

export const saveSessionToDatabase = async (
  result: SessionResult,
  exerciseId: string,
  effectiveStudentId: string
) => {
  const sessionData = {
    exercise_id: exerciseId,
    student_id: effectiveStudentId,
    total_words: result.totalWords,
    correct_words: result.correctWords,
    incorrect_words: result.incorrectWords,
    accuracy: result.accuracy,
    duration: result.duration,
    missed_words: result.missedWords
  };

  const { error } = await supabase
    .from('exercise_sessions')
    .insert(sessionData);

  if (error) {
    throw error;
  }
};
