// Word generation helpers for WordListManager

export const ITALIAN_SYLLABLES = [
  'ba', 'be', 'bi', 'bo', 'bu',
  'ca', 'ce', 'ci', 'co', 'cu',
  'da', 'de', 'di', 'do', 'du',
  'fa', 'fe', 'fi', 'fo', 'fu',
  'ga', 'ge', 'gi', 'go', 'gu',
  'la', 'le', 'li', 'lo', 'lu',
  'ma', 'me', 'mi', 'mo', 'mu',
  'na', 'ne', 'ni', 'no', 'nu',
  'pa', 'pe', 'pi', 'po', 'pu',
  'ra', 're', 'ri', 'ro', 'ru',
  'sa', 'se', 'si', 'so', 'su',
  'ta', 'te', 'ti', 'to', 'tu',
  'va', 've', 'vi', 'vo', 'vu',
  'za', 'ze', 'zi', 'zo', 'zu'
];

// Function to count syllables in Italian words
export const countSyllables = (word: string): number => {
  if (!word) return 0;

  const cleanWord = word.toLowerCase()
    .replace(/[àáâãä]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u');

  const letters = cleanWord.replace(/[^a-z]/g, '');
  if (letters.length === 0) return 0;
  if (letters.length <= 2) return 1;

  const vowels = letters.match(/[aeiou]/g);
  if (!vowels) return 1;
  let syllables = vowels.length;

  const diphthongs = [
    'ia', 'ie', 'io', 'iu',
    'ua', 'ue', 'ui', 'uo',
    'ai', 'au', 'ei', 'eu', 'oi', 'ou'
  ];
  
  for (const diphthong of diphthongs) {
    const regex = new RegExp(diphthong, 'g');
    const matches = letters.match(regex);
    if (matches) {
      syllables -= matches.length;
    }
  }

  if (letters.match(/(zione|sione)$/)) {
    syllables += 1;
  }

  return Math.max(1, syllables);
};

// Inappropriate words filter set
export const inappropriateWordsSet = new Set([
  'pene', 'ano', 'culo', 'merda', 'cacca', 'pipi', 'popo',
  'stupido', 'idiota', 'cretino', 'scemo', 'deficiente',
  'stronzo', 'troia', 'puttana', 'figa', 'fica', 'vaffanculo',
  'cazzo', 'fottiti', 'inculare', 'mignotta', 'bastardo'
]);

export const generateSyllables = (params: {
  startsWith: string;
  contains: string;
  count: number;
}): string[] => {
  const syllables: string[] = [];
  let attempts = 0;
  const maxAttempts = params.count * 100;

  while (syllables.length < params.count && attempts < maxAttempts) {
    attempts++;
    const syllable = ITALIAN_SYLLABLES[Math.floor(Math.random() * ITALIAN_SYLLABLES.length)];
    
    if (params.startsWith && !syllable.startsWith(params.startsWith.toLowerCase())) continue;
    if (params.contains && !syllable.includes(params.contains.toLowerCase())) continue;
    
    if (!syllables.includes(syllable)) {
      syllables.push(syllable);
    }
  }
  
  return syllables;
};

export const generateNonWords = (params: {
  syllableCount: number;
  startsWith: string;
  contains: string;
  count: number;
}): string[] => {
  const nonWords: string[] = [];
  let attempts = 0;
  const maxAttempts = params.count * 100;
  const syllableLength = parseInt(String(params.syllableCount)) || 2;

  while (nonWords.length < params.count && attempts < maxAttempts) {
    attempts++;
    let nonWord = '';
    
    for (let i = 0; i < syllableLength; i++) {
      nonWord += ITALIAN_SYLLABLES[Math.floor(Math.random() * ITALIAN_SYLLABLES.length)];
    }
    
    if (params.startsWith && !nonWord.startsWith(params.startsWith.toLowerCase())) continue;
    if (params.contains && !nonWord.includes(params.contains.toLowerCase())) continue;
    if (inappropriateWordsSet.has(nonWord.toLowerCase())) continue;
    
    if (!nonWords.includes(nonWord)) {
      nonWords.push(nonWord);
    }
  }
  
  return nonWords;
};

export const generateMinimalPairs = (params: { count: number }): string[] => {
  const pairs: string[] = [];
  const minimalPairPatterns = [
    ['casa', 'cassa'], ['pane', 'pene'], ['cane', 'canne'],
    ['pala', 'palla'], ['nono', 'nonno'], ['papa', 'pappa']
  ];

  let pairIndex = 0;
  while (pairs.length < params.count && pairIndex < minimalPairPatterns.length) {
    pairs.push(...minimalPairPatterns[pairIndex]);
    pairIndex++;
  }

  return pairs.slice(0, params.count);
};
