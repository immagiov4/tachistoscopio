import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { GeneratorParams } from '../WordListManager/generatorHelpers';

interface GeneratorTabProps {
  generatorParams: GeneratorParams;
  generatedWords: string[];
  isGenerating: boolean;
  onParamsChange: (params: GeneratorParams) => void;
  onRegenerate: () => void;
}

export const GeneratorTab: React.FC<GeneratorTabProps> = ({
  generatorParams,
  generatedWords,
  isGenerating,
  onParamsChange,
  onRegenerate
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-gray-700">Tipo</Label>
          <Select
            value={generatorParams.type}
            onValueChange={(value) =>
              onParamsChange({ ...generatorParams, type: value as any })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="words">Parole</SelectItem>
              <SelectItem value="syllables">Sillabe</SelectItem>
              <SelectItem value="nonwords">Non-parole</SelectItem>
              <SelectItem value="minimal-pairs">Coppie minime</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700">Quantità</Label>
          <Input
            type="number"
            min="5"
            max="50"
            value={generatorParams.count}
            onChange={(e) =>
              onParamsChange({ ...generatorParams, count: parseInt(e.target.value) || 10 })
            }
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-medium text-gray-700">Sillabe</Label>
          <Select
            value={generatorParams.syllableCount}
            onValueChange={(value) =>
              onParamsChange({ ...generatorParams, syllableCount: value })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 sillabe</SelectItem>
              <SelectItem value="3">3 sillabe</SelectItem>
              <SelectItem value="4">4 sillabe</SelectItem>
              <SelectItem value="5">5 sillabe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700">Inizia con</Label>
          <Input
            placeholder="es. ca"
            value={generatorParams.startsWith}
            onChange={(e) =>
              onParamsChange({ ...generatorParams, startsWith: e.target.value })
            }
            className="h-9"
          />
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700">Contiene</Label>
          <Input
            placeholder="es. ar"
            value={generatorParams.contains}
            onChange={(e) =>
              onParamsChange({ ...generatorParams, contains: e.target.value })
            }
            className="h-9"
          />
        </div>
      </div>

      {isGenerating ? (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-center mb-3">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="ml-3 text-sm font-medium text-blue-700">
              Generazione parole in corso...
            </span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full animate-pulse"
              style={{ width: '100%' }}
            ></div>
          </div>
          <p className="text-xs text-blue-600 text-center mt-2">Ricerca nel dizionario...</p>
        </div>
      ) : generatedWords.length > 0 ? (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Parole generate ({generatedWords.length})
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onRegenerate}
              disabled={isGenerating}
              className="h-7 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Aggiorna
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 w-full">
            {generatedWords.map((word, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {word}
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="text-gray-500 text-sm">
            Modifica i parametri sopra per generare automaticamente le parole
          </p>
        </div>
      )}
    </div>
  );
};
