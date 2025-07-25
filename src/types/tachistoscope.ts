export interface WordList {
  id: string;
  name: string;
  words: string[];
  description?: string;
}

export interface ExerciseSettings {
  exposureDuration: number; // milliseconds
  intervalDuration: number; // milliseconds
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  textCase: 'original' | 'uppercase' | 'lowercase';
  useMask: boolean;
  maskDuration: number; // milliseconds
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
};

export const PREDEFINED_WORD_LISTS: WordList[] = [
  {
    id: 'high-frequency',
    name: 'High Frequency Words',
    description: 'Common sight words for beginning readers',
    words: [
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
      'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'
    ]
  },
  {
    id: 'three-letter',
    name: 'Three Letter Words (CVC)',
    description: 'Consonant-vowel-consonant patterns',
    words: [
      'cat', 'dog', 'run', 'big', 'red', 'sun', 'hat', 'pen', 'top', 'box',
      'leg', 'cup', 'bug', 'bag', 'sit', 'hop', 'cut', 'fun', 'win', 'yes',
      'zip', 'jam', 'web', 'fix', 'mix', 'six', 'fox', 'tax', 'wax', 'van'
    ]
  },
  {
    id: 'syllables',
    name: 'Common Syllables',
    description: 'Two-letter syllable combinations',
    words: [
      'ba', 'be', 'bi', 'bo', 'bu', 'ca', 'ce', 'ci', 'co', 'cu',
      'da', 'de', 'di', 'do', 'du', 'fa', 'fe', 'fi', 'fo', 'fu',
      'ga', 'ge', 'gi', 'go', 'gu', 'ha', 'he', 'hi', 'ho', 'hu',
      'la', 'le', 'li', 'lo', 'lu', 'ma', 'me', 'mi', 'mo', 'mu'
    ]
  },
  {
    id: 'four-letter',
    name: 'Four Letter Words',
    description: 'Slightly more complex words',
    words: [
      'book', 'look', 'good', 'took', 'come', 'some', 'home', 'time', 'like',
      'make', 'take', 'over', 'very', 'what', 'when', 'they', 'will', 'with',
      'have', 'this', 'that', 'from', 'long', 'each', 'word', 'find', 'kind'
    ]
  }
];