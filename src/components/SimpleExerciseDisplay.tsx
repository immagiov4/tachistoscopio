import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, X } from 'lucide-react';
import { ThemeType, themes } from './ThemeSelector';

interface ExerciseSession {
  words: string[];
  settings: any;
  startTime: number;
  currentWordIndex: number;
  errors: number[];
  isRunning: boolean;
  isPaused: boolean;
}

interface SessionResult {
  totalWords: number;
  correctWords: number;
  incorrectWords: number;
  accuracy: number;
  duration: number;
  missedWords: string[];
  settings: any;
}

interface SimpleExerciseDisplayProps {
  session: ExerciseSession;
  onComplete: (result: SessionResult) => void;
  onStop: () => void;
  onUpdateSession: (session: ExerciseSession) => void;
  theme?: ThemeType;
}

export const SimpleExerciseDisplay: React.FC<SimpleExerciseDisplayProps> = ({
  session,
  onComplete,
  onStop,
  onUpdateSession,
  theme = 'rainbow',
}) => {
  const [displayState, setDisplayState] = useState<'countdown' | 'stimulus' | 'word' | 'mask' | 'interval'>('countdown');
  const [currentWord, setCurrentWord] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [stimulusVisible, setStimulusVisible] = useState(false);

  const getFontSize = (size: string): string => {
    switch (size) {
      case 'small': return 'text-4xl';
      case 'medium': return 'text-6xl';
      case 'large': return 'text-8xl';
      case 'extra-large': return 'text-9xl';
      default: return 'text-8xl';
    }
  };

  const formatWord = useCallback((word: string): string => {
    switch (session.settings.textCase) {
      case 'uppercase': return word.toUpperCase();
      case 'lowercase': return word.toLowerCase();
      default: return word;
    }
  }, [session.settings.textCase]);

  const playErrorSound = () => {
    // Suono più dolce e delicato per bambini
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Suono più dolce - tono più basso e meno aggressivo
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime); // Volume molto più basso
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  const markError = useCallback(() => {
    console.log('Marking error for word index:', session.currentWordIndex);
    console.log('Current errors before:', session.errors);
    
    // Riproduci suono
    try {
      playErrorSound();
    } catch (error) {
      console.log('Audio not available:', error);
    }
    
    const newSession = {
      ...session,
      errors: [...session.errors, session.currentWordIndex]
    };
    console.log('New errors after:', newSession.errors);
    onUpdateSession(newSession);
  }, [session, onUpdateSession]);

  const nextWord = useCallback(() => {
    const newIndex = session.currentWordIndex + 1;
    console.log('Next word called. Current index:', session.currentWordIndex, 'New index:', newIndex);
    console.log('Current errors in nextWord:', session.errors);
    
    if (newIndex >= session.words.length) {
      const endTime = Date.now();
      const duration = endTime - session.startTime;
      const totalWords = session.words.length;
      const incorrectWords = session.errors.length;
      const correctWords = totalWords - incorrectWords;
      const accuracy = (correctWords / totalWords) * 100;

      const missedWords = session.errors.map(index => session.words[index]);

      const result: SessionResult = {
        totalWords,
        correctWords,
        incorrectWords,
        accuracy,
        duration,
        missedWords,
        settings: session.settings,
      };

      onComplete(result);
      return;
    }

    // IMPORTANTE: Preservo tutti i dati della sessione inclusi gli errori
    const newSession = {
      ...session,
      currentWordIndex: newIndex
    };
    console.log('Updating session with preserved errors:', newSession.errors);
    onUpdateSession(newSession);
  }, [session, onComplete, onUpdateSession]);

  const pauseResume = useCallback(() => {
    onUpdateSession({
      ...session,
      isPaused: !session.isPaused
    });
  }, [session, onUpdateSession]);

  useEffect(() => {
    console.log('Countdown effect:', { isCountingDown, countdown, sessionIsRunning: session.isRunning });
    
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => {
        console.log('Countdown decreasing:', countdown - 1);
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isCountingDown && countdown === 0) {
      console.log('Countdown finished, starting exercise');
      setIsCountingDown(false);
      onUpdateSession({ ...session, isRunning: true });
    }
  }, [countdown, isCountingDown, session, onUpdateSession]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!session.isRunning || session.isPaused) return;
      if (event.key === 'x' || event.key === 'X') markError();
      if (event.key === 'Escape') onStop();
    };

    const handleClick = (event: MouseEvent) => {
      // Solo se l'esercizio è in corso e non è in pausa
      if (!session.isRunning || session.isPaused || isCountingDown) return;
      
      // NON segnare errore durante lo stimolo visivo
      if (displayState === 'stimulus') return;
      
      // Evita di triggerare su click dei pulsanti di controllo
      const target = event.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="button"]')) return;
      
      console.log('Screen clicked, marking error');
      markError();
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, [session.isRunning, session.isPaused, isCountingDown, markError, onStop]);

  useEffect(() => {
    const currentWordToShow = session.words[session.currentWordIndex];
    console.log('Word display effect:', { 
      isRunning: session.isRunning, 
      isPaused: session.isPaused, 
      currentWordIndex: session.currentWordIndex,
      currentWordToShow,
      isCountingDown
    });
    
    if (session.isRunning && !session.isPaused && currentWordToShow && !isCountingDown) {
      console.log('Showing stimulus before word:', currentWordToShow);
      
      // Prima mostra lo stimolo visivo
      setDisplayState('stimulus');
      setStimulusVisible(true);
      
      const stimulusTimer = setTimeout(() => {
        // Nascondi lo stimolo con animazione fluida
        setStimulusVisible(false);
        
        // Aspetta che l'animazione finisca prima di mostrare la parola
        setTimeout(() => {
          console.log('Showing word:', currentWordToShow);
          setDisplayState('word');
          setCurrentWord(formatWord(currentWordToShow));

          const wordTimer = setTimeout(() => {
            if (session.settings.useMask) {
              setDisplayState('mask');
              setTimeout(() => {
                setDisplayState('interval');
                setTimeout(nextWord, session.settings.intervalDuration);
              }, session.settings.maskDuration);
            } else {
              setDisplayState('interval');
              setTimeout(nextWord, session.settings.intervalDuration);
            }
          }, session.settings.exposureDuration);

          return () => clearTimeout(wordTimer);
        }, 600); // Aspetta che l'animazione di uscita finisca
      }, 800); // Durata dello stimolo più lunga

      return () => clearTimeout(stimulusTimer);
    }
  }, [session, nextWord, formatWord, isCountingDown]);

  const progress = (session.currentWordIndex / session.words.length) * 100;
  const accuracy = session.currentWordIndex > 0 ? 
    ((session.currentWordIndex - session.errors.length) / session.currentWordIndex) * 100 : 100;

  if (isCountingDown) {
    const currentTheme = themes.find(t => t.id === theme) || themes[3];
    
    return (
      <div className={`min-h-screen ${
        theme === 'rainbow' ? 'bg-gradient-to-r' : 
        theme === 'space' ? 'bg-gradient-to-br' :
        theme === 'ocean' ? 'bg-gradient-to-tr' :
        theme === 'nature' ? 'bg-gradient-to-bl' :
        'bg-gradient-to-r'
      } ${currentTheme.preview.background} flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white drop-shadow-lg mb-8">
            {countdown > 0 ? countdown : 'INIZIA!'}
          </h1>
          <p className="text-xl text-white/80">
            Preparati a leggere le parole...
          </p>
        </div>
      </div>
    );
  }

  const currentTheme = themes.find(t => t.id === theme) || themes[3]; // Default rainbow

  return (
    <div className={`min-h-screen ${
      theme === 'rainbow' ? 'bg-gradient-to-r' : 
      theme === 'space' ? 'bg-gradient-to-br' :
      theme === 'ocean' ? 'bg-gradient-to-tr' :
      theme === 'nature' ? 'bg-gradient-to-bl' :
      'bg-gradient-to-r'
    } ${currentTheme.preview.background} flex flex-col relative overflow-hidden`}>
      {/* Forme decorative di sfondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-20 -right-20 w-60 h-60 bg-gradient-to-br from-white/15 to-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 left-1/4 w-80 h-80 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative z-10">
        {!session.isPaused ? (
          <>
            {/* Sfondo decorativo giocoso con elementi del tema */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-3xl rotate-12 opacity-30 flex items-center justify-center text-2xl">
                {currentTheme.preview.shapes[0]}
              </div>
              <div className="absolute top-32 right-16 w-16 h-16 bg-white/10 rounded-full opacity-30 flex items-center justify-center text-xl">
                {currentTheme.preview.shapes[1]}
              </div>
              <div className="absolute bottom-20 left-20 w-24 h-12 bg-white/10 rounded-full rotate-45 opacity-30 flex items-center justify-center text-lg">
                {currentTheme.preview.shapes[2]}
              </div>
              <div className="absolute bottom-32 right-12 w-14 h-20 bg-white/10 rounded-3xl -rotate-12 opacity-30 flex items-center justify-center text-lg">
                {currentTheme.preview.shapes[3] || currentTheme.preview.shapes[0]}
              </div>
              <div className="absolute top-1/2 left-8 w-8 h-8 bg-white/20 rounded-lg rotate-45 opacity-40"></div>
              <div className="absolute top-3/4 right-8 w-12 h-6 bg-white/10 rounded-full opacity-30"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className={`font-bold text-foreground ${getFontSize(session.settings.fontSize)} min-h-[200px] flex items-center justify-center`}>
                {displayState === 'stimulus' && (
                  <div className={`transition-all duration-500 ease-out transform ${
                    stimulusVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                  }`}>
                    <div className="relative">
                      <div className="text-8xl filter drop-shadow-lg">
                        {currentTheme.preview.shapes[session.currentWordIndex % currentTheme.preview.shapes.length]}
                      </div>
                      <div className="absolute inset-0 animate-ping text-8xl opacity-20">
                        {currentTheme.preview.shapes[session.currentWordIndex % currentTheme.preview.shapes.length]}
                      </div>
                    </div>
                  </div>
                )}
                {displayState === 'word' && (
                  <div className="animate-fade-in">
                    {currentWord}
                  </div>
                )}
                {displayState === 'mask' && (
                  <div className="animate-fade-in text-muted-foreground">
                    ####
                  </div>
                )}
                {displayState === 'interval' && ' '}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center space-y-6">
            <p className="text-2xl font-bold text-primary">ESERCIZIO IN PAUSA</p>
            <Button onClick={pauseResume} size="lg" className="text-lg min-h-[60px] px-8">
              <Play className="mr-2 h-6 w-6" />
              Riprendi Esercizio
            </Button>
          </div>
        )}

        <div className="absolute top-4 left-4 right-4 bg-white/85 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/30">
          <div className="text-center space-y-2 mb-4">
            <p className="text-sm text-gray-700 font-medium">
              Progresso: {session.currentWordIndex}/{session.words.length}
            </p>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-700 font-medium">
              Precisione: {accuracy.toFixed(1)}%
            </p>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={pauseResume} variant="outline" size="lg" className="flex items-center gap-2 min-w-[120px] touch-manipulation">
              {session.isPaused ? <><Play className="h-5 w-5" />Riprendi</> : <><Pause className="h-5 w-5" />Pausa</>}
            </Button>
            <Button onClick={onStop} variant="outline" size="lg" className="flex items-center gap-2 min-w-[120px] touch-manipulation">
              <Square className="h-5 w-5" />Stop
            </Button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 text-center">
          <div className="bg-white/85 backdrop-blur-md rounded-xl p-3 border border-white/30 shadow-lg">
            <p className="text-sm font-medium text-gray-800 mb-1">
              💭 Tocca lo schermo per segnare un errore
            </p>
            <p className="text-xs text-gray-600">
              Comandi: <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">X</kbd> = Marca errore
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};