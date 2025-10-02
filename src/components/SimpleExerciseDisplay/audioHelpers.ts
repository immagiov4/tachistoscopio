export const playErrorSound = () => {
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
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
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
