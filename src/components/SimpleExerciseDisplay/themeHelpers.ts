import { ThemeType } from '../ThemeSelector';

export const getThemeShadow = (themeId: ThemeType) => {
  switch(themeId) {
    case 'space': return 'drop-shadow-[0_0_50px_rgba(255,255,255,0.15)]';
    case 'nature': return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.1)]';
    case 'ocean': return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.12)]';
    case 'rainbow': return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.15)]';
    case 'clouds': return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.1)]';
    default: return 'drop-shadow-[0_0_50px_rgba(0,0,0,0.1)]';
  }
};

export const getTextShadow = (themeId: ThemeType) => {
  switch(themeId) {
    case 'space': return 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]';
    case 'nature': return 'text-gray-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]';
    case 'ocean': return 'text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.6)]';
    case 'rainbow': return 'text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.7)]';
    case 'clouds': return 'text-gray-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]';
    default: return 'text-white drop-shadow-lg';
  }
};

export const getWordShadow = (themeId: ThemeType) => {
  switch(themeId) {
    case 'space': return 'drop-shadow-[0_0_60px_rgba(255,255,255,0.2)] drop-shadow-[0_0_120px_rgba(255,255,255,0.15)]';
    case 'nature': return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.25)] drop-shadow-[0_0_120px_rgba(0,0,0,0.2)]';
    case 'ocean': return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.3)] drop-shadow-[0_0_120px_rgba(0,0,0,0.2)]';
    case 'rainbow': return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.35)] drop-shadow-[0_0_120px_rgba(0,0,0,0.25)]';
    case 'clouds': return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.25)] drop-shadow-[0_0_120px_rgba(0,0,0,0.2)]';
    default: return 'drop-shadow-[0_0_60px_rgba(0,0,0,0.25)]';
  }
};

export const getFontSize = (size: string): string => {
  switch (size) {
    case 'small': return 'text-2xl md:text-4xl';
    case 'medium': return 'text-4xl md:text-6xl';
    case 'large': return 'text-5xl md:text-8xl';
    case 'extra-large': return 'text-6xl md:text-9xl';
    default: return 'text-5xl md:text-8xl';
  }
};
