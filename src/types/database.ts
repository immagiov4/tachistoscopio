export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          role: 'therapist' | 'patient';
          full_name: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'therapist' | 'patient';
          full_name: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'therapist' | 'patient';
          full_name?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      word_lists: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          words: string[];
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          words: string[];
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          words?: string[];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      exercises: {
        Row: {
          id: string;
          patient_id: string;
          therapist_id: string;
          word_list_id: string;
          day_of_week: number;
          settings: ExerciseSettings;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          therapist_id: string;
          word_list_id: string;
          day_of_week: number;
        settings: ExerciseSettings;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          therapist_id?: string;
          word_list_id?: string;
          day_of_week?: number;
          settings?: ExerciseSettings;
          created_at?: string;
          updated_at?: string;
        };
      };
      exercise_sessions: {
        Row: {
          id: string;
          exercise_id: string;
          patient_id: string;
          total_words: number;
          correct_words: number;
          incorrect_words: number;
          accuracy: number;
          duration: number;
          missed_words: string[];
          completed_at: string;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          patient_id: string;
          total_words: number;
          correct_words: number;
          incorrect_words: number;
          accuracy: number;
          duration: number;
          missed_words: string[];
          completed_at?: string;
        };
        Update: {
          id?: string;
          exercise_id?: string;
          patient_id?: string;
          total_words?: number;
          correct_words?: number;
          incorrect_words?: number;
          accuracy?: number;
          duration?: number;
          missed_words?: string[];
          completed_at?: string;
        };
      };
    };
  };
}

export type UserRole = 'therapist' | 'patient';

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WordList {
  id: string;
  name: string;
  description: string | null;
  words: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  patient_id: string;
  therapist_id: string;
  word_list_id: string;
  day_of_week: number;
  settings: ExerciseSettings;
  created_at: string;
  updated_at: string;
  word_list?: WordList;
  patient?: Profile;
}

export interface ExerciseSession {
  id: string;
  exercise_id: string;
  patient_id: string;
  total_words: number;
  correct_words: number;
  incorrect_words: number;
  accuracy: number;
  duration: number;
  missed_words: string[];
  completed_at: string;
}

export interface ExerciseSettings {
  exposureDuration: number;
  intervalDuration: number;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  textCase: 'original' | 'uppercase' | 'lowercase';
  useMask: boolean;
  maskDuration: number;
}

export const DEFAULT_SETTINGS: ExerciseSettings = {
  exposureDuration: 500,
  intervalDuration: 200,
  fontSize: 'large',
  textCase: 'original',
  useMask: false,
  maskDuration: 200,
};

export const DAYS_OF_WEEK = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato'
];