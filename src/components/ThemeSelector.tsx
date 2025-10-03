import React from 'react';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';

export type ThemeType = 'space' | 'nature' | 'ocean' | 'rainbow' | 'clouds';

export interface Theme {
  id: ThemeType;
  name: string;
  icon: string;
  description: string;
  preview: {
    background: string;
    shapes: string[];
  };
}

export const themes: Theme[] = [
  {
    id: 'space',
    name: 'Spazio',
    icon: '🚀',
    description: 'Stelle, pianeti e galassie',
    preview: {
      background: 'from-indigo-300 via-purple-300 via-blue-300 to-violet-400',
      shapes: ['🌟']
    }
  },
  {
    id: 'nature',
    name: 'Natura',
    icon: '🌳',
    description: 'Foreste, fiori e animali',
    preview: {
      background: 'from-emerald-200 via-teal-200 via-green-200 to-lime-300',
      shapes: ['🦋']
    }
  },
  {
    id: 'ocean',
    name: 'Oceano',
    icon: '🌊',
    description: 'Mare, pesci e coralli',
    preview: {
      background: 'from-cyan-200 via-blue-200 via-sky-200 to-teal-300',
      shapes: ['🐠']
    }
  },
  {
    id: 'rainbow',
    name: 'Arcobaleno',
    icon: '🌈',
    description: 'Colori vivaci e gioia',
    preview: {
      background: 'from-pink-200 via-rose-200 via-orange-200 via-yellow-200 via-green-200 via-blue-200 to-purple-300',
      shapes: ['🌈']
    }
  },
  {
    id: 'clouds',
    name: 'Nuvole',
    icon: '☁️',
    description: 'Cielo sereno e dolcezza',
    preview: {
      background: 'from-sky-100 via-blue-100 via-indigo-100 to-purple-200',
      shapes: ['☁️']
    }
  }
];

interface ThemeSelectorProps {
  selectedTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  selectedTheme,
  onThemeChange
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="h-5 w-5 text-primary" />
        <h4 className="font-medium text-gray-800">Tema dell'Esercizio</h4>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {themes.map((theme) => (
          <Button
            key={theme.id}
            variant="outline"
            onClick={() => onThemeChange(theme.id)}
            className={`h-auto p-3 flex flex-col items-center gap-2 hover:bg-white/80 border-2 transition-all duration-200 hover:scale-105 hover:shadow-md ${
              selectedTheme === theme.id 
                ? 'border-primary bg-primary/5 shadow-md scale-105 ring-2 ring-primary/20' 
                : 'border-gray-200 hover:border-primary/50 bg-white/60'
            }`}
          >
            <div className={`w-full h-10 rounded-lg ${
              theme.id === 'rainbow' ? 'bg-gradient-to-r' : 
              theme.id === 'space' ? 'bg-gradient-to-br' :
              theme.id === 'ocean' ? 'bg-gradient-to-tr' :
              'bg-gradient-to-r'
            } ${theme.preview.background} flex items-center justify-center shadow-inner border border-white/20`}>
              <span className="text-lg opacity-90">{theme.icon}</span>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-800">{theme.name}</div>
            </div>
          </Button>
        ))}
      </div>
      
      <div className="text-center bg-blue-50/80 rounded-lg p-3 border border-blue-200/50">
        <p className="text-sm text-blue-700 font-medium">
          Il tema scelto influenzerà lo sfondo durante l'esercizio
        </p>
      </div>
    </div>
  );
};