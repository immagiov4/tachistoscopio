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
const MIN_INTERVAL_DURATION = 50;

export const createStimulusTimer = (
  callback: () => void,
  addTimer: (timer: NodeJS.Timeout) => NodeJS.Timeout
): NodeJS.Timeout => {
  return addTimer(setTimeout(callback, STIMULUS_DISPLAY_DURATION));
};

export const createTransitionTimer = (
  callback: () => void,
  addTimer: (timer: NodeJS.Timeout) => NodeJS.Timeout
): NodeJS.Timeout => {
  return addTimer(setTimeout(callback, TRANSITION_DISPLAY_DURATION));
};

export const createWordTimer = (
  duration: number,
  callback: () => void,
  addTimer: (timer: NodeJS.Timeout) => NodeJS.Timeout
): NodeJS.Timeout => {
  return addTimer(setTimeout(callback, duration));
};

export const createMaskTimer = (
  duration: number,
  callback: () => void,
  addTimer: (timer: NodeJS.Timeout) => NodeJS.Timeout
): NodeJS.Timeout => {
  return addTimer(setTimeout(callback, duration));
};

export const createIntervalTimer = (
  config: { duration: number; variability: number },
  callback: () => void,
  addTimer: (timer: NodeJS.Timeout) => NodeJS.Timeout
): NodeJS.Timeout => {
  const randomVariation = Math.random() * config.variability * 2 - config.variability;
  const actualInterval = Math.max(MIN_INTERVAL_DURATION, config.duration + randomVariation);
  return addTimer(setTimeout(callback, actualInterval));
};

export const shouldContinueRunning = (isRunningRef: React.MutableRefObject<boolean>): boolean => {
  return isRunningRef.current;
};

export interface DisplaySequenceParams {
  isRunningRef: React.MutableRefObject<boolean>;
  config: TimingConfig;
  addTimer: (timer: NodeJS.Timeout) => NodeJS.Timeout;
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

  // Step 1: Show stimulus
  setDisplayState('stimulus');
  setStimulusVisible(true);

  createStimulusTimer(() => {
    if (!shouldContinueRunning(isRunningRef)) return;
    
    setStimulusVisible(false);
    
    // Step 2: Transition
    createTransitionTimer(() => {
      if (!shouldContinueRunning(isRunningRef)) return;
      
      // Step 3: Show word
      setDisplayState('word');
      setCurrentWord(formatWord(currentWord, textCase));

      createWordTimer(config.exposureDuration, () => {
        if (!shouldContinueRunning(isRunningRef)) return;
        
        if (config.useMask) {
          handleMaskSequence(params);
        } else {
          handleIntervalSequence(params);
        }
      }, addTimer);
    }, addTimer);
  }, addTimer);
};

const handleMaskSequence = (params: DisplaySequenceParams) => {
  const { isRunningRef, config, addTimer, setDisplayState } = params;
  
  setDisplayState('mask');
  
  createMaskTimer(config.maskDuration, () => {
    if (!shouldContinueRunning(isRunningRef)) return;
    handleIntervalSequence(params);
  }, addTimer);
};

const handleIntervalSequence = (params: DisplaySequenceParams) => {
  const { isRunningRef, config, addTimer, setDisplayState, nextWord } = params;
  
  setDisplayState('interval');
  
  createIntervalTimer(
    {
      duration: config.intervalDuration,
      variability: config.intervalVariability
    },
    () => {
      if (!shouldContinueRunning(isRunningRef)) return;
      nextWord();
    },
    addTimer
  );
};
