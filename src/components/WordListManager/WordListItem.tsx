import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import { WordList } from '@/types/tachistoscope';
import { ExerciseSettings } from '@/types/database';

interface WordListItemProps {
  list: WordList;
  isEditing: boolean;
  exerciseSettings: ExerciseSettings;
  onEdit: (list: WordList) => void;
  onDelete: (listId: string) => void;
}

export const WordListItem: React.FC<WordListItemProps> = ({
  list,
  isEditing,
  exerciseSettings,
  onEdit,
  onDelete
}) => {
  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dataToExport = {
      name: list.name,
      description: list.description,
      words: list.words,
      settings: exerciseSettings
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${list.name.toLowerCase().replace(/\s+/g, '_')}_esercizio.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(list.id);
  };

  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
        isEditing ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onEdit(list)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-gray-900 truncate">{list.name}</h4>
          <p className="text-xs text-gray-500">{list.words.length} parole</p>
          {list.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{list.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={handleExport} className="h-6 w-6 p-0">
            <Download className="h-3 w-3" />
          </Button>
          <Button variant="delete" size="sm" onClick={handleDelete} className="h-6 w-6 p-0">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
