import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Upload, Download, Plus, Trash2, BookOpen, Edit, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  WordList,
  PREDEFINED_WORD_LISTS
} from '@/types/tachistoscope';
import { supabase } from '@/integrations/supabase/client';
import { WordList as DBWordList } from '@/types/database';

interface WordListManagerProps {
  currentWordList: WordList;
  onWordListChange: (wordList: WordList) => void;
  therapistId?: string;
}

export const WordListManager: React.FC<WordListManagerProps> = ({
  currentWordList,
  onWordListChange,
  therapistId
}) => {
  const [customWords, setCustomWords] = useState('');
  const [customListName, setCustomListName] = useState('Custom List');
  const [savedWordLists, setSavedWordLists] = useState<WordList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingList, setEditingList] = useState<string | null>(null);
  const { toast } = useToast();

  // Load saved word lists from database
  useEffect(() => {
    if (therapistId) {
      loadSavedWordLists();
    }
  }, [therapistId]);

  const loadSavedWordLists = async () => {
    if (!therapistId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('word_lists')
        .select('*')
        .eq('created_by', therapistId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const wordLists: WordList[] = data.map(dbList => ({
        id: dbList.id,
        name: dbList.name,
        description: dbList.description || `Lista personalizzata con ${dbList.words.length} parole`,
        words: dbList.words
      }));

      setSavedWordLists(wordLists);
    } catch (error) {
      console.error('Error loading word lists:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le liste salvate.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomList = async () => {
    if (!therapistId) {
      toast({
        title: "Errore",
        description: "Devi essere loggato come terapeuta per salvare liste.",
        variant: "destructive",
      });
      return;
    }

    if (!customWords.trim()) {
      toast({
        title: "Nessuna parola inserita",
        description: "Inserisci delle parole per creare una lista personalizzata.",
        variant: "destructive",
      });
      return;
    }

    // Parse words from textarea
    const words = customWords
      .split(/[,\n\s]+/)
      .map(word => word.trim())
      .filter(word => word.length > 0);

    if (words.length === 0) {
      toast({
        title: "Nessuna parola valida",
        description: "Inserisci parole valide separate da virgole, spazi o a capo.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('word_lists')
        .insert({
          name: customListName || 'Lista personalizzata',
          description: `Lista personalizzata con ${words.length} parole`,
          words: words,
          created_by: therapistId
        })
        .select()
        .single();

      if (error) throw error;

      const customList: WordList = {
        id: data.id,
        name: data.name,
        description: data.description || `Lista personalizzata con ${words.length} parole`,
        words: data.words
      };

      // Reload saved lists and select the new one
      await loadSavedWordLists();
      onWordListChange(customList);
      
      // Clear form
      setCustomWords('');
      setCustomListName('Lista personalizzata');

      toast({
        title: "Lista salvata",
        description: `"${customList.name}" è stata salvata con ${words.length} parole.`,
      });
    } catch (error) {
      console.error('Error saving word list:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la lista personalizzata.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPredefinedList = (listId: string) => {
    const list = PREDEFINED_WORD_LISTS.find(l => l.id === listId);
    if (list) {
      onWordListChange(list);
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
        title: "Nessuna parola da esportare",
        description: "La lista attuale è vuota.",
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
      title: "Lista esportata",
      description: `"${currentWordList.name}" è stata scaricata.`,
    });
  };

  const handleDeleteWordList = async (listId: string) => {
    if (!therapistId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('word_lists')
        .delete()
        .eq('id', listId)
        .eq('created_by', therapistId);

      if (error) throw error;

      // If we deleted the currently selected list, select the first predefined one
      if (currentWordList.id === listId) {
        onWordListChange(PREDEFINED_WORD_LISTS[0]);
      }

      await loadSavedWordLists();
      toast({
        title: "Lista eliminata",
        description: "La lista personalizzata è stata eliminata.",
      });
    } catch (error) {
      console.error('Error deleting word list:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la lista.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWordList = (list: WordList) => {
    setCustomWords(list.words.join('\n'));
    setCustomListName(list.name);
    setEditingList(list.id);
  };

  const handleUpdateWordList = async () => {
    if (!therapistId || !editingList) return;

    const words = customWords
      .split(/[,\n\s]+/)
      .map(word => word.trim())
      .filter(word => word.length > 0);

    if (words.length === 0) {
      toast({
        title: "Nessuna parola valida",
        description: "Inserisci parole valide per aggiornare la lista.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('word_lists')
        .update({
          name: customListName,
          description: `Lista personalizzata con ${words.length} parole`,
          words: words
        })
        .eq('id', editingList)
        .eq('created_by', therapistId)
        .select()
        .single();

      if (error) throw error;

      const updatedList: WordList = {
        id: data.id,
        name: data.name,
        description: data.description || `Lista personalizzata con ${words.length} parole`,
        words: data.words
      };

      // Update current selection if it's the edited list
      if (currentWordList.id === editingList) {
        onWordListChange(updatedList);
      }

      await loadSavedWordLists();
      
      // Clear form
      setCustomWords('');
      setCustomListName('Lista personalizzata');
      setEditingList(null);

      toast({
        title: "Lista aggiornata",
        description: `"${updatedList.name}" è stata aggiornata.`,
      });
    } catch (error) {
      console.error('Error updating word list:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la lista.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setCustomWords('');
    setCustomListName('Lista personalizzata');
    setEditingList(null);
  };

  const handleClearCustomWords = () => {
    setCustomWords('');
    setCustomListName('Lista personalizzata');
    setEditingList(null);
  };

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Gestione Liste Parole
          </CardTitle>
          <CardDescription>
            Seleziona una lista esistente o crea una personalizzata
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Selezione Lista</CardTitle>
            <CardDescription>
              Scegli tra liste predefinite o le tue liste salvate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Lista Parole</Label>
              <Select 
                value={currentWordList.id} 
                onValueChange={(value) => {
                  const predefinedList = PREDEFINED_WORD_LISTS.find(l => l.id === value);
                  if (predefinedList) {
                    handleLoadPredefinedList(value);
                  } else {
                    const savedList = savedWordLists.find(l => l.id === value);
                    if (savedList) {
                      onWordListChange(savedList);
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona una lista" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <div className="p-2 text-xs font-medium text-muted-foreground">Liste predefinite</div>
                  {PREDEFINED_WORD_LISTS.map((list) => (
                    <SelectItem key={list.id} value={list.id} className="bg-background hover:bg-accent">
                      <div className="flex items-center justify-between w-full">
                        <span>{list.name}</span>
                        <Badge variant="secondary" className="ml-2">{list.words.length}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                  
                  {savedWordLists.length > 0 && (
                    <>
                      <div className="p-2 text-xs font-medium text-muted-foreground border-t mt-2 pt-2">Le tue liste</div>
                      {savedWordLists.map((list) => (
                        <SelectItem key={list.id} value={list.id} className="bg-background hover:bg-accent">
                          <div className="flex items-center justify-between w-full">
                            <span>{list.name}</span>
                            <Badge variant="secondary" className="ml-2">{list.words.length}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Lista attuale info */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{currentWordList.name}</h4>
                <Badge variant="outline">{currentWordList.words.length} parole</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{currentWordList.description}</p>
              <div className="flex flex-wrap gap-1">
                {currentWordList.words.slice(0, 10).map((word, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {word}
                  </Badge>
                ))}
                {currentWordList.words.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{currentWordList.words.length - 10} altre
                  </Badge>
                )}
              </div>
            </div>

            {/* Azioni per liste salvate */}
            {savedWordLists.some(l => l.id === currentWordList.id) && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleEditWordList(currentWordList)}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica
                </Button>
                <Button
                  onClick={() => handleDeleteWordList(currentWordList.id)}
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina
                </Button>
                <Button onClick={handleExportList} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Esporta
                </Button>
              </div>
            )}

            {/* Export per liste predefinite */}
            {PREDEFINED_WORD_LISTS.some(l => l.id === currentWordList.id) && (
              <Button onClick={handleExportList} variant="outline" size="sm" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Esporta lista
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {editingList ? 'Modifica lista' : 'Crea lista personalizzata'}
            </CardTitle>
            <CardDescription>
              {editingList ? 'Modifica la lista esistente' : 'Inserisci le tue parole o importa da file'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingList && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Stai modificando una lista esistente. Clicca "Aggiorna" per salvare le modifiche.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="list-name">Nome lista</Label>
              <input
                id="list-name"
                type="text"
                value={customListName}
                onChange={(e) => setCustomListName(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                placeholder="Inserisci nome lista"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-words">Parole</Label>
              <Textarea
                id="custom-words"
                value={customWords}
                onChange={(e) => setCustomWords(e.target.value)}
                placeholder="Inserisci parole separate da virgole, spazi o a capo.&#10;&#10;Esempio:&#10;gatto, cane, correre&#10;grande rosso sole&#10;cappello&#10;penna"
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Separa le parole con virgole, spazi o a capo. 
                Conteggio attuale: {customWords.split(/[,\n\s]+/).filter(w => w.trim()).length} parole
              </p>
            </div>

            <div className="flex gap-2">
              {editingList ? (
                <>
                  <Button 
                    onClick={handleUpdateWordList} 
                    size="sm" 
                    disabled={!customWords.trim() || isLoading}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {isLoading ? 'Aggiornamento...' : 'Aggiorna lista'}
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    <X className="mr-2 h-4 w-4" />
                    Annulla
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleCreateCustomList} 
                    size="sm" 
                    disabled={!customWords.trim() || isLoading || !therapistId}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isLoading ? 'Salvataggio...' : 'Salva lista'}
                  </Button>
                  <Button onClick={handleClearCustomWords} variant="outline" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Pulisci
                  </Button>
                </>
              )}
            </div>

            {!therapistId && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Devi essere loggato come terapeuta per salvare liste personalizzate.
              </p>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Importa da file</Label>
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
                  Importa file
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supporta file .txt e .csv con parole separate da virgole o a capo
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};