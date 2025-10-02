import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExerciseSettings as Settings } from '@/types/database';

interface ExerciseSettingsProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export const ExerciseSettings: React.FC<ExerciseSettingsProps> = ({
  settings,
  onSettingsChange
}) => {
  return (
    <details className="border rounded-lg">
      <summary className="p-3 cursor-pointer hover:bg-gray-50 text-sm font-medium">
        Impostazioni frequenza parola
      </summary>
      <div className="p-3 pt-0 border-t">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Esposizione (ms)</Label>
            <Input
              type="number"
              min="50"
              max="1000"
              step="25"
              value={settings.exposureDuration}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  exposureDuration: parseInt(e.target.value) || 150
                })
              }
              className="h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Pausa (ms)</Label>
            <Input
              type="number"
              min="200"
              max="2000"
              step="100"
              value={settings.intervalDuration}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  intervalDuration: parseInt(e.target.value) || 800
                })
              }
              className="h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Formato</Label>
            <Select
              value={settings.textCase}
              onValueChange={(value) =>
                onSettingsChange({
                  ...settings,
                  textCase: value as any
                })
              }
            >
              <SelectTrigger className="h-8">
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

        <div className="mt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useMask"
                checked={settings.useMask}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    useMask: e.target.checked
                  })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="useMask" className="text-xs">
                Usa maschera
              </Label>
            </div>

            {settings.useMask && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-600">Durata:</Label>
                <Input
                  type="number"
                  min="50"
                  max="1000"
                  value={settings.maskDuration}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      maskDuration: parseInt(e.target.value) || 100
                    })
                  }
                  className="h-7 w-20 text-sm"
                />
                <span className="text-xs text-gray-500">ms</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </details>
  );
};
