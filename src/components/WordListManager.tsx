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
  WordList
 } from '@/types/tachistoscope';
import { supabase } from '@/integrations/supabase/client';
import { WordList as DBWordList, ExerciseSettings, DEFAULT_SETTINGS } from '@/types/database';

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
  const [generatorParams, setGeneratorParams] = useState({
    type: 'words' as 'words' | 'syllables' | 'nonwords' | 'minimal-pairs',
    syllableCount: '2',
    startsWith: '',
    contains: '',
    count: 10
  });
  const [generatedWords, setGeneratedWords] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Exercise settings state - Impostazioni ottimizzate per logopedia/dislessia
  const [exerciseSettings, setExerciseSettings] = useState<ExerciseSettings>({
    exposureDuration: 150,    // 150ms: ottimale per dislessia
    intervalDuration: 800,    // 800ms: permette elaborazione
    textCase: 'original' as const,
    useMask: false,
    maskDuration: 100,        // 100ms: breve per non interferire
    fontSize: 'large' as const
  });
  
  // State for complete Italian words dataset
  const [allWords, setAllWords] = useState<string[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  
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

  const ITALIAN_WORDS = [
    // Parole di 1 sillaba
    'blu', 'tre', 'sei', 'qui', 'qua', 'poi', 'per', 'fra', 'tra', 'pro', 'pre', 'sub', 'sud',
    'nord', 'est', 'ovest', 'su', 'giù', 'più', 'già', 'mai', 'qui', 'là', 'sì', 'no',
    
    // Parole di 2 sillabe
    'casa', 'mare', 'sole', 'luna', 'vita', 'mano', 'testa', 'cuore', 'nome', 'pace',
    'mondo', 'tempo', 'giorno', 'notte', 'donna', 'uomo', 'madre', 'padre', 'figlio', 'figlia',
    'fiore', 'acqua', 'terra', 'cielo', 'libro', 'tavolo', 'sedia', 'porta', 'finestra', 'strada',
    'scuola', 'amico', 'cane', 'gatto', 'uccello', 'pesce', 'albero', 'erba', 'bello', 'grande',
    'piccolo', 'rosso', 'verde', 'giallo', 'nero', 'bianco', 'nuovo', 'vecchio', 'buono', 'cattivo',
    'alto', 'basso', 'lungo', 'corto', 'caldo', 'freddo', 'dolce', 'amaro', 'salato', 'aspro',
    'forte', 'debole', 'veloce', 'lento', 'facile', 'difficile', 'aperto', 'chiuso', 'pieno', 'vuoto',
    'ricco', 'povero', 'felice', 'triste', 'giovane', 'anziano', 'magro', 'grasso', 'pulito', 'sporco',
    'piano', 'forte', 'primo', 'ultimo', 'dentro', 'fuori', 'sopra', 'sotto', 'davanti', 'dietro',
    'destra', 'sinistra', 'centro', 'lato', 'parte', 'tutto', 'niente', 'molto', 'poco', 'tanto',
    'quanto', 'come', 'dove', 'quando', 'perché', 'cosa', 'chi', 'quale', 'quale', 'altro',
    'stesso', 'vero', 'falso', 'giusto', 'sbagliato', 'bene', 'male', 'sempre', 'mai', 'spesso',
    'oggi', 'ieri', 'domani', 'ora', 'dopo', 'prima', 'presto', 'tardi', 'subito', 'piano',
    'festa', 'regalo', 'gioco', 'sport', 'musica', 'danza', 'teatro', 'cinema', 'museo', 'parco',
    'ponte', 'torre', 'chiesa', 'palazzo', 'castello', 'villa', 'giardino', 'campo', 'bosco', 'lago',
    'fiume', 'monte', 'valle', 'isola', 'costa', 'spiaggia', 'sabbia', 'roccia', 'pietra', 'ferro',
    'oro', 'argento', 'rame', 'legno', 'vetro', 'carta', 'stoffa', 'lana', 'seta', 'cotone',
    'pane', 'pasta', 'riso', 'carne', 'pesce', 'uovo', 'latte', 'burro', 'olio', 'sale',
    'zucchero', 'miele', 'vino', 'birra', 'caffè', 'tè', 'succo', 'frutta', 'verdura', 'pollo',
    'manzo', 'maiale', 'agnello', 'prosciutto', 'salame', 'formaggio', 'gelato', 'torta', 'dolce', 'biscotto',
    
    // Parole di 3 sillabe
    'famiglia', 'bambino', 'bambina', 'ragazzo', 'ragazza', 'persona', 'gente', 'amicizia', 'amore', 'matrimonio',
    'macchina', 'autobus', 'treno', 'aereo', 'barca', 'bicicletta', 'motorino', 'camion', 'taxi', 'pullman',
    'telefono', 'computer', 'televisore', 'radio', 'giornale', 'rivista', 'dizionario', 'quaderno', 'matita', 'penna',
    'medicina', 'dottore', 'infermiere', 'paziente', 'malattia', 'febbre', 'dolore', 'raffreddore', 'tosse', 'influenza',
    'ospedale', 'farmacia', 'clinica', 'ambulanza', 'pronto soccorso', 'dentista', 'oculista', 'pediatra', 'chirurgo', 'medico',
    'università', 'professore', 'studente', 'esame', 'diploma', 'laurea', 'lezione', 'compito', 'voto', 'pagella',
    'ristorante', 'pizzeria', 'trattoria', 'osteria', 'taverna', 'bar', 'caffetteria', 'gelateria', 'pasticceria', 'panetteria',
    'frigorifero', 'lavastoviglie', 'lavatrice', 'asciugatrice', 'aspirapolvere', 'forno', 'microonde', 'tostapane', 'frullatore', 'mixer',
    'calendario', 'orologio', 'sveglia', 'agenda', 'diario', 'lettera', 'pacchetto', 'busta', 'francobollo', 'posta',
    'biblioteca', 'libreria', 'cartoleria', 'edicola', 'supermercato', 'negozio', 'mercato', 'centro', 'periferia', 'quartiere',
    'montagna', 'collina', 'pianura', 'deserto', 'oceano', 'continente', 'nazione', 'regione', 'provincia', 'comune',
    'capitale', 'città', 'paese', 'villaggio', 'frazione', 'borgata', 'sobborgo', 'centro', 'periferia', 'zona',
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre',
    'novembre', 'dicembre', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica', 'mattina',
    'pomeriggio', 'sera', 'notte', 'mezzogiorno', 'mezzanotte', 'aurora', 'tramonto', 'alba', 'crepuscolo', 'buio',
    'animale', 'mammifero', 'uccello', 'pesce', 'rettile', 'insetto', 'farfalla', 'ape', 'mosca', 'zanzara',
    'cavallo', 'mucca', 'pecora', 'capra', 'maiale', 'gallina', 'anatra', 'tacchino', 'coniglio', 'criceto',
    'tigre', 'leone', 'elefante', 'giraffa', 'zebra', 'scimmia', 'orso', 'lupo', 'volpe', 'cervo',
    
    // Parole di 4+ sillabe  
    'automobile', 'metropolitana', 'motocicletta', 'elicottero', 'sottomarino', 'astronave', 'automobile', 'locomotiva', 'funicolare', 'seggiovia',
    'televisione', 'videocamera', 'registratore', 'altoparlante', 'microfono', 'amplificatore', 'sintetizzatore', 'pianoforte', 'chitarra', 'violino',
    'ospedaliero', 'universitario', 'elementare', 'superiore', 'professionale', 'tecnico', 'scientifico', 'letterario', 'artistico', 'musicale',
    'ristoratore', 'pasticciere', 'panettiere', 'macellaio', 'pescivendolo', 'fruttivendolo', 'verduraio', 'salumiere', 'farmacista', 'benzina',
    'supermercato', 'ipermercato', 'minimarket', 'tabaccheria', 'erboristeria', 'profumeria', 'gioielleria', 'orologeria', 'ottica', 'ferramenta',
    'parrucchiere', 'estetista', 'massaggiatore', 'fisioterapista', 'psicologo', 'avvocato', 'notaio', 'commercialista', 'ingegnere', 'architetto',
    'matematica', 'geometria', 'algebra', 'aritmetica', 'statistica', 'informatica', 'biologia', 'chimica', 'fisica', 'geografia',
    'meteorologia', 'astronomia', 'geologia', 'archeologia', 'antropologia', 'sociologia', 'psicologia', 'filosofia', 'teologia', 'letteratura'
  ];

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

  // Load saved word lists from database
  useEffect(() => {
    if (therapistId) {
      loadSavedWordLists();
    }
  }, [therapistId]);

  // Effect automatico per tutte le modifiche del form generatore, ma non per cambio sezione
  useEffect(() => {
    if (activeTab !== 'generator') return;
    
    // Debounce la generazione per evitare chiamate multiple rapide
    const timeoutId = setTimeout(() => {
      generateWords();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [generatorParams]); // Tutti i parametri del generatore

  // Load dataset on component mount
  useEffect(() => {
    loadWordsDataset();
  }, []);

  const generateWords = async () => {
    setIsGenerating(true);
    
    // Load dataset if not already loaded and we're generating real words
    if (generatorParams.type === 'words' && allWords.length === 0) {
      await loadWordsDataset();
    }
    
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

  // Function to count syllables in Italian words (improved)
  const countSyllables = (word: string): number => {
    if (!word) return 0;
    
    // Convert to lowercase and remove accents for better processing
    const cleanWord = word.toLowerCase()
      .replace(/[àáâãä]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u');
    
    // Remove non-alphabetic characters
    const letters = cleanWord.replace(/[^a-z]/g, '');
    
    if (letters.length === 0) return 0;
    if (letters.length <= 2) return 1;
    
    // Simple vowel counting approach - more reliable for Italian
    const vowels = letters.match(/[aeiou]/g);
    if (!vowels) return 1;
    
    let syllables = vowels.length;
    
    // Adjust for common diphthongs that should count as one syllable
    // But only when they are truly together in pronunciation
    const diphthongs = [
      'ia', 'ie', 'io', 'iu',  // i + vowel
      'ua', 'ue', 'ui', 'uo',  // u + vowel  
      'ai', 'au', 'ei', 'eu', 'oi', 'ou'  // vowel + i/u
    ];
    
    for (const diphthong of diphthongs) {
      const regex = new RegExp(diphthong, 'g');
      const matches = letters.match(regex);
      if (matches) {
        // Each diphthong reduces syllable count by 1 (since we counted 2 vowels but it's 1 syllable)
        syllables -= matches.length;
      }
    }
    
    // Special cases for common Italian patterns
    // Words ending in -zione, -sione should have the correct count
    if (letters.match(/(zione|sione)$/)) {
      syllables += 1; // These endings add complexity
    }
    
    // Minimum of 1 syllable
    return Math.max(1, syllables);
  };

  const generateRealWords = (): string[] => {
    // Use complete dataset
    const wordsToUse = allWords.length > 0 ? allWords : ITALIAN_WORDS;
    const syllables = parseInt(generatorParams.syllableCount) || 2;
    
    // Filter words based on criteria
    const filteredWords = wordsToUse.filter(word => {
      // Filter inappropriate words first
      const inappropriateWords = new Set([
        'pene', 'ano', 'culo', 'merda', 'cacca', 'pipi', 'popo',
        'stupido', 'idiota', 'cretino', 'scemo', 'deficiente',
        'stronzo', 'troia', 'puttana', 'figa', 'fica', 'vaffanculo',
        'cazzo', 'fottiti', 'inculare', 'mignotta', 'bastardo',
        'bastardissimo', 'zoccola', 'cornuto', 'coglione',
        'stronza', 'cogliona', 'rompipalle', 'mado', 'puttanella',
        'fichetto', 'pischello', 'pischella', 'merdoso', 'babbeo',
        'imbecille', 'scassacazzo', 'baldracca', 'cagna', 'ficco',
        'troione', 'bastardone', 'ficcona', 'puzzone', 'zzozzo',
        'caccone', 'pennuto', 'pezzente', 'zingaro', 'paccottiglia',
        'lurido', 'ciuccio', 'schifoso', 'brutto', 'schifo', 'lurida',
        'str*nza', 'schifosa', 'cafone', 'duro', 'cretina', 'cornuta',
        'mignotta', 'ficaginosa', 'pippone', 'pirla', 'babbuino',
        'merdone', 'zoccola', 'frocione', 'checca', 'frocio', 'omosessuale',
        'froci', 'patacca', 'minkia', 'minkione', 'scemoide',
        'fesso', 'troione', 'tamarro', 'ubriacone', 'cogliona',
        'merdaccia', 'scemi', 'scemotti', 'frocetto', 'swaghetto',
        'sfigato', 'zigomo', 'vaffangulo', 'puttanella', 'vaffanculo',
        'strunz', 'ricchione', 'stronza', 'piscio', 'pisciare', 'pisciatoio',
        'ricchioni', 'schifosa', 'puzzone', 'cazzone', 'affanculo',
        'porco', 'maiale', 'bischero', 'cafone', 'stregone', 'marcio',
        'cornetta', 'zoccoletta', 'minkietta', 'culattone', 'frocetto',
        'culone', 'straccione', 'negro'
      ]);
      
      if (inappropriateWords.has(word.toLowerCase())) return false;
      
      // Check basic filters
      if (generatorParams.startsWith && !word.toLowerCase().startsWith(generatorParams.startsWith.toLowerCase())) return false;
      if (generatorParams.contains && !word.toLowerCase().includes(generatorParams.contains.toLowerCase())) return false;

      // Count syllables accurately
      const syllableCount = countSyllables(word);
      if (syllableCount !== syllables) return false;

      return true;
    });
    
    // If no words match criteria, return empty array
    if (filteredWords.length === 0) {
      return [];
    }
    
    // Shuffle and return requested count
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(generatorParams.count, filteredWords.length));
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
      const syllables = parseInt(generatorParams.syllableCount) || 2;
      const syllablesToGenerate = syllables;
      
      for (let i = 0; i < syllablesToGenerate; i++) {
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
    const syllables = parseInt(generatorParams.syllableCount) || 2;
    
    // Algoritmo efficiente per trovare coppie minime dal dizionario interno
    const findMinimalPairsFromDictionary = (): string[] => {
      // Parole comuni italiane verificate (subset del dizionario per prestazioni)
      // FILTRATE per essere appropriate per bambini
      const commonWords = [
        'casa', 'cassa', 'cane', 'canne', 'male', 'mare', 'mele',
        'sole', 'suole', 'filo', 'fino', 'vino', 'pino', 'lana', 'rana', 'mano', 'nano',
        'polo', 'bolo', 'tana', 'dana', 'pala', 'palla', 'cola', 'colla', 'gala', 'galla',
        'caro', 'carro', 'nero', 'loro', 'oro', 'foro', 'moro', 'coro', 'toro',
        'sera', 'serra', 'terra', 'cera', 'peso', 'pezzo', 'mese', 'messe', 'base', 'basse',
        'rosa', 'rossa', 'massa', 'mazza', 'pazzo', 'passo', 'tasso', 'tazza', 'razzo',
        'note', 'notte', 'botte', 'moto', 'motto', 'foto', 'fatto', 'gatto', 'lago',
        'carta', 'casta', 'pasta', 'basta', 'vasta', 'fede', 'sede', 'vede', 'cede',
        'bene', 'gene', 'rene', 'meta', 'beta', 'zeta', 'seta', 'vita', 'dita',
        'buco', 'bucco', 'eco', 'ecco', 'sano', 'sanno', 'papa', 'pappa', 'bella',
        'torre', 'borre', 'corre', 'forre', 'dorme', 'forme', 'norme', 'luce', 'duce',
        'sale', 'tale', 'vale', 'pale', 'cale', 'male', 'dale', 'bale',
        'lato', 'nato', 'gato', 'dato', 'rato', 'pato', 'mato',
        'fiume', 'piume', 'muro', 'duro', 'puro', 'curo', 'euro',
        'lago', 'rago', 'pago', 'mago', 'sago', 'vago',
        'coda', 'soda', 'loda', 'moda', 'noda', 'roda',
        'luna', 'runa', 'duna', 'tuna', 'puna', 'cuna',
        'pino', 'sino', 'fino', 'lino', 'mino', 'dino', 'tino',
        'dado', 'fado', 'nado', 'rado', 'sado', 'vado'
      ];

      // Lista di parole inappropriate da evitare (per bambini)
      const inappropriateWords = new Set([
        'pene', 'ano', 'culo', 'merda', 'cacca', 'pipi', 'popo',
        'stupido', 'idiota', 'cretino', 'scemo', 'deficiente',
        'stronzo', 'troia', 'puttana', 'figa', 'fica', 'vaffanculo',
        'cazzo', 'fottiti', 'inculare', 'mignotta', 'bastardo',
        'bastardissimo', 'zoccola', 'cornuto', 'coglione',
        'stronza', 'cogliona', 'rompipalle', 'mado', 'puttanella',
        'fichetto', 'pischello', 'pischella', 'merdoso', 'babbeo',
        'imbecille', 'scassacazzo', 'baldracca', 'cagna', 'ficco',
        'troione', 'bastardone', 'ficcona', 'puzzone', 'zzozzo',
        'caccone', 'pennuto', 'pezzente', 'zingaro', 'paccottiglia',
        'lurido', 'ciuccio', 'schifoso', 'brutto', 'schifo', 'lurida',
        'str*nza', 'schifosa', 'cafone', 'duro', 'cretina', 'cornuta',
        'mignotta', 'ficaginosa', 'pippone', 'pirla', 'babbuino',
        'merdone', 'zoccola', 'frocione', 'checca', 'frocio', 'omosessuale',
        'froci', 'patacca', 'minkia', 'minkione', 'scemoide',
        'fesso', 'troione', 'tamarro', 'ubriacone', 'cogliona',
        'merdaccia', 'scemi', 'scemotti', 'frocetto', 'swaghetto',
        'sfigato', 'zigomo', 'vaffangulo', 'puttanella', 'vaffanculo',
        'strunz', 'ricchione', 'stronza', 'piscio', 'pisciare', 'pisciatoio',
        'ricchioni', 'schifosa', 'puzzone', 'cazzone', 'affanculo',
        'porco', 'maiale', 'bischero', 'cafone', 'stregone', 'marcio',
        'cornetta', 'zoccoletta', 'minkietta', 'culattone', 'frocetto',
        'culone', 'straccione', 'negro'
      ]);


      // Filtra le parole inappropriate
      const safeWords = commonWords.filter(word => !inappropriateWords.has(word.toLowerCase()));
      
      // Mescola l'array per randomicità ogni volta
      const shuffledWords = [...safeWords].sort(() => Math.random() - 0.5);
      
      const dictionary = new Set(shuffledWords);
      const foundPairs: Set<string> = new Set();
      const result: string[] = [];

      // Per ogni parola (in ordine casuale), genera varianti con sostituzione di un carattere
      for (const word of shuffledWords) {
        if (result.length >= generatorParams.count) break;

        // Controlla se la parola soddisfa i criteri
        const syllables = countSyllables(word);
        const validSyllables = syllables === syllables; // Ora usiamo valore singolo
        const validFilters = (!generatorParams.startsWith || word.startsWith(generatorParams.startsWith.toLowerCase())) &&
                           (!generatorParams.contains || word.includes(generatorParams.contains.toLowerCase()));
        
        if (!validSyllables || !validFilters) continue;

        // Genera varianti in ordine casuale delle posizioni
        const positions = Array.from({length: word.length}, (_, i) => i).sort(() => Math.random() - 0.5);
        
        for (const i of positions) {
          // Sostituisci carattere i con ogni lettera dell'alfabeto (in ordine casuale)
          const letters = 'abcdefghijklmnopqrstuvwxyz'.split('').sort(() => Math.random() - 0.5);
          
          for (const letter of letters) {
            if (letter === word[i]) continue; // Salta se è lo stesso carattere
            
            const variant = word.slice(0, i) + letter + word.slice(i + 1);
            
            // Controlla se la variante esiste nel dizionario ed è appropriata
            if (dictionary.has(variant) && !inappropriateWords.has(variant.toLowerCase())) {
              const pair = [word, variant].sort().join('-');
              
              if (!foundPairs.has(pair)) {
                foundPairs.add(pair);
                
                // Aggiungi entrambe le parole se non ci sono già e soddisfano i criteri
                const variantSyllables = countSyllables(variant);
                const variantValidSyllables = variantSyllables === syllables;
                const variantValidFilters = (!generatorParams.startsWith || variant.startsWith(generatorParams.startsWith.toLowerCase())) &&
                                          (!generatorParams.contains || variant.includes(generatorParams.contains.toLowerCase()));
                
                if (!result.includes(word) && result.length < generatorParams.count) {
                  result.push(word);
                }
                if (!result.includes(variant) && result.length < generatorParams.count && 
                    variantValidSyllables && variantValidFilters) {
                  result.push(variant);
                }
              }
            }
          }
        }
      }

      // Mescola anche il risultato finale per maggiore varietà
      return result.sort(() => Math.random() - 0.5);
    };

    return findMinimalPairsFromDictionary();
    
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
        title: "Errore di caricamento",
        description: "Impossibile caricare le liste salvate dal database. Riprova più tardi.",
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
          name: customListName || 'Nuovo esercizio',
          description: `Lista ${activeTab === 'generator' ? 'generata' : 'personalizzata'} con ${wordsToSave.length} parole`,
          words: wordsToSave,
          settings: exerciseSettings as any,
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
      setCustomListName('Nuovo esercizio');

      toast({
        title: "Esercizio salvato",
        description: `"${customList.name}" è stato salvato con ${wordsToSave.length} parole.`,
      });
    } catch (error) {
      console.error('Error saving word list:', error);
      toast({
        title: "Errore di salvataggio",
        description: "Impossibile salvare la lista nel database. Verifica la connessione e riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

      // If we deleted the currently selected list, reset to empty
      if (currentWordList.id === listId) {
        onWordListChange({ id: 'empty', name: 'Nessuna lista', words: [], description: '' });
      }

      await loadSavedWordLists();
      toast({
        title: "Esercizio eliminato",
        description: "L'esercizio personalizzato è stato eliminato.",
      });
    } catch (error: any) {
      console.error('Error deleting word list:', error);
      
      let errorMessage = "Impossibile eliminare la lista.";
      
      // Check for specific error types
      if (error.code === '23503') {
        errorMessage = "Impossibile eliminare la lista perché è attualmente utilizzata in esercizi attivi. Rimuovi prima gli esercizi che la utilizzano.";
      } else if (error.code === 'PGRST116') {
        errorMessage = "Lista non trovata o non hai i permessi per eliminarla.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Errore di connessione. Controlla la rete e riprova.";
      } else if (error.message) {
        errorMessage = `Errore durante l'eliminazione: ${error.message}`;
      }
      
      toast({
        title: "Errore di eliminazione",
        description: errorMessage,
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
          words: words,
          settings: exerciseSettings as any
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
      setCustomListName('Nuovo esercizio');
      setEditingList(null);

      toast({
        title: "Lista aggiornata",
        description: `"${updatedList.name}" è stata aggiornata.`,
      });
    } catch (error: any) {
      console.error('Error updating word list:', error);
      
      let errorMessage = "Impossibile aggiornare la lista.";
      
      if (error.code === 'PGRST116') {
        errorMessage = "Lista non trovata o non hai i permessi per modificarla.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Errore di connessione. Controlla la rete e riprova.";
      } else if (error.message) {
        errorMessage = `Errore durante l'aggiornamento: ${error.message}`;
      }
      
      toast({
        title: "Errore di modifica",
        description: errorMessage,
        variant: "destructive",
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
      maskDuration: 100,
      fontSize: 'large' as const
    });
    toast({
      title: "Form pulito",
      description: "Il form è stato resettato.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Card - Compatto */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            Liste Parole & Esercizi
          </CardTitle>
          <CardDescription>
            Gestisci i tuoi esercizi salvati o creane di nuovi
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Layout a 3 colonne per meglio bilanciare */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonna 1: Esercizi Salvati */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Esercizi salvati</CardTitle>
            <CardDescription>
              I tuoi esercizi personalizzati
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedWordLists.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Nessun esercizio</p>
                <p className="text-xs">Crea il tuo primo esercizio</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedWordLists.map((list) => (
                  <div
                    key={list.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                      currentWordList.id === list.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onWordListChange(list)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{list.name}</h4>
                        <p className="text-xs text-gray-500">{list.words.length} parole</p>
                        {list.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{list.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditWordList(list);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Export singolo esercizio con settings
                            const dataToExport = {
                              name: list.name,
                              description: list.description,
                              words: list.words,
                              settings: exerciseSettings
                            };
                            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${list.name.toLowerCase().replace(/\s+/g, '_')}_esercizio.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWordList(list.id);
                          }}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Rimuovo il bottone export generale */}
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
              <Input
                placeholder="Nuovo esercizio"
                value={customListName}
                onChange={(e) => setCustomListName(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Tabs compatte per Generator vs Manual (solo se non in editing) */}
            {!editingList && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('generator')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'generator'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Wand2 className="h-4 w-4 inline mr-2" />
                  Generatore
                </button>
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'manual'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Edit className="h-4 w-4 inline mr-2" />
                  Manuale
                </button>
              </div>
            )}

            {/* Contenuto Generator */}
            {(activeTab === 'generator' && !editingList) && (
              <div className="space-y-4">
                {/* Controlli compatti in griglia */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Tipo</Label>
                    <Select
                      value={generatorParams.type}
                      onValueChange={(value) => setGeneratorParams({...generatorParams, type: value as any})}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="words">Parole</SelectItem>
                        <SelectItem value="syllables">Sillabe</SelectItem>
                        <SelectItem value="nonwords">Non-parole</SelectItem>
                        <SelectItem value="minimal-pairs">Coppie minime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Quantità</Label>
                    <Input
                      type="number"
                      min="5"
                      max="50"
                      value={generatorParams.count}
                      onChange={(e) => setGeneratorParams({...generatorParams, count: parseInt(e.target.value) || 10})}
                      className="h-9"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Sillabe</Label>
                  <Select
                    value={generatorParams.syllableCount}
                    onValueChange={(value) => setGeneratorParams({...generatorParams, syllableCount: value})}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 sillabe</SelectItem>
                      <SelectItem value="3">3 sillabe</SelectItem>
                      <SelectItem value="4">4 sillabe</SelectItem>
                      <SelectItem value="5">5 sillabe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Inizia con</Label>
                    <Input
                      placeholder="es. ca"
                      value={generatorParams.startsWith}
                      onChange={(e) => setGeneratorParams({...generatorParams, startsWith: e.target.value})}
                      className="h-9"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Contiene</Label>
                    <Input
                      placeholder="es. ar"
                      value={generatorParams.contains}
                      onChange={(e) => setGeneratorParams({...generatorParams, contains: e.target.value})}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Anteprima parole generate */}
                {isGenerating ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="ml-2 text-sm text-gray-600">Generazione...</span>
                  </div>
                ) : generatedWords.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-3">
                    <div className="flex-1 flex flex-wrap gap-1">
                      {generatedWords.map((word, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {word}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateWords}
                      className="h-8 text-xs flex-shrink-0"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Aggiorna
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-3 space-y-2">
                    <p className="text-gray-500 text-sm">Genera parole con i parametri sopra</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateWords}
                      className="h-8 text-xs"
                    >
                      <Wand2 className="h-3 w-3 mr-1" />
                      Genera Parole
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Contenuto Manual */}
            {(activeTab === 'manual' || editingList) && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Parole (separate da virgola o a capo)</Label>
                  <Textarea
                    placeholder="aprile, piccolo, dove, palazzo&#10;maggio, verde, collina&#10;regalo, pianura, marzo"
                    value={customWords}
                    onChange={(e) => setCustomWords(e.target.value)}
                    rows={6}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {customWords.split(/[,\n\s]+/).filter(w => w.trim()).length} parole
                  </p>
                </div>
                
              </div>
            )}

            {/* Impostazioni Esercizio - Ridotte e raggruppate */}
            <details className="border rounded-lg">
              <summary className="p-3 cursor-pointer hover:bg-gray-50 text-sm font-medium">
                Impostazioni frequenza parola
              </summary>
              <div className="p-3 pt-0 border-t">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Esposizione (ms)</Label>
                    <Input
                      type="number"
                      min="50"
                      max="1000"
                      step="25"
                      value={exerciseSettings.exposureDuration}
                      onChange={(e) => setExerciseSettings({
                        ...exerciseSettings,
                        exposureDuration: parseInt(e.target.value) || 150
                      })}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Pausa (ms)</Label>
                    <Input
                      type="number"
                      min="200"
                      max="2000"
                      step="100"
                      value={exerciseSettings.intervalDuration}
                      onChange={(e) => setExerciseSettings({
                        ...exerciseSettings,
                        intervalDuration: parseInt(e.target.value) || 800
                      })}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Formato</Label>
                    <Select
                      value={exerciseSettings.textCase}
                      onValueChange={(value) => setExerciseSettings({
                        ...exerciseSettings,
                        textCase: value as any
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Originale</SelectItem>
                        <SelectItem value="uppercase">MAIUSCOLO</SelectItem>
                        <SelectItem value="lowercase">minuscolo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="useMask"
                        checked={exerciseSettings.useMask}
                        onChange={(e) => setExerciseSettings({
                          ...exerciseSettings,
                          useMask: e.target.checked
                        })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="useMask" className="text-xs">Usa maschera</Label>
                    </div>
                    
                    {exerciseSettings.useMask && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-600">Durata:</Label>
                        <Input
                          type="number"
                          min="50"
                          max="1000"
                          value={exerciseSettings.maskDuration}
                          onChange={(e) => setExerciseSettings({
                            ...exerciseSettings,
                            maskDuration: parseInt(e.target.value) || 100
                          })}
                          className="h-7 w-20 text-sm"
                        />
                        <span className="text-xs text-gray-500">ms</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </details>

            {/* Bottoni azione */}
            <div className="flex gap-2 pt-2">
              {editingList ? (
                <>
                  <Button 
                    onClick={handleUpdateWordList} 
                    disabled={!customWords.trim() || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? 'Aggiornamento...' : 'Aggiorna'}
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline">
                    Annulla
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleCreateCustomList} 
                    disabled={isLoading || !customListName.trim() || 
                      (activeTab === 'generator' ? generatedWords.length === 0 : !customWords.trim())}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? 'Salvataggio...' : 'Salva esercizio'}
                  </Button>
                  <Button 
                    onClick={() => document.getElementById('file-import')?.click()}
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importa
                  </Button>
                </>
              )}
            </div>

            {!therapistId && (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                Accedi come terapeuta per salvare permanentemente.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};