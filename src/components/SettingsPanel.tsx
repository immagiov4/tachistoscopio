import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Play, Eye, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  WordList,
  ExerciseSettings
} from '@/types/tachistoscope';

interface SettingsPanelProps {
  settings: ExerciseSettings;
  onSettingsChange: (settings: ExerciseSettings) => void;
  currentWordList: WordList;
  onWordListChange: (wordList: WordList) => void;
  onStartExercise: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  currentWordList,
  onWordListChange,
  onStartExercise
}) => {
  const { toast } = useToast();

  const handlePreview = () => {
    if (currentWordList.words.length === 0) {
      toast({
        title: "Nessuna parola disponibile",
        description: "Seleziona una lista di parole o aggiungi parole personalizzate prima.",
        variant: "destructive",
      });
      return;
    }

    // Show a preview of the first word with current settings
    const previewWord = currentWordList.words[0];
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: hsl(var(--exercise-bg));
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
    `;

    const textElement = document.createElement('div');
    textElement.textContent = settings.textCase === 'uppercase' ? previewWord.toUpperCase() : 
                              settings.textCase === 'lowercase' ? previewWord.toLowerCase() : 
                              previewWord;
    textElement.style.cssText = `
      color: hsl(var(--exercise-text));
      font-size: ${getFontSize(settings.fontSize)};
      font-weight: 600;
      text-align: center;
    `;

    overlay.appendChild(textElement);
    document.body.appendChild(overlay);

    setTimeout(() => {
      if (settings.useMask) {
        textElement.textContent = '#'.repeat(previewWord.length);
        textElement.style.color = 'hsl(var(--exercise-mask))';
        setTimeout(() => {
          document.body.removeChild(overlay);
        }, settings.maskDuration);
      } else {
        document.body.removeChild(overlay);
      }
    }, settings.exposureDuration);

    toast({
      title: "Anteprima mostrata",
      description: `Parola "${previewWord}" mostrata per ${settings.exposureDuration}ms`,
    });
  };

  const getFontSize = (size: string) => {
    switch (size) {
      case 'small': return '2rem';
      case 'medium': return '3rem';
      case 'large': return '4rem';
      case 'extra-large': return '6rem';
      default: return '4rem';
    }
  };

  const handleStartClick = () => {
    if (currentWordList.words.length === 0) {
      toast({
        title: "Impossibile iniziare l'esercizio",
        description: "Seleziona una lista di parole o aggiungi parole personalizzate prima.",
        variant: "destructive",
      });
      return;
    }
    onStartExercise();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Lista Parole</CardTitle>
          <CardDescription>
            Usa il gestore liste per creare liste personalizzate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lista Attuale</Label>
              <Badge variant="secondary">
                {currentWordList.words.length} parole
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentWordList.description}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impostazioni Visualizzazione</CardTitle>
          <CardDescription>
            Configura come vengono mostrate le parole durante gli esercizi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Durata Esposizione: {settings.exposureDuration}ms</Label>
            <Slider
              value={[settings.exposureDuration]}
              onValueChange={([value]) => 
                onSettingsChange({ ...settings, exposureDuration: value })
              }
              min={50}
              max={2000}
              step={50}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Quanto tempo ogni parola è visibile (50-2000ms)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Durata Intervallo: {settings.intervalDuration}ms</Label>
            <Slider
              value={[settings.intervalDuration]}
              onValueChange={([value]) => 
                onSettingsChange({ ...settings, intervalDuration: value })
              }
              min={0}
              max={1000}
              step={50}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Pausa tra le parole (0-1000ms)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dimensione Font</Label>
              <Select
                value={settings.fontSize}
                onValueChange={(value: any) => 
                  onSettingsChange({ ...settings, fontSize: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Piccolo</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                  <SelectItem value="extra-large">Extra Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Formato Testo</Label>
              <Select
                value={settings.textCase}
                onValueChange={(value: any) => 
                  onSettingsChange({ ...settings, textCase: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Originale</SelectItem>
                  <SelectItem value="uppercase">MAIUSCOLO</SelectItem>
                  <SelectItem value="lowercase">minuscolo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Usa Mascheratura</Label>
                <p className="text-xs text-muted-foreground">
                  Mostra pattern dopo ogni parola
                </p>
              </div>
              <Switch
                checked={settings.useMask}
                onCheckedChange={(checked) => 
                  onSettingsChange({ ...settings, useMask: checked })
                }
              />
            </div>

            {settings.useMask && (
              <div className="space-y-2">
                <Label>Durata Maschera: {settings.maskDuration}ms</Label>
                <Slider
                  value={[settings.maskDuration]}
                  onValueChange={([value]) => 
                    onSettingsChange({ ...settings, maskDuration: value })
                  }
                  min={50}
                  max={500}
                  step={25}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardContent className="pt-6">
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handlePreview}
              variant="outline"
              size="lg"
              disabled={currentWordList.words.length === 0}
            >
              <Eye className="mr-2 h-4 w-4" />
              Anteprima
            </Button>
            <Button
              onClick={handleStartClick}
              size="lg"
              disabled={currentWordList.words.length === 0}
            >
              <Play className="mr-2 h-4 w-4" />
              Inizia Esercizio
            </Button>
          </div>
          <div className="flex items-center justify-center mt-4 text-sm text-muted-foreground">
            <Info className="mr-2 h-4 w-4" />
            Premi X durante l'esercizio per segnare parole scorrette
          </div>
        </CardContent>
      </Card>
    </div>
  );
};