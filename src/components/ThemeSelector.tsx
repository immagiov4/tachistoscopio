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
      background: 'from-indigo-900 via-purple-900 to-blue-900',
      shapes: ['⭐', '🌙', '🌟', '✨']
    }
  },
  {
    id: 'nature',
    name: 'Natura',
    icon: '🌳',
    description: 'Foreste, fiori e animali',
    preview: {
      background: 'from-green-200 via-emerald-100 to-lime-100',
      shapes: ['🌸', '🦋', '🌿', '🐛']
    }
  },
  {
    id: 'ocean',
    name: 'Oceano',
    icon: '🌊',
    description: 'Mare, pesci e coralli',
    preview: {
      background: 'from-blue-300 via-cyan-200 to-teal-200',
      shapes: ['🐠', '🐙', '🌊', '⭐']
    }
  },
  {
    id: 'rainbow',
    name: 'Arcobaleno',
    icon: '🌈',
    description: 'Colori vivaci e gioia',
    preview: {
      background: 'from-pink-200 via-yellow-200 to-purple-200',
      shapes: ['🌈', '☀️', '🎈', '🎨']
    }
  },
  {
    id: 'clouds',
    name: 'Nuvole',
    icon: '☁️',
    description: 'Cielo sereno e dolcezza',
    preview: {
      background: 'from-sky-100 via-blue-50 to-indigo-100',
      shapes: ['☁️', '🌤️', '🕊️', '🎈']
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Tema dell'Esercizio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => (
            <Button
              key={theme.id}
              variant={selectedTheme === theme.id ? "default" : "outline"}
              onClick={() => onThemeChange(theme.id)}
              className="h-auto p-3 flex flex-col items-center gap-2"
            >
              <div className={`w-full h-12 rounded-lg bg-gradient-to-r ${theme.preview.background} flex items-center justify-center gap-1`}>
                {theme.preview.shapes.slice(0, 3).map((shape, index) => (
                  <span key={index} className="text-sm opacity-80">{shape}</span>
                ))}
              </div>
              <div className="text-center">
                <div className="text-lg">{theme.icon}</div>
                <div className="text-xs font-medium">{theme.name}</div>
              </div>
            </Button>
          ))}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
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