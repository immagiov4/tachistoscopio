import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';

interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
}

interface AccessibilitySettingsProps {
  onSettingsChange: (settings: AccessibilitySettings) => void;
  initialSettings?: AccessibilitySettings;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  onSettingsChange,
  initialSettings
}) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    initialSettings || { fontSize: 'large' }
  );

  const fontSizeOptions = [
    { value: 'small', label: 'Piccolo', example: 'text-4xl' },
    { value: 'medium', label: 'Medio', example: 'text-6xl' },
    { value: 'large', label: 'Grande', example: 'text-8xl' },
    { value: 'extra-large', label: 'Extra Grande', example: 'text-9xl' }
  ];

  const handleFontSizeChange = (fontSize: string) => {
    const newSettings = { 
      ...settings, 
      fontSize: fontSize as AccessibilitySettings['fontSize']
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
    
    // Salva nelle preferenze del browser
    localStorage.setItem('tachistoscope-accessibility', JSON.stringify(newSettings));
  };

  useEffect(() => {
    // Carica dalle preferenze del browser
    const saved = localStorage.getItem('tachistoscope-accessibility');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(parsedSettings);
        onSettingsChange(parsedSettings);
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    }
  }, [onSettingsChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Impostazioni di Accessibilità
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-medium">
            Dimensione del Testo durante l'Esercizio
          </label>
          <Select value={settings.fontSize} onValueChange={handleFontSizeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontSizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    <span className={`ml-4 font-bold ${option.example}`}>Aa</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Scegli la dimensione del testo che ti risulta più comoda per la lettura
          </p>
        </div>

        <div className="pt-4 border-t">
          <div className="text-center">
            <p className={`font-bold ${
              settings.fontSize === 'small' ? 'text-4xl' :
              settings.fontSize === 'medium' ? 'text-6xl' :
              settings.fontSize === 'large' ? 'text-8xl' :
              'text-9xl'
            }`}>
              ANTEPRIMA
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Così appariranno le parole durante l'esercizio
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};