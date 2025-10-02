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

export const formatWord = (word: string, textCase: string): string => {
  switch (textCase) {
    case 'uppercase':
      return word.toUpperCase();
    case 'lowercase':
      return word.toLowerCase();
    default:
      return word;
  }
};

export const calculateSessionResult = (session: ExerciseSession): SessionResult => {
  const endTime = Date.now();
  const duration = endTime - session.startTime;
  const totalWords = session.words.length;
  const incorrectWords = session.errors.length;
  const correctWords = totalWords - incorrectWords;
  const accuracy = (correctWords / totalWords) * 100;

  const missedWords = session.errors.map(index => session.words[index]);

  return {
    totalWords,
    correctWords,
    incorrectWords,
    accuracy,
    duration,
    missedWords,
    settings: session.settings,
  };
};

export const calculateProgress = (currentWordIndex: number, totalWords: number): number => {
  const currentWordNumber = currentWordIndex + 1;
  return (currentWordNumber / totalWords) * 100;
};

export const calculateAccuracy = (currentWordIndex: number, errors: number[]): number => {
  if (currentWordIndex === 0) return 100;
  return ((currentWordIndex - errors.length) / currentWordIndex) * 100;
};

export const shouldAddError = (errors: number[], totalWords: number): boolean => {
  return errors.length < totalWords;
};

export const createUpdatedSession = (
  session: ExerciseSession,
  updates: Partial<ExerciseSession>
): ExerciseSession => {
  return {
    ...session,
    ...updates
  };
};
