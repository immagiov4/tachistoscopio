import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Pause, Play, Square, SkipForward } from 'lucide-react';
import { ExerciseSession } from '@/types/tachistoscope';

interface ExerciseDisplayProps {
  session: ExerciseSession;
  onComplete: (session: ExerciseSession) => void;
  onStop: () => void;
  onUpdateSession: (session: ExerciseSession) => void;
}

export const ExerciseDisplay: React.FC<ExerciseDisplayProps> = ({
  session,
  onComplete,
  onStop,
  onUpdateSession
}) => {
  const [displayState, setDisplayState] = useState<'word' | 'mask' | 'interval'>('interval');
  const [currentWord, setCurrentWord] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(true);

  const getFontSize = (size: string) => {
    switch (size) {
      case 'small': return 'text-4xl';
      case 'medium': return 'text-6xl';
      case 'large': return 'text-8xl';
      case 'extra-large': return 'text-9xl';
      default: return 'text-8xl';
    }
  };

  const formatWord = useCallback((word: string) => {
    switch (session.settings.textCase) {
      case 'uppercase': return word.toUpperCase();
      case 'lowercase': return word.toLowerCase();
      default: return word;
    }
  }, [session.settings.textCase]);

  const markError = useCallback(() => {
    if (displayState === 'word' && !session.errors.includes(session.currentWordIndex)) {
      const updatedSession = {
        ...session,
        errors: [...session.errors, session.currentWordIndex]
      };
      onUpdateSession(updatedSession);
    }
  }, [displayState, session, onUpdateSession]);

  const nextWord = useCallback(() => {
    const nextIndex = session.currentWordIndex + 1;
    if (nextIndex >= session.wordList.words.length) {
      // Exercise complete
      onComplete(session);
      return;
    }

    const updatedSession = {
      ...session,
      currentWordIndex: nextIndex
    };
    onUpdateSession(updatedSession);
  }, [session, onComplete, onUpdateSession]);

  const pauseResume = useCallback(() => {
    const updatedSession = {
      ...session,
      isPaused: !session.isPaused
    };
    onUpdateSession(updatedSession);
  }, [session, onUpdateSession]);

  // Handle keyboard input for error marking
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'x') {
        markError();
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (isCountingDown) return;
        if (session.isPaused) {
          pauseResume();
        }
      } else if (event.key === 'Escape') {
        onStop();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [markError, pauseResume, session.isPaused, isCountingDown, onStop]);

  // Countdown effect
  useEffect(() => {
    console.log('Countdown effect:', { countdown, isCountingDown });
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => {
        console.log('Countdown timer fired, new value:', countdown - 1);
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isCountingDown && countdown === 0) {
      console.log('Countdown finished, setting isCountingDown to false');
      setIsCountingDown(false);
    }
  }, [countdown, isCountingDown]);

  // Main exercise timing effect
  useEffect(() => {
    console.log('Main exercise effect:', { 
      isCountingDown, 
      isPaused: session.isPaused, 
      currentWordIndex: session.currentWordIndex,
      wordListLength: session.wordList.words.length 
    });
    
    if (isCountingDown || session.isPaused) {
      console.log('Skipping exercise effect - counting down or paused');
      return;
    }

    if (session.currentWordIndex >= session.wordList.words.length) {
      console.log('Exercise should be complete, currentWordIndex:', session.currentWordIndex);
      onComplete(session);
      return;
    }

    const currentWordText = session.wordList.words[session.currentWordIndex];
    console.log('Starting exercise for word:', currentWordText);
    setCurrentWord(formatWord(currentWordText));

    let timeoutId: NodeJS.Timeout;

    // Show word
    setDisplayState('word');
    
    timeoutId = setTimeout(() => {
      if (session.settings.useMask) {
        // Show mask
        setCurrentWord('#'.repeat(currentWordText.length));
        setDisplayState('mask');
        
        timeoutId = setTimeout(() => {
          // Show interval
          setCurrentWord('');
          setDisplayState('interval');
          
          timeoutId = setTimeout(() => {
            nextWord();
          }, session.settings.intervalDuration);
        }, session.settings.maskDuration);
      } else {
        // Show interval
        setCurrentWord('');
        setDisplayState('interval');
        
        timeoutId = setTimeout(() => {
          nextWord();
        }, session.settings.intervalDuration);
      }
    }, session.settings.exposureDuration);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [session, isCountingDown, formatWord, nextWord]);

  const progress = ((session.currentWordIndex + 1) / session.wordList.words.length) * 100;
  const errorsCount = session.errors.length;
  const accuracy = session.currentWordIndex > 0 ? 
    ((session.currentWordIndex + 1 - errorsCount) / (session.currentWordIndex + 1)) * 100 : 100;

  if (isCountingDown) {
    return (
      <div className="fixed inset-0 bg-exercise-bg flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-9xl font-bold text-exercise-text mb-4">
            {countdown > 0 ? countdown : 'GO!'}
          </div>
          <div className="text-xl text-muted-foreground">
            Get ready...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-exercise-bg flex flex-col z-50">
      {/* Control Bar */}
      <div className="bg-card border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{session.wordList.name}</h2>
            <div className="text-sm text-muted-foreground">
              Word {session.currentWordIndex + 1} of {session.wordList.words.length}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Errors: {errorsCount} | Accuracy: {accuracy.toFixed(1)}%
            </div>
            <div className="flex gap-2">
              <Button onClick={pauseResume} variant="outline" size="sm">
                {session.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button onClick={onStop} variant="outline" size="sm">
                <Square className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto mt-4">
          <Progress value={progress} className="w-full h-2" />
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex items-center justify-center">
        {session.isPaused ? (
          <div className="text-center">
            <div className="text-6xl mb-4">⏸️</div>
            <div className="text-2xl font-semibold text-muted-foreground mb-2">
              Exercise Paused
            </div>
            <div className="text-muted-foreground">
              Press Space or click Play to continue
            </div>
          </div>
        ) : (
          <div 
            className={`
              ${getFontSize(session.settings.fontSize)} 
              font-bold text-exercise-text text-center
              ${displayState === 'mask' ? 'text-exercise-mask' : ''}
              transition-all duration-75
            `}
          >
            {currentWord}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-card border-t p-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Press <kbd className="px-2 py-1 bg-muted rounded text-xs">X</kbd> if word is read incorrectly • 
          <kbd className="px-2 py-1 bg-muted rounded text-xs mx-1">Space</kbd> to pause/resume • 
          <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> to stop
        </div>
      </div>
    </div>
  );
};