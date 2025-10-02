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

const COMMON_SAFE_WORDS = [
  'casa', 'cassa', 'cane', 'canne', 'male', 'mare', 'mele', 'sole', 'suole',
  'filo', 'fino', 'vino', 'pino', 'lana', 'rana', 'mano', 'nano', 'polo',
  'bolo', 'tana', 'dana', 'pala', 'palla', 'cola', 'colla', 'gala', 'galla',
  'caro', 'carro', 'nero', 'loro', 'oro', 'foro', 'moro', 'coro', 'toro',
  'sera', 'serra', 'terra', 'cera', 'peso', 'pezzo', 'mese', 'messe', 'base',
  'basse', 'rosa', 'rossa', 'massa', 'mazza', 'pazzo', 'passo', 'tasso',
  'tazza', 'razzo', 'note', 'notte', 'botte', 'moto', 'motto', 'foto',
  'fatto', 'gatto', 'lago', 'carta', 'casta', 'pasta', 'basta', 'vasta',
  'fede', 'sede', 'vede', 'cede', 'bene', 'gene', 'rene', 'meta', 'beta',
  'zeta', 'seta', 'vita', 'dita', 'buco', 'bucco', 'eco', 'ecco', 'sano',
  'sanno', 'papa', 'pappa', 'bella', 'torre', 'borre', 'corre', 'forre',
  'dorme', 'forme', 'norme', 'luce', 'sale', 'tale', 'vale', 'pale', 'cale',
  'dale', 'bale', 'lato', 'nato', 'dato', 'rato', 'pato', 'mato', 'fiume',
  'piume', 'muro', 'puro', 'curo', 'euro', 'rago', 'pago', 'mago', 'sago',
  'vago', 'coda', 'soda', 'loda', 'moda', 'noda', 'roda', 'luna', 'runa',
  'duna', 'tuna', 'puna', 'cuna', 'sino', 'lino', 'mino', 'dino', 'tino',
  'dado', 'fado', 'nado', 'rado', 'sado', 'vado'
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

const checkWordValidity = (
  word: string,
  targetSyllables: number,
  startsWith: string,
  contains: string
): boolean => {
  const syllables = countSyllables(word);
  const validSyllables = syllables === targetSyllables;
  const validFilters = 
    (!startsWith || word.startsWith(startsWith.toLowerCase())) &&
    (!contains || word.includes(contains.toLowerCase()));
  
  return validSyllables && validFilters;
};

const isValidVariant = (
  variant: string,
  dictionary: Set<string>,
  inappropriateWords: Set<string>,
  currentResults: string[],
  results: string[]
): boolean => {
  return dictionary.has(variant) && 
    !inappropriateWords.has(variant.toLowerCase()) &&
    !currentResults.includes(variant) &&
    !results.includes(variant);
};

const canContinueSearching = (
  resultsLength: number,
  currentResultsLength: number,
  maxCount: number
): boolean => {
  return resultsLength + currentResultsLength < maxCount;
};

const tryLetterAtPosition = (
  word: string,
  position: number,
  letter: string,
  dictionary: Set<string>,
  inappropriateWords: Set<string>,
  targetSyllables: number,
  startsWith: string,
  contains: string,
  currentResults: string[],
  results: string[]
): boolean => {
  if (letter === word[position]) return false;
  
  const variant = word.slice(0, position) + letter + word.slice(position + 1);
  
  if (!isValidVariant(variant, dictionary, inappropriateWords, currentResults, results)) {
    return false;
  }
  
  if (!checkWordValidity(variant, targetSyllables, startsWith, contains)) {
    return false;
  }
  
  results.push(variant);
  return true;
};

const findVariantsAtPosition = (
  word: string,
  position: number,
  dictionary: Set<string>,
  inappropriateWords: Set<string>,
  targetSyllables: number,
  startsWith: string,
  contains: string,
  maxCount: number,
  currentResults: string[],
  results: string[]
): boolean => {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')
    .sort(() => Math.random() - 0.5);
  
  for (const letter of letters) {
    const added = tryLetterAtPosition(
      word, position, letter, dictionary, inappropriateWords,
      targetSyllables, startsWith, contains, currentResults, results
    );
    
    if (added && !canContinueSearching(results.length, currentResults.length, maxCount)) {
      return false;
    }
  }
  
  return true;
};

const findVariants = (
  word: string,
  dictionary: Set<string>,
  inappropriateWords: Set<string>,
  targetSyllables: number,
  startsWith: string,
  contains: string,
  maxCount: number,
  currentResults: string[]
): string[] => {
  const results: string[] = [];
  const positions = Array.from({ length: word.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5);
  
  for (const position of positions) {
    if (!canContinueSearching(results.length, currentResults.length, maxCount)) break;
    
    const shouldContinue = findVariantsAtPosition(
      word, position, dictionary, inappropriateWords,
      targetSyllables, startsWith, contains, maxCount, currentResults, results
    );
    
    if (!shouldContinue) break;
  }
  
  return results;
};

const addWordToResult = (word: string, result: string[], maxCount: number): boolean => {
  if (!result.includes(word) && result.length < maxCount) {
    result.push(word);
    return true;
  }
  return false;
};

const processPair = (
  word: string,
  variant: string,
  foundPairs: Set<string>,
  result: string[],
  maxCount: number
): void => {
  const pair = [word, variant].sort((a, b) => a.localeCompare(b)).join('-');
  
  if (foundPairs.has(pair)) return;
  
  foundPairs.add(pair);
  addWordToResult(word, result, maxCount);
  addWordToResult(variant, result, maxCount);
};

const processWord = (
  word: string,
  dictionary: Set<string>,
  inappropriateWords: Set<string>,
  params: { syllableCount: number; startsWith: string; contains: string; count: number },
  foundPairs: Set<string>,
  result: string[]
): void => {
  const variants = findVariants(
    word,
    dictionary,
    inappropriateWords,
    params.syllableCount,
    params.startsWith,
    params.contains,
    params.count,
    result
  );
  
  for (const variant of variants) {
    processPair(word, variant, foundPairs, result, params.count);
    if (result.length >= params.count) break;
  }
};

export const generateMinimalPairsFromDictionary = (params: {
  syllableCount: number;
  startsWith: string;
  contains: string;
  count: number;
}): string[] => {
  const shuffledWords = [...COMMON_SAFE_WORDS].sort(() => Math.random() - 0.5);
  const dictionary = new Set(shuffledWords);
  const inappropriateWords = inappropriateWordsSet;
  const foundPairs = new Set<string>();
  const result: string[] = [];
  
  for (const word of shuffledWords) {
    if (result.length >= params.count) break;
    
    if (!checkWordValidity(word, params.syllableCount, params.startsWith, params.contains)) {
      continue;
    }
    
    processWord(word, dictionary, inappropriateWords, params, foundPairs, result);
  }
  
  return result.sort(() => Math.random() - 0.5);
};

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
