import { countSyllables, inappropriateWordsSet } from './wordGenerators';

export interface GeneratorParams {
  type: 'words' | 'syllables' | 'nonwords' | 'minimal-pairs';
  syllableCount: string;
  startsWith: string;
  contains: string;
  count: number;
}

export const filterWordsBySyllables = (
  words: string[],
  syllables: number,
  params: { startsWith: string; contains: string }
): string[] => {
  return words.filter(word => {
    if (inappropriateWordsSet.has(word.toLowerCase())) return false;
    if (word.length < 2) return false;
    if (params.startsWith && !word.toLowerCase().startsWith(params.startsWith.toLowerCase())) {
      return false;
    }
    if (params.contains && !word.toLowerCase().includes(params.contains.toLowerCase())) {
      return false;
    }
    return countSyllables(word) === syllables;
  });
};

export const shuffleAndLimit = (words: string[], count: number): string[] => {
  const shuffled = words.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const selectWordSource = (allWords: string[], fallbackWords: string[]): string[] => {
  return allWords.length > 1000 ? allWords : fallbackWords;
};
