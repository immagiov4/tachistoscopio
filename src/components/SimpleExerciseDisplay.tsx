import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square } from 'lucide-react';
import { ThemeType, themes } from './ThemeSelector';
import { playErrorSound } from './SimpleExerciseDisplay/audioHelpers';
import { TIMING } from '@/constants/timing';
import {
  getThemeGradient,
  getTextShadow,
  getFontSize,
  getCountdownTextColor
} from './SimpleExerciseDisplay/themeHelpers';
import {
  ExerciseSession,
  SessionResult,
  formatWord,
  calculateSessionResult,
  calculateProgress,
  calculateAccuracy,
  shouldAddError,
  createUpdatedSession
} from './SimpleExerciseDisplay/sessionHelpers';
import { startDisplaySequence } from './SimpleExerciseDisplay/timingHelpers';

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
  const [countdown, setCountdown] = useState<number>(TIMING.COUNTDOWN_START);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [stimulusVisible, setStimulusVisible] = useState(false);
  
  // Ref per controllare se il componente è ancora montato
  const isMountedRef = useRef(true);
  const isRunningRef = useRef(session.isRunning);
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  
  // Funzione per controllare se possiamo aggiornare lo stato
  const safeSetState = useCallback((fn: () => void) => {
    if (isMountedRef.current) {
      fn();
    }
  }, []);
  
  // Funzione per aggiungere un timer da tracciare
  const addTimer = (timerId: NodeJS.Timeout) => {
    if (isMountedRef.current) {
      activeTimersRef.current.push(timerId);
    }
    return timerId;
  };
  
  const clearAllTimers = useCallback(() => {
    console.log('🛑 Clearing all active timers:', activeTimersRef.current.length);
    activeTimersRef.current.forEach(timerId => {
      clearTimeout(timerId);
    });
    activeTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - cleaning up all timers and state');
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Usa ref per mantenere una versione stabile di markError
  const markErrorRef = useRef<() => void>();
  
  markErrorRef.current = () => {
    console.log('Marking error for word index:', session.currentWordIndex);
    console.log('Current errors before:', session.errors);
    
    if (!shouldAddError(session.errors, session.words.length)) {
      console.log('Maximum errors reached, not adding more');
      return;
    }
    
    try {
      playErrorSound();
    } catch (error) {
      console.log('Audio not available:', error);
    }
    
    const newSession = createUpdatedSession(session, {
      errors: [...session.errors, session.currentWordIndex]
    });
    console.log('New errors after:', newSession.errors);
    onUpdateSession(newSession);
  };

  const markError = useCallback(() => {
    markErrorRef.current?.();
  }, []); // Dipendenze vuote - funzione sempre stabile

  // Usa ref per mantenere una versione stabile di nextWord
  const nextWordRef = useRef<() => void>();
  
  nextWordRef.current = () => {
    const newIndex = session.currentWordIndex + 1;
    console.log('Next word called. Current index:', session.currentWordIndex, 'New index:', newIndex);
    console.log('Current errors in nextWord:', session.errors);
    
    if (newIndex >= session.words.length) {
      const result = calculateSessionResult(session);
      onComplete(result);
      return;
    }

    const newSession = createUpdatedSession(session, {
      currentWordIndex: newIndex
    });
    console.log('Updating session with preserved errors:', newSession.errors);
    onUpdateSession(newSession);
  };

  const nextWord = useCallback(() => {
    nextWordRef.current?.();
  }, []); // Dipendenze vuote - funzione sempre stabile

  const pauseResume = useCallback(() => {
    onUpdateSession(createUpdatedSession(session, {
      isPaused: !session.isPaused
    }));
  }, [session, onUpdateSession]);

  useEffect(() => {
    console.log('Countdown effect:', { isCountingDown, countdown, sessionIsRunning: session.isRunning });
    
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => {
        safeSetState(() => {
          console.log('Countdown decreasing:', countdown - 1);
          setCountdown(countdown - 1);
        });
      }, TIMING.COUNTDOWN_INTERVAL);
      addTimer(timer);
      return () => clearTimeout(timer);
    } else if (isCountingDown && countdown === 0) {
      safeSetState(() => {
        console.log('Countdown finished, starting exercise');
        setIsCountingDown(false);
        onUpdateSession({ ...session, isRunning: true });
      });
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
    // Aggiorna il ref ogni volta che session.isRunning cambia
    isRunningRef.current = session.isRunning;
    
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
      
      startDisplaySequence({
        isRunningRef,
        config: {
          exposureDuration: session.settings.exposureDuration,
          intervalDuration: session.settings.intervalDuration,
          intervalVariability: session.settings.intervalVariability || 0,
          useMask: session.settings.useMask,
          maskDuration: session.settings.maskDuration
        },
        addTimer,
        setStimulusVisible,
        setDisplayState,
        setCurrentWord,
        nextWord,
        formatWord,
        currentWord: currentWordToShow,
        textCase: session.settings.textCase
      });

      return () => {
        console.log('🧹 Cleaning up timers - exercise stopped');
        clearAllTimers();
        setDisplayState('interval');
      };
    }
  }, [
    session.isRunning, 
    session.isPaused, 
    session.currentWordIndex, 
    session.words,
    session.settings.useMask,
    session.settings.maskDuration,
    session.settings.exposureDuration,
    session.settings.intervalDuration,
    session.settings.textCase,
    isCountingDown
  ]);

  const progress = calculateProgress(session.currentWordIndex, session.words.length);
  const accuracy = calculateAccuracy(session.currentWordIndex, session.errors);

  if (isCountingDown) {
    const currentTheme = themes.find(t => t.id === theme) || themes[3];
    
    return (
      <div className={`min-h-screen ${getThemeGradient(theme)} ${currentTheme.preview.background} flex items-center justify-center`}>
        <div className="text-center">
          <h1 className={`text-6xl font-bold mb-8 ${getTextShadow(theme)}`}>
            {countdown > 0 ? countdown : 'INIZIA!'}
          </h1>
          <p className={`text-xl ${getTextShadow(theme)} ${getCountdownTextColor(theme)}`}>
            Preparati a leggere le parole...
          </p>
        </div>
      </div>
    );
  }

  const currentTheme = themes.find(t => t.id === theme) || themes[3]; // Default rainbow

  return (
    <div className={`min-h-screen relative ${getThemeGradient(theme)} ${currentTheme.preview.background} flex flex-col overflow-hidden`}>
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
                    {currentWord}
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
                {/* Intervallo senza pulsazione per evitare prevedibilità */}
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
                     Progresso: {session.currentWordIndex + 1}/{session.words.length}
                   </p>
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Precisione: {Math.round(accuracy)}%
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
                  console.log('🛑 Stop button clicked - session.isRunning:', session.isRunning);
                  // Prima cancella tutti i timer attivi
                  clearAllTimers();
                  // Marca il componente come unmounted per prevenire memory leak
                  isMountedRef.current = false;
                  // Poi chiama onStop per aggiornare lo stato
                  onStop();
                  // Forza il reset dello stato di visualizzazione
                  safeSetState(() => {
                    setDisplayState('interval');
                    setStimulusVisible(false);
                  });
                  console.log('🛑 Stop button processed - all timers cleared');
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