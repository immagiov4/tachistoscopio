import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';

export type ThemeType = 'space' | 'nature' | 'ocean' | 'rainbow' | 'clouds';

interface Theme {
  id: ThemeType;
  name: string;
  icon: string;
  description: string;
  preview: {
    background: string;
    shapes: string[];
  };
}

const themes: Theme[] = [
  {
    id: 'space',
    name: 'Spazio',
    icon: '🚀',
    description: 'Stelle, pianeti e galassie',
    preview: {
      background: 'from-indigo-900 via-purple-800 via-blue-900 to-violet-800',
      shapes: ['🌟'] // Emoji principale per lo stimolo
    }
  },
  {
    id: 'nature',
    name: 'Natura',
    icon: '🌳',
    description: 'Foreste, fiori e animali',
    preview: {
      background: 'from-emerald-400 via-teal-300 via-green-300 to-lime-400',
      shapes: ['🦋'] // Emoji principale per lo stimolo
    }
  },
  {
    id: 'ocean',
    name: 'Oceano',
    icon: '🌊',
    description: 'Mare, pesci e coralli',
    preview: {
      background: 'from-cyan-400 via-blue-500 via-indigo-400 to-teal-500',
      shapes: ['🐠'] // Emoji principale per lo stimolo
    }
  },
  {
    id: 'rainbow',
    name: 'Arcobaleno',
    icon: '🌈',
    description: 'Colori vivaci e gioia',
    preview: {
      background: 'from-pink-400 via-rose-300 via-orange-300 via-yellow-300 via-green-300 via-blue-300 to-purple-400',
      shapes: ['🌈'] // Emoji principale per lo stimolo
    }
  },
  {
    id: 'clouds',
    name: 'Nuvole',
    icon: '☁️',
    description: 'Cielo sereno e dolcezza',
    preview: {
      background: 'from-sky-300 via-blue-200 via-indigo-200 to-purple-200',
      shapes: ['☁️'] // Emoji principale per lo stimolo
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
    <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Tema dell'Esercizio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {themes.map((theme) => (
            <Button
              key={theme.id}
              variant="outline"
              onClick={() => onThemeChange(theme.id)}
              className={`h-auto p-2 flex flex-col items-center gap-1 hover:bg-transparent border-2 transition-colors ${
                selectedTheme === theme.id 
                  ? 'border-blue-500 border-4' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className={`w-full h-8 rounded ${
                theme.id === 'rainbow' ? 'bg-gradient-to-r' : 
                theme.id === 'space' ? 'bg-gradient-to-br' :
                theme.id === 'ocean' ? 'bg-gradient-to-tr' :
                'bg-gradient-to-r'
              } ${theme.preview.background} flex items-center justify-center shadow-inner`}>
                <span className="text-xs opacity-80">{theme.icon}</span>
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-gray-700">{theme.name}</div>
              </div>
            </Button>
          ))}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-600">
            Il tema scelto influenzerà lo sfondo durante l'esercizio
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Export dei temi per uso in altri componenti
export { themes };
export type { Theme };