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
    name: 'Parole ad Alta Frequenza',
    description: 'Parole comuni per lettori principianti',
    words: [
      'il', 'di', 'che', 'e', 'la', 'un', 'a', 'è', 'per', 'una',
      'sono', 'con', 'non', 'le', 'ho', 'lo', 'mi', 'si', 'ha', 'me',
      'come', 'casa', 'sole', 'libro', 'gatto', 'cane', 'mamma', 'papà', 'bambino', 'bambina',
      'bello', 'grande', 'piccolo', 'rosso', 'blu', 'verde', 'giallo', 'nero'
    ]
  },
  {
    id: 'three-letter',
    name: 'Parole di Tre Lettere',
    description: 'Parole semplici con struttura consonante-vocale-consonante',
    words: [
      'can', 'bat', 'car', 'gas', 'bar', 'col', 'dal', 'fan', 'gel', 'mal',
      'non', 'per', 'poi', 'qui', 'sei', 'sul', 'tra', 'una', 'via', 'zoo',
      'due', 'tre', 'oro', 'lei', 'lui', 'mio', 'tuo', 'suo', 'sta', 'vai'
    ]
  },
  {
    id: 'syllables',
    name: 'Sillabe Comuni',
    description: 'Combinazioni di due lettere',
    words: [
      'ba', 'be', 'bi', 'bo', 'bu', 'ca', 'ce', 'ci', 'co', 'cu',
      'da', 'de', 'di', 'do', 'du', 'fa', 'fe', 'fi', 'fo', 'fu',
      'ga', 'ge', 'gi', 'go', 'gu', 'la', 'le', 'li', 'lo', 'lu',
      'ma', 'me', 'mi', 'mo', 'mu', 'na', 'ne', 'ni', 'no', 'nu'
    ]
  },
  {
    id: 'four-letter',
    name: 'Parole di Quattro Lettere',
    description: 'Parole leggermente più complesse',
    words: [
      'casa', 'mare', 'sole', 'luna', 'vita', 'mano', 'occhi', 'testa', 'cuore', 'amore',
      'nome', 'paese', 'mondo', 'tempo', 'giorno', 'notte', 'donna', 'uomo', 'figlio', 'madre',
      'padre', 'fiore', 'acqua', 'terra', 'cielo', 'alto', 'bene', 'dove', 'come', 'cosa'
    ]
  }
];