import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // Funzione per ottenere l'ombra appropriata per ogni tema
  const getThemeShadow = (themeId: ThemeType) => {
    switch(themeId) {
      case 'space': return 'drop-shadow-[0_0_50px_rgba(255,255,255,0.15)]'; // Ombra molto estesa e quasi impercettibile
      case 'nature': return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.1)]'; // Ombra molto estesa per temi chiari
      case 'ocean': return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.12)]'; // Ombra molto estesa
      case 'rainbow': return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.15)]'; // Ombra molto estesa
      case 'clouds': return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.1)]'; // Ombra molto estesa per temi chiari
      default: return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.1)]';
    }
  };

  const getTextShadow = (themeId: ThemeType) => {
    switch(themeId) {
      case 'space': return 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]'; // Testo bianco con ombra bianca
      case 'nature': return 'text-gray-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]'; // Testo scuro con ombra bianca
      case 'ocean': return 'text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.6)]'; // Testo bianco con ombra scura
      case 'rainbow': return 'text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.7)]'; // Testo bianco con ombra scura forte
      case 'clouds': return 'text-gray-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]'; // Testo scuro con ombra bianca
      default: return 'text-white drop-shadow-lg';
    }
  };

  // Ombra invisibile per le parole - grande raggio, bassa opacità per aumentare contrasto senza essere vista
  const getWordShadow = (themeId: ThemeType) => {
    switch(themeId) {
      case 'space': return 'drop-shadow-[0_0_60px_rgba(255,255,255,0.2)] drop-shadow-[0_0_120px_rgba(255,255,255,0.15)]';
      case 'nature': return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.25)] drop-shadow-[0_0_120px_rgba(0,0,0,0.2)]';
      case 'ocean': return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.3)] drop-shadow-[0_0_120px_rgba(0,0,0,0.2)]';
      case 'rainbow': return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.35)] drop-shadow-[0_0_120px_rgba(0,0,0,0.25)]';
      case 'clouds': return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.25)] drop-shadow-[0_0_120px_rgba(0,0,0,0.2)]';
      default: return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.25)]';
    }
  };

  const getFontSize = (size: string): string => {
    switch (size) {
      case 'small': return 'text-2xl md:text-4xl';
      case 'medium': return 'text-4xl md:text-6xl';
      case 'large': return 'text-5xl md:text-8xl';
      case 'extra-large': return 'text-6xl md:text-9xl';
      default: return 'text-5xl md:text-8xl';
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
    console.log('🔊 playErrorSound called on mobile');
    
    // PRIMA: Vibrazione immediata (funziona sempre)
    if ('vibrate' in navigator) {
      console.log('📳 Attempting vibration...');
      try {
        const result = navigator.vibrate([200, 100, 200]); // Pattern più percettibile
        console.log('📳 Vibration result:', result);
      } catch (e) {
        console.log('📳 Vibration failed:', e);
      }
    } else {
      console.log('📳 Vibration not supported');
    }
    
    // SECONDO: Tentativo audio (può fallire su mobile)
    try {
      console.log('🎵 Creating AudioContext...');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🎵 AudioContext state:', audioContext.state);
      
      const playSound = () => {
        console.log('🎵 Playing sound...');
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        console.log('🎵 Sound started');
      };
      
      if (audioContext.state === 'suspended') {
        console.log('🎵 Resuming AudioContext...');
        audioContext.resume().then(() => {
          console.log('🎵 AudioContext resumed successfully');
          playSound();
        }).catch(e => {
          console.log('🎵 Failed to resume AudioContext:', e);
        });
      } else {
        playSound();
      }
      
    } catch (error) {
      console.log('🎵 Audio completely failed:', error);
    }
  };

  // Usa ref per mantenere una versione stabile di markError
  const markErrorRef = useRef<() => void>();
  
  markErrorRef.current = () => {
    console.log('Marking error for word index:', session.currentWordIndex);
    console.log('Current errors before:', session.errors);
    
    // Limita il numero massimo di errori al numero totale di parole
    if (session.errors.length >= session.words.length) {
      console.log('Maximum errors reached, not adding more');
      return;
    }
    
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
  };

  const markError = useCallback(() => {
    markErrorRef.current?.();
  }, []); // Dipendenze vuote - funzione sempre stabile

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

    const handleClick = (event: MouseEvent | TouchEvent) => {
      console.log('👆 Click/Touch detected:', {
        isRunning: session.isRunning,
        isPaused: session.isPaused,
        isCountingDown,
        displayState,
        eventType: event.type
      });
      
      // Solo se l'esercizio è in corso e non è in pausa
      if (!session.isRunning || session.isPaused || isCountingDown) {
        console.log('👆 Click ignored - exercise not active');
        return;
      }
      
      // Evita di triggerare su click dei pulsanti di controllo
      const target = event.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="button"]')) {
        console.log('👆 Click ignored - button clicked');
        return;
      }
      
      // Previeni comportamento di default su mobile per evitare interferenze
      event.preventDefault();
      event.stopPropagation();
      
      console.log('👆 Valid click/touch - marking error');
      markError();
    };

    // Gestisci sia mouse che touch events
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick, { passive: false });
    window.addEventListener('touchend', handleClick, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchend', handleClick);
    };
  }, [session.isRunning, session.isPaused, isCountingDown, displayState, markError, onStop]);

  useEffect(() => {
    const currentWordToShow = session.words[session.currentWordIndex];
    console.log('Word display effect:', { 
      isRunning: session.isRunning, 
      isPaused: session.isPaused, 
      currentWordIndex: session.currentWordIndex,
      currentWordToShow,
      isCountingDown
    });
    
    // Se l'esercizio non è più in corso, ferma tutto
    if (!session.isRunning) {
      console.log('Exercise stopped, clearing display state');
      setDisplayState('interval');
      return;
    }
    
    if (session.isRunning && !session.isPaused && currentWordToShow && !isCountingDown) {
      console.log('Showing stimulus before word:', currentWordToShow);
      
      // Reset state e mostra stimolo con timing fisso
      setDisplayState('stimulus');
      setStimulusVisible(true);
      
      // Timer per stimolo - ridotto per essere meno invadente
      const stimulusTimer = setTimeout(() => {
        if (!session.isRunning) {
          console.log('Session stopped during stimulus timer');
          return; // Controlla se è ancora attivo
        }
        setStimulusVisible(false);
        
        // Timer fisso per transizione - sempre 300ms
        const transitionTimer = setTimeout(() => {
          if (!session.isRunning) {
            console.log('Session stopped during transition timer');
            return; // Controlla se è ancora attivo
          }
          console.log('Showing word:', currentWordToShow);
          setDisplayState('word');
          setCurrentWord(formatWord(currentWordToShow));

          // Timer per durata parola - basato su settings
          const wordTimer = setTimeout(() => {
            if (!session.isRunning) {
              console.log('Session stopped during word timer');
              return; // Controlla se è ancora attivo
            }
            console.log('Word timer finished. UseMask:', session.settings.useMask, 'MaskDuration:', session.settings.maskDuration);
            if (session.settings.useMask) {
              console.log('Showing mask for', session.settings.maskDuration, 'ms');
              setDisplayState('mask');
              const maskTimer = setTimeout(() => {
                if (!session.isRunning) {
                  console.log('Session stopped during mask timer');
                  return; // Controlla se è ancora attivo
                }
                console.log('Mask timer finished, showing interval');
                setDisplayState('interval');
                const intervalTimer = setTimeout(() => {
                  if (!session.isRunning) {
                    console.log('Session stopped during interval timer');
                    return; // Controlla se è ancora attivo
                  }
                  nextWord();
                }, session.settings.intervalDuration);
                return () => clearTimeout(intervalTimer);
              }, session.settings.maskDuration);
              return () => clearTimeout(maskTimer);
            } else {
              console.log('No mask, going directly to interval');
              setDisplayState('interval');
              const intervalTimer = setTimeout(() => {
                if (!session.isRunning) {
                  console.log('Session stopped during interval timer (no mask)');
                  return; // Controlla se è ancora attivo
                }
                nextWord();
              }, session.settings.intervalDuration);
              return () => clearTimeout(intervalTimer);
            }
          }, session.settings.exposureDuration);

          return () => clearTimeout(wordTimer);
        }, 300); // Timing fisso per transizione

        return () => clearTimeout(transitionTimer);
      }, 500); // Timing ridotto per stimolo

      return () => {
        console.log('Cleaning up timers');
        clearTimeout(stimulusTimer);
        // Cleanup di eventuali timer annidati
        setDisplayState('interval');
      };
    }
  }, [session.isRunning, session.isPaused, session.currentWordIndex, isCountingDown, formatWord, nextWord]);

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
          <h1 className={`text-6xl font-bold mb-8 ${getTextShadow(theme)}`}>
            {countdown > 0 ? countdown : 'INIZIA!'}
          </h1>
          <p className={`text-xl ${getTextShadow(theme)} ${
            theme === 'space' ? 'text-white/90' :
            theme === 'nature' || theme === 'clouds' ? 'text-gray-700' :
            'text-white/80'
          }`}>
            Preparati a leggere le parole...
          </p>
        </div>
      </div>
    );
  }

  const currentTheme = themes.find(t => t.id === theme) || themes[3]; // Default rainbow

  return (
    <div className={`min-h-screen relative ${
      theme === 'rainbow' ? 'bg-gradient-to-r' : 
      theme === 'space' ? 'bg-gradient-to-br' :
      theme === 'ocean' ? 'bg-gradient-to-tr' :
      theme === 'nature' ? 'bg-gradient-to-bl' :
      'bg-gradient-to-r'
    } ${currentTheme.preview.background} flex flex-col overflow-hidden`}>
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(60,60,60,1) 0.5px, transparent 0)`,
          backgroundSize: '2px 2px'
        }}
      ></div>
      {/* Forme decorative di sfondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-20 -right-20 w-60 h-60 bg-gradient-to-br from-white/15 to-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 left-1/4 w-80 h-80 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative z-10">
        {!session.isPaused ? (
          <div className="w-full flex items-center justify-center min-h-[60vh]">
            {displayState === 'stimulus' && (
              <div className="text-center animate-scale-in">
                <div className="inline-block p-12 bg-white/30 backdrop-blur-lg rounded-full border-2 border-white/50 shadow-2xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full animate-pulse shadow-2xl relative">
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
                  </div>
                </div>
              </div>
            )}

            {displayState === 'word' && (
              <div className="text-center animate-scale-in" style={{ touchAction: 'manipulation' }}>
                <div className="relative inline-block p-8 sm:p-12 bg-white/25 backdrop-blur-lg rounded-3xl border border-white/30 shadow-2xl min-w-[300px] sm:min-w-[400px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl"></div>
                  <p 
                    className={`relative ${getFontSize(session.settings.fontSize)} font-bold tracking-wide transition-all duration-300`}
                    style={{
                      color: '#2563eb',
                      textShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
                      fontFamily: '"Inter", system-ui, sans-serif'
                    }}
                  >
                    {formatWord(currentWord)}
                  </p>
                </div>
              </div>
            )}

            {displayState === 'mask' && (
              <div className="text-center animate-scale-in">
                <div className="relative inline-block p-8 bg-foreground rounded-3xl shadow-2xl min-w-[400px] min-h-[200px]">
                  {/* Maschera completamente nera */}
                </div>
              </div>
            )}

            {displayState === 'interval' && (
              <div className="text-center">
                {/* Effetto di pulsazione morbida dello sfondo durante l'intervallo */}
                <div className="absolute inset-0 bg-black/15 animate-pulse" style={{
                  animation: 'pulse 1.5s ease-in-out infinite alternate'
                }}></div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-8 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full"></div>
              <p className="relative text-4xl font-bold text-white drop-shadow-2xl">⏸️ ESERCIZIO IN PAUSA</p>
            </div>
            <Button 
              onClick={pauseResume} 
              size="lg" 
              className="text-xl min-h-[70px] px-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-2 border-white/20 shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300"
            >
              <Play className="mr-3 h-8 w-8" />
              Riprendi Esercizio
            </Button>
          </div>
        )}

        <div className="absolute top-4 left-4 right-4 z-20">
          <div className="bg-white/80 backdrop-blur-md border border-white/40 p-4 rounded-2xl shadow-2xl animate-fade-in" style={{ 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)',
            backdropFilter: 'blur(20px) saturate(1.8)'
          }}>
            <div className="text-center space-y-3 mb-6">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-gray-700 font-semibold">
                    Progresso: {session.currentWordIndex}/{session.words.length}
                  </p>
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Precisione: {Math.round(((session.currentWordIndex - session.errors.length) / Math.max(session.currentWordIndex, 1)) * 100)}%
                </div>
              </div>
              <div className="relative">
                <Progress value={progress} className="w-full h-3 bg-gray-200/50" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-full"></div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={pauseResume} 
                variant="outline" 
                size="lg" 
                className="flex items-center gap-2 min-w-[140px] bg-white/70 border-2 border-gray-300 hover:bg-white/90 hover:border-blue-400 hover:scale-105 transition-all duration-150 shadow-lg font-semibold touch-manipulation"
              >
                {session.isPaused ? <><Play className="h-5 w-5" />Riprendi</> : <><Pause className="h-5 w-5" />Pausa</>}
              </Button>
              <Button 
                onClick={() => {
                  console.log('Stop button clicked');
                  onStop();
                }} 
                variant="outline" 
                size="lg" 
                className="flex items-center gap-2 min-w-[120px] bg-red-50 border-2 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-400 hover:scale-105 transition-all duration-150 shadow-lg font-semibold touch-manipulation"
              >
                <Square className="h-5 w-5" />Stop
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 text-center z-20">
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-3 border border-white/40 shadow-lg animate-fade-in max-w-sm mx-auto" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
            backdropFilter: 'blur(15px) saturate(1.5)'
          }}>
            <p className="text-sm font-medium text-gray-700 flex items-center justify-center gap-2">
              <span className="text-lg">👆</span>
              Tocca per segnare errore
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};