import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Upload, Download, Plus, Trash2, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  WordList,
  PREDEFINED_WORD_LISTS
} from '@/types/tachistoscope';

interface WordListManagerProps {
  currentWordList: WordList;
  onWordListChange: (wordList: WordList) => void;
}

export const WordListManager: React.FC<WordListManagerProps> = ({
  currentWordList,
  onWordListChange
}) => {
  const [customWords, setCustomWords] = useState('');
  const [customListName, setCustomListName] = useState('Custom List');
  const { toast } = useToast();

  const handleCreateCustomList = () => {
    if (!customWords.trim()) {
      toast({
        title: "No words entered",
        description: "Please enter some words to create a custom list.",
        variant: "destructive",
      });
      return;
    }

    // Parse words from textarea (split by commas, newlines, or spaces)
    const words = customWords
      .split(/[,\n\s]+/)
      .map(word => word.trim())
      .filter(word => word.length > 0);

    if (words.length === 0) {
      toast({
        title: "No valid words found",
        description: "Please enter valid words separated by commas, spaces, or new lines.",
        variant: "destructive",
      });
      return;
    }

    const customList: WordList = {
      id: 'custom-' + Date.now(),
      name: customListName || 'Custom List',
      description: `Custom list with ${words.length} words`,
      words: words
    };

    onWordListChange(customList);
    toast({
      title: "Custom list created",
      description: `Created "${customList.name}" with ${words.length} words.`,
    });
  };

  const handleLoadPredefinedList = (listId: string) => {
    const list = PREDEFINED_WORD_LISTS.find(l => l.id === listId);
    if (list) {
      onWordListChange(list);
      toast({
        title: "Word list loaded",
        description: `Loaded "${list.name}" with ${list.words.length} words.`,
      });
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCustomWords(content);
      setCustomListName(file.name.replace(/\.[^/.]+$/, "") || 'Imported List');
    };
    reader.readAsText(file);
  };

  const handleExportList = () => {
    if (currentWordList.words.length === 0) {
      toast({
        title: "No words to export",
        description: "The current word list is empty.",
        variant: "destructive",
      });
      return;
    }

    const content = currentWordList.words.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentWordList.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "List exported",
      description: `"${currentWordList.name}" has been downloaded.`,
    });
  };

  const handleClearCustomWords = () => {
    setCustomWords('');
    setCustomListName('Custom List');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Word List Manager
          </CardTitle>
          <CardDescription>
            Create custom word lists or select from predefined options
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Predefined Lists</CardTitle>
            <CardDescription>
              Choose from curated word lists for different skill levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PREDEFINED_WORD_LISTS.map((list) => (
              <div key={list.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{list.name}</h4>
                  <Badge variant="secondary">{list.words.length} words</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{list.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {list.words.slice(0, 8).map((word, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {word}
                    </Badge>
                  ))}
                  {list.words.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{list.words.length - 8} more
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => handleLoadPredefinedList(list.id)}
                  variant={currentWordList.id === list.id ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                >
                  {currentWordList.id === list.id ? 'Currently Selected' : 'Select This List'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Custom List</CardTitle>
            <CardDescription>
              Enter your own words or import from a file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name</Label>
              <input
                id="list-name"
                type="text"
                value={customListName}
                onChange={(e) => setCustomListName(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                placeholder="Enter list name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-words">Words</Label>
              <Textarea
                id="custom-words"
                value={customWords}
                onChange={(e) => setCustomWords(e.target.value)}
                placeholder="Enter words separated by commas, spaces, or new lines.&#10;&#10;Example:&#10;cat, dog, run&#10;big red sun&#10;hat&#10;pen"
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Separate words with commas, spaces, or new lines. 
                Current count: {customWords.split(/[,\n\s]+/).filter(w => w.trim()).length} words
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateCustomList} size="sm" disabled={!customWords.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Create List
              </Button>
              <Button onClick={handleClearCustomWords} variant="outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Import from File</Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleImportFile}
                  className="hidden"
                  id="file-import"
                />
                <Button 
                  onClick={() => document.getElementById('file-import')?.click()}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import File
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports .txt and .csv files with words separated by commas or new lines
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Word List</CardTitle>
          <CardDescription>
            {currentWordList.name} • {currentWordList.words.length} words
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{currentWordList.name}</p>
              <p className="text-sm text-muted-foreground">{currentWordList.description}</p>
            </div>
            <Button onClick={handleExportList} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {currentWordList.words.map((word, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {word}
                </Badge>
              ))}
            </div>
            {currentWordList.words.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No words in current list. Create a custom list or select a predefined one.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};