import { supabase } from '@/integrations/supabase/client';
import { Profile, WordList, Exercise, ExerciseSettings } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export type PatientWithEmail = Profile & {
  email?: string;
};

export type PatientWithExerciseCount = PatientWithEmail & {
  exerciseCount: number;
};

export const fetchPatientsWithEmails = async (therapistId: string) => {
  const { data, error } = await supabase.rpc('get_patients_with_emails', {
    therapist_profile_id: therapistId
  });

  if (error) throw error;

  return (data || []).map(p => ({
    ...p,
    role: p.role as any
  })) as PatientWithEmail[];
};

export const fetchWordLists = async (therapistId: string) => {
  const { data, error } = await supabase
    .from('word_lists')
    .select('*')
    .eq('created_by', therapistId);

  if (error) throw error;

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
  })) as unknown as WordList[];
};

export const fetchExercises = async (therapistId: string) => {
  const { data, error } = await supabase
    .from('exercises')
    .select('student_id')
    .eq('coach_id', therapistId);

  if (error) throw error;

  return data || [];
};

export const calculateExerciseCounts = (
  patients: PatientWithEmail[],
  exercises: { student_id: string }[]
): PatientWithExerciseCount[] => {
  const exerciseCounts = exercises.reduce((acc: { [key: string]: number }, exercise) => {
    acc[exercise.student_id] = (acc[exercise.student_id] || 0) + 1;
    return acc;
  }, {});

  return patients.map(patient => ({
    ...patient,
    exerciseCount: exerciseCounts[patient.id] || 0
  }));
};

export const fetchPatientExercises = async (studentId: string) => {
  const { data, error } = await supabase
    .from('exercises')
    .select(`
      *,
      word_list:word_lists(*)
    `)
    .eq('student_id', studentId);

  if (error) throw error;

  return data as any || [];
};

export const fetchPatientSessions = async (studentId: string) => {
  const { data, error } = await supabase
    .from('exercise_sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  return data || [];
};

export const buildWeeklyExercisesMap = (exercises: any[]): { [key: number]: Partial<Exercise> } => {
  const weeklyData: { [key: number]: Partial<Exercise> } = {};
  exercises.forEach((exercise: any) => {
    weeklyData[exercise.day_of_week] = exercise;
  });
  return weeklyData;
};

export const upsertExercise = async (
  studentId: string,
  therapistId: string,
  dayOfWeek: number,
  wordListId: string,
  settings: ExerciseSettings
) => {
  const { data: existingExercise } = await supabase
    .from('exercises')
    .select('id')
    .eq('student_id', studentId)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle();

  if (existingExercise) {
    const { error } = await supabase
      .from('exercises')
      .update({
        word_list_id: wordListId,
        settings: settings as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingExercise.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('exercises')
      .insert({
        student_id: studentId,
        coach_id: therapistId,
        word_list_id: wordListId,
        day_of_week: dayOfWeek,
        settings: settings as any
      });

    if (error) throw error;
  }
};

export const deleteExerciseWithSessions = async (exerciseId: string) => {
  const { error: sessionsError } = await supabase
    .from('exercise_sessions')
    .delete()
    .eq('exercise_id', exerciseId);

  if (sessionsError) throw sessionsError;

  const { error: exerciseError } = await supabase
    .from('exercises')
    .delete()
    .eq('id', exerciseId);

  if (exerciseError) throw exerciseError;
};

export const createPatientAccount = async (
  email: string,
  fullName: string,
  therapistId: string
) => {
  const { data, error } = await supabase.functions.invoke('create-patient', {
    body: {
      email,
      fullName,
      therapistId
    }
  });

  if (error) throw error;

  return data;
};

export const deletePatientAccount = async (patientId: string) => {
  const { data, error } = await supabase.functions.invoke('delete-patient', {
    body: {
      patientId
    }
  });

  if (error) throw error;

  return data;
};

export const getErrorMessage = (error: any, context: 'update' | 'remove' | 'create' | 'delete'): string => {
  if (context === 'update') {
    if (error.code === '23503') {
      if (error.message?.includes('exercises_patient_id_fkey')) {
        return 'Impossibile aggiornare: lo studente selezionato non esiste più. Ricarica la pagina.';
      } else if (error.message?.includes('word_list')) {
        return 'Impossibile aggiornare: la lista di parole selezionata non esiste più.';
      }
      return 'Errore di vincolo del database. Controlla che tutti i dati siano validi.';
    } else if (error.code === 'PGRST116') {
      return 'Non hai i permessi per modificare questo esercizio.';
    }
  }

  if (context === 'remove') {
    if (error.code === 'PGRST116') {
      return 'Esercizio non trovato o non hai i permessi per rimuoverlo.';
    } else if (error.message?.includes('foreign key')) {
      return 'Impossibile eliminare: esistono ancora sessioni collegate';
    }
  }

  if (context === 'create') {
    if (error.message?.includes('email')) {
      return 'Email non valida o già utilizzata da un altro utente.';
    } else if (error.message?.includes('already exists')) {
      return 'Uno studente con questa email esiste già.';
    }
  }

  if (context === 'delete') {
    if (error.message?.includes('Unauthorized')) {
      return 'Non hai i permessi per eliminare questo studente.';
    } else if (error.message?.includes('not found')) {
      return 'Studente non trovato.';
    }
  }

  if (error.message?.includes('network')) {
    return 'Errore di connessione. Controlla la rete e riprova.';
  }

  return error.message || 'Errore sconosciuto';
};

export const filterPatients = (
  patients: PatientWithExerciseCount[],
  searchTerm: string
): PatientWithExerciseCount[] => {
  return patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
};

export const paginatePatients = (
  patients: PatientWithExerciseCount[],
  currentPage: number,
  patientsPerPage: number
) => {
  const totalPages = Math.ceil(patients.length / patientsPerPage);
  const startIndex = (currentPage - 1) * patientsPerPage;
  const paginatedPatients = patients.slice(startIndex, startIndex + patientsPerPage);

  return {
    paginatedPatients,
    totalPages,
    startIndex
  };
};

export const calculateAverageAccuracy = (sessions: any[]): number => {
  if (sessions.length === 0) return 0;
  return Math.round(sessions.reduce((acc, session) => acc + session.accuracy, 0) / sessions.length);
};

export const calculateTotalWords = (sessions: any[]): number => {
  return sessions.reduce((acc, session) => acc + session.total_words, 0);
};
