import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, BookOpen, Edit, RefreshCw, Save, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WordList } from '@/types/tachistoscope';
import { supabase } from '@/integrations/supabase/client';
import { ExerciseSettings as ExerciseSettingsType, DEFAULT_SETTINGS } from '@/types/database';
import { sanitizeInput, sanitizeWordList } from '@/utils/passwordValidation';
import { 
  generateMinimalPairsFromDictionary,
  generateSyllables as generateSyllablesHelper,
  generateNonWords as generateNonWordsHelper
} from './WordListManager/wordGenerators';
import {
  prepareFormData,
  generateDescriptionText,
  validateWordList,
  createTempWordList,
  clearForm
} from './WordListManager/formHelpers';
import {
  filterWordsBySyllables,
  shuffleAndLimit,
  selectWordSource,
  GeneratorParams
} from './WordListManager/generatorHelpers';
import { WordListItem } from './WordListManager/WordListItem';
import { ExerciseSettings } from './WordListManager/ExerciseSettings';
import { GeneratorTab } from './WordListManager/GeneratorTab';
import { getWordListUpdateErrorMessage } from '@/utils/errorHandling';

// Import the complete Italian word dataset
import wordDatasetUrl from '@/data/parole_italiane_complete.txt?url';
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
  const [customListName, setCustomListName] = useState('Nuovo esercizio');
  const [savedWordLists, setSavedWordLists] = useState<WordList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'generator'>('generator');

  // Generator state
  const [generatorParams, setGeneratorParams] = useState<GeneratorParams>({
    type: 'words',
    syllableCount: '2',
    startsWith: '',
    contains: '',
    count: 10
  });
  const [generatedWords, setGeneratedWords] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Exercise settings state - Impostazioni ottimizzate per logopedia/dislessia
  const [exerciseSettings, setExerciseSettings] = useState<ExerciseSettingsType>({
    exposureDuration: 150,
    // 150ms: ottimale per dislessia
    intervalDuration: 800,
    // 800ms: permette elaborazione
    textCase: 'original' as const,
    useMask: false,
    maskDuration: 100,
    // 100ms: breve per non interferire
    fontSize: 'large' as const
  });

  // Function to generate description from settings
  const generateDescriptionFromSettings = (wordCount: number, settings: ExerciseSettingsType) => {
    return `${wordCount} parole • Esp: ${settings.exposureDuration}ms • Int: ${settings.intervalDuration}ms${settings.useMask ? ` • Maschera: ${settings.maskDuration}ms` : ''}`;
  };

  // State for complete Italian words dataset
  const [allWords, setAllWords] = useState<string[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const { toast } = useToast();

  // Handle file import
  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('text') && !file.name.endsWith('.txt')) {
      toast({
        title: "Formato file non supportato",
        description: "Puoi importare solo file di testo (.txt)",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const words = content
          .split(/\r?\n/)
          .map(word => word.trim())
          .filter(word => word.length > 0);

        if (words.length === 0) {
          toast({
            title: "File vuoto",
            description: "Il file non contiene parole valide",
            variant: "destructive"
          });
          return;
        }

        setCustomWords(words.join('\n'));
        setActiveTab('manual');
        toast({
          title: "File importato",
          description: `Importate ${words.length} parole con successo`
        });
      } catch (error) {
        toast({
          title: "Errore nell'importazione",
          description: "Impossibile leggere il file",
          variant: "destructive"
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "Errore nella lettura",
        description: "Impossibile leggere il file",
        variant: "destructive"
      });
    };

    reader.readAsText(file);
    // Reset input per permettere di importare lo stesso file di nuovo
    event.target.value = '';
  }, [toast]);

  const ITALIAN_WORDS = [
  // Parole di 1 sillaba
  'blu', 'tre', 'sei', 'qui', 'qua', 'poi', 'per', 'fra', 'tra', 'pro', 'pre', 'sub', 'sud', 'nord', 'est', 'ovest', 'su', 'giù', 'più', 'già', 'mai', 'qui', 'là', 'sì', 'no',
  // Parole di 2 sillabe
  'casa', 'mare', 'sole', 'luna', 'vita', 'mano', 'testa', 'cuore', 'nome', 'pace', 'mondo', 'tempo', 'giorno', 'notte', 'donna', 'uomo', 'madre', 'padre', 'figlio', 'figlia', 'fiore', 'acqua', 'terra', 'cielo', 'libro', 'tavolo', 'sedia', 'porta', 'finestra', 'strada', 'scuola', 'amico', 'cane', 'gatto', 'uccello', 'pesce', 'albero', 'erba', 'bello', 'grande', 'piccolo', 'rosso', 'verde', 'giallo', 'nero', 'bianco', 'nuovo', 'vecchio', 'buono', 'cattivo', 'alto', 'basso', 'lungo', 'corto', 'caldo', 'freddo', 'dolce', 'amaro', 'salato', 'aspro', 'forte', 'debole', 'veloce', 'lento', 'facile', 'difficile', 'aperto', 'chiuso', 'pieno', 'vuoto', 'ricco', 'povero', 'felice', 'triste', 'giovane', 'anziano', 'magro', 'grasso', 'pulito', 'sporco', 'piano', 'forte', 'primo', 'ultimo', 'dentro', 'fuori', 'sopra', 'sotto', 'davanti', 'dietro', 'destra', 'sinistra', 'centro', 'lato', 'parte', 'tutto', 'niente', 'molto', 'poco', 'tanto', 'quanto', 'come', 'dove', 'quando', 'perché', 'cosa', 'chi', 'quale', 'quale', 'altro', 'stesso', 'vero', 'falso', 'giusto', 'sbagliato', 'bene', 'male', 'sempre', 'mai', 'spesso', 'oggi', 'ieri', 'domani', 'ora', 'dopo', 'prima', 'presto', 'tardi', 'subito', 'piano', 'festa', 'regalo', 'gioco', 'sport', 'musica', 'danza', 'teatro', 'cinema', 'museo', 'parco', 'ponte', 'torre', 'chiesa', 'palazzo', 'castello', 'villa', 'giardino', 'campo', 'bosco', 'lago', 'fiume', 'monte', 'valle', 'isola', 'costa', 'spiaggia', 'sabbia', 'roccia', 'pietra', 'ferro', 'oro', 'argento', 'rame', 'legno', 'vetro', 'carta', 'stoffa', 'lana', 'seta', 'cotone', 'pane', 'pasta', 'riso', 'carne', 'pesce', 'uovo', 'latte', 'burro', 'olio', 'sale', 'zucchero', 'miele', 'vino', 'birra', 'caffè', 'tè', 'succo', 'frutta', 'verdura', 'pollo', 'manzo', 'maiale', 'agnello', 'prosciutto', 'salame', 'formaggio', 'gelato', 'torta', 'dolce', 'biscotto',
  // Parole di 3 sillabe
  'famiglia', 'bambino', 'bambina', 'ragazzo', 'ragazza', 'persona', 'gente', 'amicizia', 'amore', 'matrimonio', 'macchina', 'autobus', 'treno', 'aereo', 'barca', 'bicicletta', 'motorino', 'camion', 'taxi', 'pullman', 'telefono', 'computer', 'televisore', 'radio', 'giornale', 'rivista', 'dizionario', 'quaderno', 'matita', 'penna', 'medicina', 'dottore', 'infermiere', 'paziente', 'malattia', 'febbre', 'dolore', 'raffreddore', 'tosse', 'influenza', 'ospedale', 'farmacia', 'clinica', 'ambulanza', 'pronto soccorso', 'dentista', 'oculista', 'pediatra', 'chirurgo', 'medico', 'università', 'professore', 'studente', 'esame', 'diploma', 'laurea', 'lezione', 'compito', 'voto', 'pagella', 'ristorante', 'pizzeria', 'trattoria', 'osteria', 'taverna', 'bar', 'caffetteria', 'gelateria', 'pasticceria', 'panetteria', 'frigorifero', 'lavastoviglie', 'lavatrice', 'asciugatrice', 'aspirapolvere', 'forno', 'microonde', 'tostapane', 'frullatore', 'mixer', 'calendario', 'orologio', 'sveglia', 'agenda', 'diario', 'lettera', 'pacchetto', 'busta', 'francobollo', 'posta', 'biblioteca', 'libreria', 'cartoleria', 'edicola', 'supermercato', 'negozio', 'mercato', 'centro', 'periferia', 'quartiere', 'montagna', 'collina', 'pianura', 'deserto', 'oceano', 'continente', 'nazione', 'regione', 'provincia', 'comune', 'capitale', 'città', 'paese', 'villaggio', 'frazione', 'borgata', 'sobborgo', 'centro', 'periferia', 'zona', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica', 'mattina', 'pomeriggio', 'sera', 'notte', 'mezzogiorno', 'mezzanotte', 'aurora', 'tramonto', 'alba', 'crepuscolo', 'buio', 'animale', 'mammifero', 'uccello', 'pesce', 'rettile', 'insetto', 'farfalla', 'ape', 'mosca', 'zanzara', 'cavallo', 'mucca', 'pecora', 'capra', 'maiale', 'gallina', 'anatra', 'tacchino', 'coniglio', 'criceto', 'tigre', 'leone', 'elefante', 'giraffa', 'zebra', 'scimmia', 'orso', 'lupo', 'volpe', 'cervo',
  // Parole di 4+ sillabe  
  'automobile', 'metropolitana', 'motocicletta', 'elicottero', 'sottomarino', 'astronave', 'automobile', 'locomotiva', 'funicolare', 'seggiovia', 'televisione', 'videocamera', 'registratore', 'altoparlante', 'microfono', 'amplificatore', 'sintetizzatore', 'pianoforte', 'chitarra', 'violino', 'ospedaliero', 'universitario', 'elementare', 'superiore', 'professionale', 'tecnico', 'scientifico', 'letterario', 'artistico', 'musicale', 'ristoratore', 'pasticciere', 'panettiere', 'macellaio', 'pescivendolo', 'fruttivendolo', 'verduraio', 'salumiere', 'farmacista', 'benzina', 'supermercato', 'ipermercato', 'minimarket', 'tabaccheria', 'erboristeria', 'profumeria', 'gioielleria', 'orologeria', 'ottica', 'ferramenta', 'parrucchiere', 'estetista', 'massaggiatore', 'fisioterapista', 'psicologo', 'avvocato', 'notaio', 'commercialista', 'ingegnere', 'architetto', 'matematica', 'geometria', 'algebra', 'aritmetica', 'statistica', 'informatica', 'biologia', 'chimica', 'fisica', 'geografia', 'meteorologia', 'astronomia', 'geologia', 'archeologia', 'antropologia', 'sociologia', 'psicologia', 'filosofia', 'teologia', 'letteratura'];

  // Load the complete Italian words dataset
  const loadWordsDataset = async () => {
    if (allWords.length > 0) return; // Already loaded

    setIsLoadingWords(true);
    try {
      const response = await fetch(wordDatasetUrl);
      const text = await response.text();
      const words = text.split('\n').filter(word => word.trim().length > 0);
      setAllWords(words);
      // Dataset caricato silenziosamente
    } catch (error) {
      console.error('Error loading words dataset:', error);
      toast({
        title: "Errore di caricamento",
        description: "Impossibile caricare il dataset delle parole italiane. Controlla la connessione internet.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingWords(false);
    }
  };

  const loadWordsDatasetCallback = useCallback(() => {
    loadWordsDataset();
  }, []);

  // Load dataset on component mount
  useEffect(() => {
    loadWordsDatasetCallback();
  }, [loadWordsDatasetCallback]);

  // Separated function without useCallback to avoid infinite loops
  const performWordGeneration = async () => {
    if (activeTab !== 'generator') return;
    setIsGenerating(true);

    // Piccolo delay per permettere al UI di aggiornare
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      // Load dataset if not already loaded and we're generating real words
      if (generatorParams.type === 'words' && allWords.length === 0) {
        await loadWordsDataset();
      }

      // Genera parole in modo asincrono per non bloccare l'UI
      const words = await new Promise<string[]>(resolve => {
        setTimeout(() => {
          let result: string[] = [];
          switch (generatorParams.type) {
            case 'words':
              result = generateRealWords();
              break;
            case 'syllables':
              result = generateSyllables();
              break;
            case 'nonwords':
              result = generateNonWords();
              break;
            case 'minimal-pairs':
              result = generateMinimalPairs();
              break;
          }
          resolve(result);
        }, 10);
      });
      setGeneratedWords(words);
    } catch (error) {
      console.error('Error generating words:', error);
      setGeneratedWords([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadSavedWordListsCallback = useCallback(() => {
    if (therapistId) {
      loadSavedWordLists();
    }
  }, [therapistId]);

  // Load saved word lists from database
  useEffect(() => {
    loadSavedWordListsCallback();
  }, [loadSavedWordListsCallback]);

  const performWordGenerationCallback = useCallback(() => {
    if (activeTab !== 'generator') return;
    const timeoutId = setTimeout(() => {
      performWordGeneration();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [activeTab, generatorParams.type, generatorParams.syllableCount, generatorParams.startsWith, generatorParams.contains, generatorParams.count]);

  // Effect automatico per generazione con debounce appropriato
  useEffect(() => {
    return performWordGenerationCallback();
  }, [performWordGenerationCallback]);

  const generateRealWords = (): string[] => {
    const wordsToUse = selectWordSource(allWords, ITALIAN_WORDS);
    const syllables = parseInt(generatorParams.syllableCount) || 2;

    const candidateWords = filterWordsBySyllables(wordsToUse, syllables, {
      startsWith: generatorParams.startsWith,
      contains: generatorParams.contains
    });

    return shuffleAndLimit(candidateWords, generatorParams.count);
  };

  const generateSyllables = (): string[] => {
    return generateSyllablesHelper({
      startsWith: generatorParams.startsWith,
      contains: generatorParams.contains,
      count: generatorParams.count
    });
  };

  const generateNonWords = (): string[] => {
    return generateNonWordsHelper({
      syllableCount: parseInt(generatorParams.syllableCount) || 2,
      startsWith: generatorParams.startsWith,
      contains: generatorParams.contains,
      count: generatorParams.count
    });
  };

  const generateMinimalPairs = (): string[] => {
    const syllables = parseInt(generatorParams.syllableCount) || 2;
    return generateMinimalPairsFromDictionary({
      syllableCount: syllables,
      startsWith: generatorParams.startsWith,
      contains: generatorParams.contains,
      count: generatorParams.count
    });
  };
  const loadSavedWordLists = async () => {
    if (!therapistId) return;
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('word_lists').select('*').eq('created_by', therapistId).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      const wordLists: WordList[] = data.map(dbList => {
        const settings = dbList.settings as unknown as ExerciseSettingsType || DEFAULT_SETTINGS;
        return {
          id: dbList.id,
          name: dbList.name,
          description: generateDescriptionFromSettings(dbList.words.length, settings),
          words: dbList.words
        };
      });
      setSavedWordLists(wordLists);
    } catch (error) {
      console.error('Error loading word lists:', error);
      toast({
        title: "Errore di caricamento",
        description: "Impossibile caricare le liste salvate dal database. Riprova più tardi.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCreateCustomList = async () => {
    const formData = prepareFormData(
      customListName,
      generatedWords,
      customWords,
      activeTab,
      exerciseSettings
    );

    const validation = validateWordList(formData.words);
    if (!validation.isValid) {
      toast({
        title: "Errore",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    if (!therapistId) {
      const tempList = createTempWordList(formData, activeTab);
      onWordListChange(tempList);
      return;
    }

    setIsLoading(true);
    try {
      const descriptionText = generateDescriptionText(formData.words.length, formData.settings);
      
      const { data, error } = await supabase
        .from('word_lists')
        .insert({
          name: formData.listName,
          description: descriptionText,
          words: formData.words,
          created_by: therapistId
        })
        .select()
        .single();

      if (error) throw error;

      const customList: WordList = {
        id: data.id,
        name: data.name,
        description: data.description || descriptionText,
        words: data.words
      };

      await loadSavedWordLists();
      onWordListChange(customList);
      clearForm(activeTab, setCustomWords, setCustomListName);
    } catch (error) {
      console.error('Error saving word list:', error);
      toast({
        title: "Errore di salvataggio",
        description: "Impossibile salvare la lista nel database. Verifica la connessione e riprova.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleExportList = () => {
    if (currentWordList.words.length === 0) {
      toast({
        title: "Nessuna parola da esportare",
        description: "La lista attuale è vuota.",
        variant: "destructive"
      });
      return;
    }
    const content = currentWordList.words.join('\n');
    const blob = new Blob([content], {
      type: 'text/plain'
    });
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
      description: `"${currentWordList.name}" è stata scaricata.`
    });
  };
  const handleDeleteWordList = async (listId: string) => {
    if (!therapistId) return;
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.from('word_lists').delete().eq('id', listId).eq('created_by', therapistId);
      if (error) throw error;

      // If we deleted the currently selected list, reset to empty
      if (currentWordList.id === listId) {
        onWordListChange({
          id: 'empty',
          name: 'Nessuna lista',
          words: [],
          description: ''
        });
      }
      await loadSavedWordLists();
    } catch (error) {
      console.error('Error deleting word list:', error);
      const err = error as { code?: string; message?: string };
      let errorMessage = "Impossibile eliminare la lista.";

      if (err.code === '23503') {
        errorMessage = "Impossibile eliminare la lista perché è utilizzata in esercizi attivi. Per procedere, rimuovi prima gli esercizi dalla sezione Gestione Pazienti.";
      } else if (err.code === 'PGRST116') {
        errorMessage = "Lista non trovata o non hai i permessi per eliminarla.";
      } else if (err.message?.includes('network')) {
        errorMessage = "Errore di connessione. Controlla la rete e riprova.";
      } else if (err.message) {
        errorMessage = `Errore durante l'eliminazione: ${err.message}`;
      }
      toast({
        title: "Errore di eliminazione",
        description: errorMessage,
        variant: "destructive"
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
    
    // Sanitize input data
    const sanitizedListName = sanitizeInput(customListName, 100);
    const rawWords = customWords.split(/[,\n]+/).map(word => word.trim()).filter(word => word.length > 0);
    const words = sanitizeWordList(rawWords);
    
    if (words.length === 0) {
      toast({
        title: "Nessuna parola valida",
        description: "Inserisci parole valide per aggiornare la lista.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('word_lists').update({
        name: sanitizedListName,
        description: `${words.length} parole • Esp: ${exerciseSettings.exposureDuration}ms • Int: ${exerciseSettings.intervalDuration}ms${exerciseSettings.useMask ? ` • Maschera: ${exerciseSettings.maskDuration}ms` : ''}`,
        words: words,
        settings: exerciseSettings as any
      }).eq('id', editingList).eq('created_by', therapistId).select().single();
      if (error) throw error;
      const updatedList: WordList = {
        id: data.id,
        name: data.name,
        description: data.description || `${words.length} parole • Esp: ${exerciseSettings.exposureDuration}ms • Int: ${exerciseSettings.intervalDuration}ms${exerciseSettings.useMask ? ` • Maschera: ${exerciseSettings.maskDuration}ms` : ''}`,
        words: data.words
      };

      // Update current selection if it's the edited list
      if (currentWordList.id === editingList) {
        onWordListChange(updatedList);
      }
      await loadSavedWordLists();

      // Clear form
      setCustomWords('');
      setCustomListName('Nuovo esercizio');
      setEditingList(null);
      toast({
        title: "Esercizio aggiornato",
        description: `"${updatedList.name}" è stato aggiornato.`
      });
    } catch (error: unknown) {
      console.error('Error updating word list:', error);
      const errorMessage = getWordListUpdateErrorMessage(error);
      toast({
        title: "Errore di modifica",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancelEdit = () => {
    setCustomWords('');
    setCustomListName('Nuovo esercizio');
    setEditingList(null);
  };
  const handleClearCustomWords = () => {
    setCustomWords('');
    setCustomListName('Nuovo esercizio');
    setEditingList(null);
    setGeneratedWords([]);
    setGeneratorParams({
      type: 'words',
      syllableCount: '2',
      startsWith: '',
      contains: '',
      count: 10
    });
    setExerciseSettings({
      exposureDuration: 150,
      intervalDuration: 800,
      textCase: 'original' as const,
      useMask: false,
      maskDuration: 200, // Consistent with DEFAULT_SETTINGS
      fontSize: 'large' as const
    });
    toast({
      title: "Form pulito",
      description: "Il form è stato resettato."
    });
  };
  return <div className="space-y-6">
      {/* Header Card - Compatto */}
      

      {/* Layout a 3 colonne per meglio bilanciare */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Colonna 1: Esercizi Salvati */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Esercizi salvati</CardTitle>
            <CardDescription>Clicca su un esercizio per modificarlo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
            {savedWordLists.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Nessun esercizio</p>
                <p className="text-xs">Crea il tuo primo esercizio</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                {savedWordLists.map((list) => (
                  <WordListItem
                    key={list.id}
                    list={list}
                    isEditing={editingList === list.id}
                    exerciseSettings={exerciseSettings}
                    onEdit={handleEditWordList}
                    onDelete={handleDeleteWordList}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colonna 2: Creazione Nuovo Esercizio */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingList ? 'Modifica esercizio' : 'Crea nuovo esercizio'}
            </CardTitle>
            <CardDescription>
              {editingList ? 'Modifica l\'esercizio esistente' : 'Genera automaticamente o inserisci manualmente'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Nome esercizio sempre visibile */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome esercizio</Label>
              <Input placeholder="Nuovo esercizio" value={customListName} onChange={e => setCustomListName(e.target.value)} className="h-9" />
            </div>

            {/* Tabs compatte per Generator vs Manual (solo se non in editing) */}
            {!editingList && <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setActiveTab('generator')} className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'generator' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  <Wand2 className="h-4 w-4 inline mr-2" />
                  Generatore
                </button>
                <button onClick={() => setActiveTab('manual')} className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  <Edit className="h-4 w-4 inline mr-2" />
                  Manuale
                </button>
              </div>}

            {/* Contenuto Generator */}
            {activeTab === 'generator' && !editingList && (
              <GeneratorTab
                generatorParams={generatorParams}
                generatedWords={generatedWords}
                isGenerating={isGenerating}
                onParamsChange={setGeneratorParams}
                onRegenerate={performWordGeneration}
              />
            )}

            {/* Contenuto Manual */}
            {(activeTab === 'manual' || editingList) && <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Parole o frasi (separate da virgola o a capo)</Label>
                  <Textarea placeholder="aprile, piccolo, dove, palazzo&#10;maggio verde collina&#10;la casa è bella&#10;regalo, pianura, marzo" value={customWords} onChange={e => setCustomWords(e.target.value)} rows={6} className="mt-1 font-mono text-sm" />
                  <p className="text-xs text-gray-500 mt-1">
                    {customWords.split(/[,\n]+/).filter(w => w.trim()).length} elementi
                  </p>
                </div>
                
              </div>}

            {/* Impostazioni Esercizio - Ridotte e raggruppate */}
            <ExerciseSettings
              settings={exerciseSettings}
              onSettingsChange={setExerciseSettings}
            />

            {/* Bottoni azione */}
            <div className="flex gap-2 pt-2">
              {editingList ? <>
                  <Button onClick={handleUpdateWordList} disabled={!customWords.trim() || isLoading} className="flex-1">
                    {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {isLoading ? 'Aggiornamento...' : 'Aggiorna'}
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline">
                    Annulla
                  </Button>
                </> : <>
                  <Button onClick={handleCreateCustomList} disabled={isLoading || !customListName.trim() || (activeTab === 'generator' ? generatedWords.length === 0 : !customWords.trim())} className="flex-1">
                    {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {isLoading ? 'Salvataggio...' : 'Aggiungi esercizio'}
                  </Button>
                  <Button onClick={() => document.getElementById('file-import')?.click()} variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Importa
                  </Button>
                  <input
                    id="file-import"
                    type="file"
                    accept=".txt,text/plain"
                    onChange={handleFileImport}
                    style={{ display: 'none' }}
                  />
                </>}
            </div>

            {!therapistId && <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                Accedi come terapeuta per salvare permanentemente.
              </p>}
          </CardContent>
        </Card>
      </div>
    </div>;
};