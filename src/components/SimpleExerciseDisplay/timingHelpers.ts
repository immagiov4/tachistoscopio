import { PrecisionTimer, calculateVariableInterval } from '@/utils/precisionTiming';

export interface TimingConfig {
  exposureDuration: number;
  intervalDuration: number;
  intervalVariability: number;
  useMask: boolean;
  maskDuration: number;
}

export interface TimerCallbacks {
  onStimulusEnd: () => void;
  onTransitionEnd: () => void;
  onWordEnd: () => void;
  onMaskEnd: () => void;
  onIntervalEnd: () => void;
}

// Timing constants
const STIMULUS_DISPLAY_DURATION = 500;
const TRANSITION_DISPLAY_DURATION = 300;

// Type alias for timer management - now using PrecisionTimer
type TimerReference = PrecisionTimer | NodeJS.Timeout;

export const createStimulusTimer = (
  callback: () => void,
  addTimer: (timer: TimerReference) => TimerReference,
  shouldContinue?: () => boolean
): TimerReference => {
  const timer = new PrecisionTimer({
    duration: STIMULUS_DISPLAY_DURATION,
    onComplete: callback,
    phase: 'stimulus',
    shouldContinue,
  });
  timer.start();
  return addTimer(timer);
};

export const createTransitionTimer = (
  callback: () => void,
  addTimer: (timer: TimerReference) => TimerReference,
  shouldContinue?: () => boolean
): TimerReference => {
  const timer = new PrecisionTimer({
    duration: TRANSITION_DISPLAY_DURATION,
    onComplete: callback,
    phase: 'transition',
    shouldContinue,
  });
  timer.start();
  return addTimer(timer);
};

export const createWordTimer = (
  duration: number,
  callback: () => void,
  addTimer: (timer: TimerReference) => TimerReference,
  shouldContinue?: () => boolean
): TimerReference => {
  const timer = new PrecisionTimer({
    duration,
    onComplete: callback,
    phase: 'word',
    shouldContinue,
  });
  timer.start();
  return addTimer(timer);
};

export const createMaskTimer = (
  duration: number,
  callback: () => void,
  addTimer: (timer: TimerReference) => TimerReference,
  shouldContinue?: () => boolean
): TimerReference => {
  const timer = new PrecisionTimer({
    duration,
    onComplete: callback,
    phase: 'mask',
    shouldContinue,
  });
  timer.start();
  return addTimer(timer);
};

export const createIntervalTimer = (
  config: { duration: number; variability: number },
  callback: () => void,
  addTimer: (timer: TimerReference) => TimerReference,
  shouldContinue?: () => boolean
): TimerReference => {
  const actualInterval = calculateVariableInterval(config.duration, config.variability);
  const timer = new PrecisionTimer({
    duration: actualInterval,
    onComplete: callback,
    phase: 'interval',
    shouldContinue,
  });
  timer.start();
  return addTimer(timer);
};

export const shouldContinueRunning = (isRunningRef: React.MutableRefObject<boolean>): boolean => {
  return isRunningRef.current;
};

export interface DisplaySequenceParams {
  isRunningRef: React.MutableRefObject<boolean>;
  config: TimingConfig;
  addTimer: (timer: TimerReference) => TimerReference;
  setStimulusVisible: (visible: boolean) => void;
  setDisplayState: (state: 'countdown' | 'stimulus' | 'word' | 'mask' | 'interval') => void;
  setCurrentWord: (word: string) => void;
  nextWord: () => void;
  formatWord: (word: string, textCase: string) => string;
  currentWord: string;
  textCase: string;
}

export const startDisplaySequence = (params: DisplaySequenceParams) => {
  const {
    isRunningRef,
    config,
    addTimer,
    setStimulusVisible,
    setDisplayState,
    setCurrentWord,
    nextWord,
    formatWord,
    currentWord,
    textCase
  } = params;

  const shouldContinue = () => shouldContinueRunning(isRunningRef);

  // Step 1: Show stimulus
  setDisplayState('stimulus');
  setStimulusVisible(true);

  createStimulusTimer(() => {
    if (!shouldContinue()) return;
    
    setStimulusVisible(false);
    
    // Step 2: Transition
    createTransitionTimer(() => {
      if (!shouldContinue()) return;
      
      // Step 3: Show word
      setDisplayState('word');
      setCurrentWord(formatWord(currentWord, textCase));

      createWordTimer(config.exposureDuration, () => {
        if (!shouldContinue()) return;
        
        if (config.useMask) {
          handleMaskSequence(params);
        } else {
          handleIntervalSequence(params);
        }
      }, addTimer, shouldContinue);
    }, addTimer, shouldContinue);
  }, addTimer, shouldContinue);
};

const handleMaskSequence = (params: DisplaySequenceParams) => {
  const { isRunningRef, config, addTimer, setDisplayState } = params;
  const shouldContinue = () => shouldContinueRunning(isRunningRef);
  
  setDisplayState('mask');
  
  createMaskTimer(config.maskDuration, () => {
    if (!shouldContinue()) return;
    handleIntervalSequence(params);
  }, addTimer, shouldContinue);
};

const handleIntervalSequence = (params: DisplaySequenceParams) => {
  const { isRunningRef, config, addTimer, setDisplayState, nextWord } = params;
  const shouldContinue = () => shouldContinueRunning(isRunningRef);
  
  setDisplayState('interval');
  
  createIntervalTimer(
    {
      duration: config.intervalDuration,
      variability: config.intervalVariability
    },
    () => {
      if (!shouldContinue()) return;
      nextWord();
    },
    addTimer,
    shouldContinue
  );
};
