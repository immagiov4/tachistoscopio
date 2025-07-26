// Updated to remove predefined word lists
export interface WordList {
  id: string;
  name: string;
  words: string[];
  description?: string;
  settings?: ExerciseSettings;
}

export interface ExerciseSettings {
  exposureDuration: number; // milliseconds
  intervalDuration: number; // milliseconds
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  textCase: 'original' | 'uppercase' | 'lowercase';
  useMask: boolean;
  maskDuration: number; // milliseconds
  intervalVariability: number; // milliseconds of random variation
}

export interface ExerciseSession {
  wordList: WordList;
  settings: ExerciseSettings;
  startTime: number;
  endTime?: number;
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
  settings: ExerciseSettings;
  wordListName: string;
}

export const DEFAULT_SETTINGS: ExerciseSettings = {
  exposureDuration: 500,
  intervalDuration: 200,
  fontSize: 'large',
  textCase: 'original',
  useMask: false,
  maskDuration: 200,
  intervalVariability: 100,
};
