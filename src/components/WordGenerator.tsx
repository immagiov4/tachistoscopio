import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Save, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import paroleItalianeText from '@/data/parole_italiane_complete.txt?raw';

interface WordGeneratorProps {
  therapistId?: string;
  onSave?: (wordList: { name: string; words: string[] }) => void;
}

interface GenerationParams {
  type: 'words' | 'syllables' | 'nonwords' | 'minimal-pairs';
  syllableCount: string;
  startsWith: string;
  contains: string;
  count: number;
}

// Sillabe italiane comuni
const ITALIAN_SYLLABLES = [
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

// Parole italiane base per generazione
const ITALIAN_WORD_STEMS = [
  'cas', 'mar', 'sol', 'lun', 'vit', 'man', 'tes', 'cuo', 'amo', 'nom',
  'pac', 'mon', 'tem', 'gior', 'not', 'don', 'uom', 'fig', 'mad', 'pad',
  'fio', 'acq', 'ter', 'cie', 'alt', 'ben', 'dov', 'com', 'cos', 'mol',
  'lib', 'scu', 'lav', 'stu', 'par', 'pen', 'sen', 'viv', 'mor', 'nas'
];

const WORD_ENDINGS = ['a', 'e', 'i', 'o', 'u', 'are', 'ere', 'ire', 'ato', 'uto', 'ito'];

export const WordGenerator: React.FC<WordGeneratorProps> = ({ therapistId, onSave }) => {
  const [params, setParams] = useState<GenerationParams>({
    type: 'words',
    syllableCount: '2',
    startsWith: '',
    contains: '',
    count: 10
  });
  
  const [generatedWords, setGeneratedWords] = useState<string[]>([]);
  const [listName, setListName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [italianWords, setItalianWords] = useState<string[]>([]);
  const { toast } = useToast();

  // Carica il dizionario italiano
  useEffect(() => {
    const words = paroleItalianeText
      .split('\n')
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0);
    setItalianWords(words);
  }, []);

  const generateWords = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      let words: string[] = [];
      
      switch (params.type) {
        case 'words':
          words = generateRealWords();
          break;
        case 'syllables':
          words = generateSyllables();
          break;
        case 'nonwords':
          words = generateNonWords();
          break;
        case 'minimal-pairs':
          words = generateMinimalPairs();
          break;
      }
      
      setGeneratedWords(words);
      setIsGenerating(false);
    }, 500);
  };

  const generateRealWords = (): string[] => {
    if (italianWords.length === 0) return [];
    
    const syllables = parseInt(params.syllableCount) || 2;
    
    // Filtra le parole del dizionario
    let filteredWords = italianWords.filter(word => {
      // Applica filtri di testo
      if (params.startsWith && !word.startsWith(params.startsWith.toLowerCase())) return false;
      if (params.contains && !word.includes(params.contains.toLowerCase())) return false;
      
      // Controlla numero di sillabe (conta le vocali come approssimazione)
      const syllableCount = word.match(/[aeiou]/g)?.length || 1;
      if (syllableCount !== syllables) return false;
      
      return true;
    });
    
    // Se non abbiamo abbastanza parole, ritorna quello che abbiamo
    if (filteredWords.length === 0) return [];
    
    // Seleziona parole casuali dal set filtrato
    const selectedWords: string[] = [];
    const targetCount = Math.min(params.count, filteredWords.length);
    
    while (selectedWords.length < targetCount) {
      const randomIndex = Math.floor(Math.random() * filteredWords.length);
      const word = filteredWords[randomIndex];
      
      if (!selectedWords.includes(word)) {
        selectedWords.push(word);
      }
    }
    
    return selectedWords;
  };

  const generateSyllables = (): string[] => {
    const syllables: string[] = [];
    
    while (syllables.length < params.count) {
      const syllable = ITALIAN_SYLLABLES[Math.floor(Math.random() * ITALIAN_SYLLABLES.length)];
      
      if (params.startsWith && !syllable.startsWith(params.startsWith.toLowerCase())) continue;
      if (params.contains && !syllable.includes(params.contains.toLowerCase())) continue;
      
      if (!syllables.includes(syllable)) {
        syllables.push(syllable);
      }
    }
    
    return syllables;
  };

  const generateNonWords = (): string[] => {
    const nonWords: string[] = [];
    const consonants = ['b', 'c', 'd', 'f', 'g', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    
    while (nonWords.length < params.count) {
      let word = '';
      const targetSyllables = parseInt(params.syllableCount) || 2;
      
      for (let i = 0; i < targetSyllables; i++) {
        const consonant = consonants[Math.floor(Math.random() * consonants.length)];
        const vowel = vowels[Math.floor(Math.random() * vowels.length)];
        word += consonant + vowel;
      }
      
      // Applica filtri
      if (params.startsWith && !word.startsWith(params.startsWith.toLowerCase())) continue;
      if (params.contains && !word.includes(params.contains.toLowerCase())) continue;
      
      if (!nonWords.includes(word)) {
        nonWords.push(word);
      }
    }
    
    return nonWords;
  };

  const generateMinimalPairs = (): string[] => {
    const pairs: string[] = [];
    const basePairs = [
      ['pane', 'cane'], ['sole', 'cole'], ['mare', 'care'], ['vino', 'fino'],
      ['rosa', 'cosa'], ['luce', 'duce'], ['mela', 'vela'], ['casa', 'cassa'],
      ['penna', 'panna'], ['valle', 'calle'], ['bello', 'cello'], ['ramo', 'lamo']
    ];
    
    let pairIndex = 0;
    while (pairs.length < params.count && pairIndex < basePairs.length) {
      const [word1, word2] = basePairs[pairIndex];
      
      // Applica filtri a entrambe le parole
      const word1Valid = (!params.startsWith || word1.startsWith(params.startsWith.toLowerCase())) &&
                        (!params.contains || word1.includes(params.contains.toLowerCase()));
      const word2Valid = (!params.startsWith || word2.startsWith(params.startsWith.toLowerCase())) &&
                        (!params.contains || word2.includes(params.contains.toLowerCase()));
      
      if (word1Valid && pairs.length < params.count) pairs.push(word1);
      if (word2Valid && pairs.length < params.count) pairs.push(word2);
      
      pairIndex++;
    }
    
    return pairs.slice(0, params.count);
  };

  const saveWordList = async () => {
    if (!therapistId || !listName.trim() || generatedWords.length === 0) {
      toast({
        title: "Errore",
        description: "Nome lista e parole sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('word_lists')
        .insert({
          name: listName,
          description: `Lista generata: ${params.type} (${generatedWords.length} elementi)`,
          words: generatedWords,
          created_by: therapistId
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Lista salvata",
        description: `"${listName}" è stata salvata con ${generatedWords.length} parole.`,
      });

      if (onSave) {
        onSave({ name: listName, words: generatedWords });
      }

      setListName('');
    } catch (error: any) {
      console.error('Error saving word list:', error);
      
      let errorMessage = "Impossibile salvare la lista.";
      
      if (error.message?.includes('network')) {
        errorMessage = "Errore di connessione. Controlla la rete e riprova.";
      } else if (error.message?.includes('unique')) {
        errorMessage = "Esiste già una lista con questo nome. Scegli un nome diverso.";
      } else if (error.message) {
        errorMessage = `Errore: ${error.message}`;
      }
      
      toast({
        title: "Errore di salvataggio",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    generateWords();
  }, []);

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Generatore di Parole
          </CardTitle>
          <CardDescription>
            Genera liste personalizzate per esercizi specifici
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Parametri di Generazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo di lista</Label>
                <Select value={params.type} onValueChange={(value: any) => setParams(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="words">Parole</SelectItem>
                    <SelectItem value="syllables">Sillabe</SelectItem>
                    <SelectItem value="nonwords">Non parole</SelectItem>
                    <SelectItem value="minimal-pairs">Coppie minime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Numero di elementi</Label>
                <Input
                  type="number"
                  min="5"
                  max="50"
                  value={params.count}
                  onChange={(e) => setParams(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </div>

            {params.type !== 'syllables' && (
              <div className="space-y-2">
                <Label>Numero di sillabe</Label>
                <Select value={params.syllableCount} onValueChange={(value) => setParams(prev => ({ ...prev, syllableCount: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="1">1 sillaba</SelectItem>
                    <SelectItem value="2">2 sillabe</SelectItem>
                    <SelectItem value="3">3 sillabe</SelectItem>
                    <SelectItem value="4">4 sillabe</SelectItem>
                    <SelectItem value="5">5 sillabe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inizia con...</Label>
                <Input
                  value={params.startsWith}
                  onChange={(e) => setParams(prev => ({ ...prev, startsWith: e.target.value }))}
                  placeholder="es. ca"
                />
              </div>

              <div className="space-y-2">
                <Label>Contiene</Label>
                <Input
                  value={params.contains}
                  onChange={(e) => setParams(prev => ({ ...prev, contains: e.target.value }))}
                  placeholder="es. ar"
                />
              </div>
            </div>

            <Button 
              onClick={generateWords} 
              disabled={isGenerating}
              className="w-full"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generazione...' : 'Genera Parole'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anteprima della Lista</CardTitle>
            <CardDescription>
              {generatedWords.length} elementi generati
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedWords.length > 0 ? (
              <>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {generatedWords.map((word, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>

                {therapistId && (
                  <div className="space-y-2">
                    <Label>Nome della lista</Label>
                    <Input
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      placeholder="Inserisci nome per salvare"
                    />
                    <Button 
                      onClick={saveWordList}
                      disabled={isSaving || !listName.trim()}
                      className="w-full"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Salvataggio...' : 'Salva Lista'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Clicca "Genera Parole" per creare una lista
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};