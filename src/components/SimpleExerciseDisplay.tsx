import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, X } from 'lucide-react';

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
}

export const SimpleExerciseDisplay: React.FC<SimpleExerciseDisplayProps> = ({
  session,
  onComplete,
  onStop,
  onUpdateSession,
}) => {
  const [displayState, setDisplayState] = useState<'countdown' | 'word' | 'mask' | 'interval'>('countdown');
  const [currentWord, setCurrentWord] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(true);

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

  const markError = useCallback(() => {
    onUpdateSession({
      ...session,
      errors: [...session.errors, session.currentWordIndex]
    });
  }, [session, onUpdateSession]);

  const nextWord = useCallback(() => {
    const newIndex = session.currentWordIndex + 1;
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

    onUpdateSession({
      ...session,
      currentWordIndex: newIndex
    });
  }, [session, onComplete, onUpdateSession]);

  const pauseResume = useCallback(() => {
    onUpdateSession({
      ...session,
      isPaused: !session.isPaused
    });
  }, [session, onUpdateSession]);

  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isCountingDown && countdown === 0) {
      setIsCountingDown(false);
      onUpdateSession({ ...session, isRunning: true });
    }
  }, [countdown, isCountingDown, session, onUpdateSession]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!session.isRunning) return;
      if (event.key === 'x' || event.key === 'X') markError();
      if (event.key === 'Escape') onStop();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [session.isRunning, markError, onStop]);

  useEffect(() => {
    const currentWordToShow = session.words[session.currentWordIndex];
    
    if (session.isRunning && !session.isPaused && currentWordToShow) {
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
    }
  }, [session, nextWord, formatWord]);

  const progress = (session.currentWordIndex / session.words.length) * 100;
  const accuracy = session.currentWordIndex > 0 ? 
    ((session.currentWordIndex - session.errors.length) / session.currentWordIndex) * 100 : 100;

  if (isCountingDown) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-primary mb-8">
            {countdown > 0 ? countdown : 'INIZIA!'}
          </h1>
          <p className="text-xl text-muted-foreground">
            Preparati a leggere le parole...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center relative">
        {!session.isPaused ? (
          <div className="text-center">
            <div className={`font-bold text-foreground ${getFontSize(session.settings.fontSize)} min-h-[200px] flex items-center justify-center`}>
              {displayState === 'word' && currentWord}
              {displayState === 'mask' && '####'}
              {displayState === 'interval' && ' '}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <p className="text-2xl font-bold text-primary">ESERCIZIO IN PAUSA</p>
            <Button onClick={pauseResume} size="lg" className="text-lg min-h-[60px] px-8">
              <Play className="mr-2 h-6 w-6" />
              Riprendi Esercizio
            </Button>
          </div>
        )}

        <div className="absolute top-4 left-4 right-4 bg-card p-4 rounded-lg shadow-sm">
          <div className="text-center space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">
              Progresso: {session.currentWordIndex}/{session.words.length}
            </p>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
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
            <Button onClick={markError} variant="destructive" size="lg" className="flex items-center gap-2 min-w-[120px] touch-manipulation">
              <X className="h-5 w-5" />Errore
            </Button>
          </div>
        </div>

        <div className="text-center text-muted-foreground mt-4 absolute bottom-4">
          <p>Comandi: <kbd className="px-2 py-1 bg-muted rounded text-xs">X</kbd> = Marca errore | Usa i pulsanti per controllare</p>
        </div>
      </div>
    </div>
  );
};