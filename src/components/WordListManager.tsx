import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Upload, Download, Plus, Trash2, BookOpen, Edit, X, RefreshCw, Save, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  WordList,
  PREDEFINED_WORD_LISTS
} from '@/types/tachistoscope';
import { supabase } from '@/integrations/supabase/client';
import { WordList as DBWordList } from '@/types/database';

interface WordListManagerProps {
  currentWordList: WordList;
  onWordListChange: (wordList: WordList) => void;
  therapistId?: string;
}

export const WordListManager: React.FC<WordListManagerProps> = ({
  currentWordList,
  onWordListChange,
  therapistId
}) => {
  const [customWords, setCustomWords] = useState('');
  const [customListName, setCustomListName] = useState('Lista personalizzata');
  const [savedWordLists, setSavedWordLists] = useState<WordList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'generator'>('generator');
  
  // Generator state
  const [generatorParams, setGeneratorParams] = useState({
    type: 'words' as 'words' | 'syllables' | 'nonwords' | 'minimal-pairs',
    syllableCount: '2-3',
    startsWith: '',
    contains: '',
    count: 10
  });
  const [generatedWords, setGeneratedWords] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { toast } = useToast();

  // Sillabe italiane comuni per il generatore
  const ITALIAN_SYLLABLES = [
    'ba', 'be', 'bi', 'bo', 'bu', 'ca', 'ce', 'ci', 'co', 'cu',
    'da', 'de', 'di', 'do', 'du', 'fa', 'fe', 'fi', 'fo', 'fu',
    'ga', 'ge', 'gi', 'go', 'gu', 'la', 'le', 'li', 'lo', 'lu',
    'ma', 'me', 'mi', 'mo', 'mu', 'na', 'ne', 'ni', 'no', 'nu',
    'pa', 'pe', 'pi', 'po', 'pu', 'ra', 're', 'ri', 'ro', 'ru',
    'sa', 'se', 'si', 'so', 'su', 'ta', 'te', 'ti', 'to', 'tu',
    'va', 've', 'vi', 'vo', 'vu', 'za', 'ze', 'zi', 'zo', 'zu'
  ];

  const ITALIAN_WORD_STEMS = [
    'cas', 'mar', 'sol', 'lun', 'vit', 'man', 'tes', 'cuo', 'amo', 'nom',
    'pac', 'mon', 'tem', 'gior', 'not', 'don', 'uom', 'fig', 'mad', 'pad',
    'fio', 'acq', 'ter', 'cie', 'alt', 'ben', 'dov', 'com', 'cos', 'mol'
  ];

  const WORD_ENDINGS = ['a', 'e', 'i', 'o', 'u', 'are', 'ere', 'ire', 'ato', 'uto', 'ito'];

  // Load saved word lists from database
  useEffect(() => {
    if (therapistId) {
      loadSavedWordLists();
    }
  }, [therapistId]);

  useEffect(() => {
    if (activeTab === 'generator') {
      generateWords();
    }
  }, [generatorParams, activeTab]);

  const generateWords = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      let words: string[] = [];
      
      switch (generatorParams.type) {
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
    }, 300);
  };

  const generateRealWords = (): string[] => {
    const words: string[] = [];
    const [minSyl, maxSyl] = generatorParams.syllableCount.split('-').map(n => parseInt(n)) || [2, 3];
    
    while (words.length < generatorParams.count) {
      const stem = ITALIAN_WORD_STEMS[Math.floor(Math.random() * ITALIAN_WORD_STEMS.length)];
      const ending = WORD_ENDINGS[Math.floor(Math.random() * WORD_ENDINGS.length)];
      let word = stem + ending;
      
      if (generatorParams.startsWith && !word.startsWith(generatorParams.startsWith.toLowerCase())) continue;
      if (generatorParams.contains && !word.includes(generatorParams.contains.toLowerCase())) continue;
      
      const syllableCount = word.match(/[aeiou]/g)?.length || 1;
      if (syllableCount < minSyl || syllableCount > maxSyl) continue;
      
      if (!words.includes(word)) {
        words.push(word);
      }
    }
    
    return words;
  };

  const generateSyllables = (): string[] => {
    const syllables: string[] = [];
    
    while (syllables.length < generatorParams.count) {
      const syllable = ITALIAN_SYLLABLES[Math.floor(Math.random() * ITALIAN_SYLLABLES.length)];
      
      if (generatorParams.startsWith && !syllable.startsWith(generatorParams.startsWith.toLowerCase())) continue;
      if (generatorParams.contains && !syllable.includes(generatorParams.contains.toLowerCase())) continue;
      
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
    
    while (nonWords.length < generatorParams.count) {
      let word = '';
      const [minSyl, maxSyl] = generatorParams.syllableCount.split('-').map(n => parseInt(n)) || [2, 3];
      const syllables = Math.floor(Math.random() * (maxSyl - minSyl + 1)) + minSyl;
      
      for (let i = 0; i < syllables; i++) {
        const consonant = consonants[Math.floor(Math.random() * consonants.length)];
        const vowel = vowels[Math.floor(Math.random() * vowels.length)];
        word += consonant + vowel;
      }
      
      if (generatorParams.startsWith && !word.startsWith(generatorParams.startsWith.toLowerCase())) continue;
      if (generatorParams.contains && !word.includes(generatorParams.contains.toLowerCase())) continue;
      
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
    while (pairs.length < generatorParams.count && pairIndex < basePairs.length) {
      const [word1, word2] = basePairs[pairIndex];
      
      const word1Valid = (!generatorParams.startsWith || word1.startsWith(generatorParams.startsWith.toLowerCase())) &&
                        (!generatorParams.contains || word1.includes(generatorParams.contains.toLowerCase()));
      const word2Valid = (!generatorParams.startsWith || word2.startsWith(generatorParams.startsWith.toLowerCase())) &&
                        (!generatorParams.contains || word2.includes(generatorParams.contains.toLowerCase()));
      
      if (word1Valid && pairs.length < generatorParams.count) pairs.push(word1);
      if (word2Valid && pairs.length < generatorParams.count) pairs.push(word2);
      
      pairIndex++;
    }
    
    return pairs.slice(0, generatorParams.count);
  };

  const loadSavedWordLists = async () => {
    if (!therapistId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('word_lists')
        .select('*')
        .eq('created_by', therapistId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const wordLists: WordList[] = data.map(dbList => ({
        id: dbList.id,
        name: dbList.name,
        description: dbList.description || `Lista personalizzata con ${dbList.words.length} parole`,
        words: dbList.words
      }));

      setSavedWordLists(wordLists);
    } catch (error) {
      console.error('Error loading word lists:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le liste salvate.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomList = async () => {
    const wordsToSave = activeTab === 'generator' ? generatedWords : 
      customWords.split(/[,\n\s]+/).map(word => word.trim()).filter(word => word.length > 0);

    if (!therapistId) {
      // For non-therapists, just create temporary list
      const tempList: WordList = {
        id: 'temp-' + Date.now(),
        name: customListName || 'Lista temporanea',
        description: `Lista ${activeTab === 'generator' ? 'generata' : 'personalizzata'} con ${wordsToSave.length} parole`,
        words: wordsToSave
      };
      onWordListChange(tempList);
      return;
    }

    if (wordsToSave.length === 0) {
      toast({
        title: "Nessuna parola",
        description: activeTab === 'generator' ? "Genera delle parole prima di salvare" : "Inserisci delle parole per creare una lista.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('word_lists')
        .insert({
          name: customListName || 'Lista personalizzata',
          description: `Lista ${activeTab === 'generator' ? 'generata' : 'personalizzata'} con ${wordsToSave.length} parole`,
          words: wordsToSave,
          created_by: therapistId
        })
        .select()
        .single();

      if (error) throw error;

      const customList: WordList = {
        id: data.id,
        name: data.name,
        description: data.description || `Lista personalizzata con ${wordsToSave.length} parole`,
        words: data.words
      };

      await loadSavedWordLists();
      onWordListChange(customList);
      
      // Clear form
      if (activeTab === 'manual') {
        setCustomWords('');
      }
      setCustomListName('Lista personalizzata');

      toast({
        title: "Lista salvata",
        description: `"${customList.name}" è stata salvata con ${wordsToSave.length} parole.`,
      });
    } catch (error) {
      console.error('Error saving word list:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la lista personalizzata.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPredefinedList = (listId: string) => {
    const list = PREDEFINED_WORD_LISTS.find(l => l.id === listId);
    if (list) {
      onWordListChange(list);
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCustomWords(content);
      setCustomListName(file.name.replace(/\.[^/.]+$/, "") || 'Imported List');
    };
    reader.readAsText(file);
  };

  const handleExportList = () => {
    if (currentWordList.words.length === 0) {
      toast({
        title: "Nessuna parola da esportare",
        description: "La lista attuale è vuota.",
        variant: "destructive",
      });
      return;
    }

    const content = currentWordList.words.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentWordList.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Lista esportata",
      description: `"${currentWordList.name}" è stata scaricata.`,
    });
  };

  const handleDeleteWordList = async (listId: string) => {
    if (!therapistId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('word_lists')
        .delete()
        .eq('id', listId)
        .eq('created_by', therapistId);

      if (error) throw error;

      // If we deleted the currently selected list, select the first predefined one
      if (currentWordList.id === listId) {
        onWordListChange(PREDEFINED_WORD_LISTS[0]);
      }

      await loadSavedWordLists();
      toast({
        title: "Lista eliminata",
        description: "La lista personalizzata è stata eliminata.",
      });
    } catch (error) {
      console.error('Error deleting word list:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la lista.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWordList = (list: WordList) => {
    setCustomWords(list.words.join('\n'));
    setCustomListName(list.name);
    setEditingList(list.id);
  };

  const handleUpdateWordList = async () => {
    if (!therapistId || !editingList) return;

    const words = customWords
      .split(/[,\n\s]+/)
      .map(word => word.trim())
      .filter(word => word.length > 0);

    if (words.length === 0) {
      toast({
        title: "Nessuna parola valida",
        description: "Inserisci parole valide per aggiornare la lista.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('word_lists')
        .update({
          name: customListName,
          description: `Lista personalizzata con ${words.length} parole`,
          words: words
        })
        .eq('id', editingList)
        .eq('created_by', therapistId)
        .select()
        .single();

      if (error) throw error;

      const updatedList: WordList = {
        id: data.id,
        name: data.name,
        description: data.description || `Lista personalizzata con ${words.length} parole`,
        words: data.words
      };

      // Update current selection if it's the edited list
      if (currentWordList.id === editingList) {
        onWordListChange(updatedList);
      }

      await loadSavedWordLists();
      
      // Clear form
      setCustomWords('');
      setCustomListName('Lista personalizzata');
      setEditingList(null);

      toast({
        title: "Lista aggiornata",
        description: `"${updatedList.name}" è stata aggiornata.`,
      });
    } catch (error) {
      console.error('Error updating word list:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la lista.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setCustomWords('');
    setCustomListName('Lista personalizzata');
    setEditingList(null);
  };

  const handleClearCustomWords = () => {
    setCustomWords('');
    setCustomListName('Lista personalizzata');
    setEditingList(null);
  };

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Gestione Liste Parole
          </CardTitle>
          <CardDescription>
            Seleziona una lista esistente o crea una personalizzata
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Selezione e Gestione Liste</CardTitle>
            <CardDescription>
              Seleziona liste salvate o genera nuove liste
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista attuale */}
            {currentWordList && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{currentWordList.name}</h4>
                  <Badge variant="outline">{currentWordList.words.length} parole</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{currentWordList.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {currentWordList.words.slice(0, 10).map((word, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {word}
                    </Badge>
                  ))}
                  {currentWordList.words.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{currentWordList.words.length - 10} altre
                    </Badge>
                  )}
                </div>
                <Button onClick={handleExportList} variant="outline" size="sm" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Esporta lista
                </Button>
              </div>
            )}

            <Separator />

            {/* Liste salvate */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Le tue liste salvate</h4>
              {savedWordLists.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna lista salvata. Crea la tua prima lista usando il generatore o inserendo parole manualmente.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedWordLists.map((list) => (
                    <div key={list.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{list.name}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">{list.words.length}</Badge>
                          <Button
                            onClick={() => onWordListChange(list)}
                            variant={currentWordList.id === list.id ? "default" : "outline"}
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            {currentWordList.id === list.id ? 'Attiva' : 'Usa'}
                          </Button>
                          <Button
                            onClick={() => handleEditWordList(list)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteWordList(list.id)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{list.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {editingList ? 'Modifica lista' : 'Crea nuova lista'}
            </CardTitle>
            <CardDescription>
              {editingList ? 'Modifica la lista esistente' : 'Genera parole automaticamente o inseriscile manualmente'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingList && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Stai modificando una lista esistente. Le modifiche saranno salvate automaticamente.
                </p>
              </div>
            )}

            {!editingList && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setActiveTab('generator')}
                  variant={activeTab === 'generator' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generatore
                </Button>
                <Button
                  onClick={() => setActiveTab('manual')}
                  variant={activeTab === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Manuale
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="list-name">Nome lista</Label>
              <Input
                id="list-name"
                type="text"
                value={customListName}
                onChange={(e) => setCustomListName(e.target.value)}
                placeholder="Inserisci nome lista"
              />
            </div>

            {(activeTab === 'generator' && !editingList) && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo di lista</Label>
                    <Select 
                      value={generatorParams.type} 
                      onValueChange={(value: any) => setGeneratorParams(prev => ({ ...prev, type: value }))}
                    >
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
                      value={generatorParams.count}
                      onChange={(e) => setGeneratorParams(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                    />
                  </div>
                </div>

                {generatorParams.type !== 'syllables' && (
                  <div className="space-y-2">
                    <Label>Numero di sillabe</Label>
                    <Select 
                      value={generatorParams.syllableCount} 
                      onValueChange={(value) => setGeneratorParams(prev => ({ ...prev, syllableCount: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        <SelectItem value="1-2">Da 1 a 2</SelectItem>
                        <SelectItem value="2-3">Da 2 a 3</SelectItem>
                        <SelectItem value="3-4">Da 3 a 4</SelectItem>
                        <SelectItem value="4-5">Da 4 a 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inizia con...</Label>
                    <Input
                      value={generatorParams.startsWith}
                      onChange={(e) => setGeneratorParams(prev => ({ ...prev, startsWith: e.target.value }))}
                      placeholder="es. ca"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contiene</Label>
                    <Input
                      value={generatorParams.contains}
                      onChange={(e) => setGeneratorParams(prev => ({ ...prev, contains: e.target.value }))}
                      placeholder="es. ar"
                    />
                  </div>
                </div>

                <Button 
                  onClick={generateWords} 
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generazione...' : 'Rigenera Parole'}
                </Button>

                {generatedWords.length > 0 && (
                  <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {generatedWords.map((word, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          {word}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'manual' || editingList) && (
              <div className="space-y-2">
                <Label htmlFor="custom-words">Parole</Label>
                <Textarea
                  id="custom-words"
                  value={customWords}
                  onChange={(e) => setCustomWords(e.target.value)}
                  placeholder="Inserisci parole separate da virgole, spazi o a capo.&#10;&#10;Esempio:&#10;gatto, cane, correre&#10;grande rosso sole&#10;cappello&#10;penna"
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Separa le parole con virgole, spazi o a capo. 
                  Conteggio attuale: {customWords.split(/[,\n\s]+/).filter(w => w.trim()).length} parole
                </p>

                <div className="space-y-2">
                  <Label>Importa da file</Label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".txt,.csv"
                      onChange={handleImportFile}
                      className="hidden"
                      id="file-import"
                    />
                    <Button 
                      onClick={() => document.getElementById('file-import')?.click()}
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Importa file
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supporta file .txt e .csv con parole separate da virgole o a capo
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {editingList ? (
                <>
                  <Button 
                    onClick={handleUpdateWordList} 
                    size="sm" 
                    disabled={!customWords.trim() || isLoading}
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Aggiornamento...' : 'Aggiorna'}
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    <X className="mr-2 h-4 w-4" />
                    Annulla
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleCreateCustomList} 
                    size="sm" 
                    disabled={isLoading || !customListName.trim() || 
                      (activeTab === 'generator' ? generatedWords.length === 0 : !customWords.trim())}
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Salvataggio...' : therapistId ? 'Salva lista' : 'Usa temporaneamente'}
                  </Button>
                  <Button 
                    onClick={handleClearCustomWords} 
                    variant="outline" 
                    size="sm"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Pulisci
                  </Button>
                </>
              )}
            </div>

            {!therapistId && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Accedi come terapeuta per salvare liste permanentemente.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};