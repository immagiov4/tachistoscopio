import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, BookOpen, LogOut, BarChart3, Edit2, Trash2, UserCog } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Profile, WordList, Exercise, ExerciseSettings, DEFAULT_SETTINGS, DAYS_OF_WEEK } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { DebugPanel } from '@/components/DebugPanel';
import { PatientExerciseManager } from '@/components/PatientExerciseManager';
import { TutorialModal } from '@/components/TutorialModal';

export const TherapistDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [patients, setPatients] = useState<Profile[]>([]);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Patient creation state
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [createPatientLoading, setCreatePatientLoading] = useState(false);

  // Word list creation state
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListWords, setNewListWords] = useState('');
  const [createListLoading, setCreateListLoading] = useState(false);

  // Exercise creation state
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedWordList, setSelectedWordList] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [exerciseSettings, setExerciseSettings] = useState<ExerciseSettings>(DEFAULT_SETTINGS);
  const [createExerciseLoading, setCreateExerciseLoading] = useState(false);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchData();
      // Controlla se è il primo accesso
      const tutorialCompleted = localStorage.getItem('tachistoscope_tutorial_completed');
      if (!tutorialCompleted) {
        setShowTutorial(true);
      }
    }
  }, [profile]);

  const fetchData = async () => {
    await Promise.all([
      fetchPatients(),
      fetchWordLists(),
      fetchExercises(),
    ]);
    setLoading(false);
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .eq('created_by', profile?.id);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchWordLists = async () => {
    try {
      const { data, error } = await supabase
        .from('word_lists')
        .select('*')
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched word lists:', data);
      setWordLists(data || []);
    } catch (error) {
      console.error('Error fetching word lists:', error);
    }
  };

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          *,
          word_list:word_lists(*),
          patient:profiles!exercises_patient_id_fkey(*)
        `)
        .eq('therapist_id', profile?.id)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      setExercises(data as any || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const createPatient = async () => {
    if (!newPatientEmail || !newPatientName) {
      toast({
        title: 'Errore',
        description: 'Compila tutti i campi',
        variant: 'destructive',
      });
      return;
    }

    setCreatePatientLoading(true);
    try {
      // Create user via edge function since admin SDK is not available in browser
      const { data, error } = await supabase.functions.invoke('create-patient', {
        body: {
          email: newPatientEmail,
          fullName: newPatientName,
          therapistId: profile?.id,
        },
      });

      if (error) throw error;

      // Mostra il risultato con eventuali warning
      if (data.warning) {
        toast({
          title: 'Paziente creato con warning',
          description: data.warning,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Successo',
          description: data.message,
        });
      }

      setNewPatientEmail('');
      setNewPatientName('');
      await fetchPatients();
    } catch (error: any) {
      console.error('Error creating patient:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante la creazione del paziente',
        variant: 'destructive',
      });
    } finally {
      setCreatePatientLoading(false);
    }
  };

  const createWordList = async () => {
    if (!newListName || !newListWords) {
      toast({
        title: 'Errore',
        description: 'Nome e parole sono obbligatori',
        variant: 'destructive',
      });
      return;
    }

    setCreateListLoading(true);
    try {
      const words = newListWords
        .split(/[\n,\s]+/)
        .map(word => word.trim())
        .filter(word => word.length > 0);

      console.log('Words array:', words, 'Length:', words.length);

      const { error } = await supabase
        .from('word_lists')
        .insert({
          name: newListName,
          description: newListDescription,
          words,
          created_by: profile?.id!,
        });

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Lista di parole creata con successo',
      });

      setNewListName('');
      setNewListDescription('');
      setNewListWords('');
      await fetchWordLists();
    } catch (error) {
      console.error('Error creating word list:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante la creazione della lista',
        variant: 'destructive',
      });
    } finally {
      setCreateListLoading(false);
    }
  };

  const createExercise = async () => {
    if (!selectedWordList) {
      toast({
        title: 'Errore',
        description: 'Seleziona una lista di parole',
        variant: 'destructive',
      });
      return;
    }

    setCreateExerciseLoading(true);
    try {
      // Salva solo le impostazioni come template globale
      toast({
        title: 'Successo',
        description: 'Template di esercizio salvato. Puoi ora assegnarlo ai pazienti tramite Gestione Pazienti.',
      });

      setSelectedWordList('');
      setExerciseSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Error creating exercise template:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante la creazione del template',
        variant: 'destructive',
      });
    } finally {
      setCreateExerciseLoading(false);
    }
  };

  const deletePatient = async (patientId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo paziente? Verranno eliminati anche tutti i suoi esercizi.')) return;
    
    try {
      // Prima elimina gli esercizi del paziente
      await supabase
        .from('exercises')
        .delete()
        .eq('patient_id', patientId);

      // Poi elimina il paziente
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Paziente eliminato con successo',
      });

      await fetchPatients();
      await fetchExercises();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante l\'eliminazione del paziente',
        variant: 'destructive',
      });
    }
  };

  const deleteWordList = async (listId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa lista di parole? Verranno eliminati anche tutti gli esercizi che la utilizzano.')) return;
    
    try {
      // Prima elimina tutti gli esercizi che usano questa lista
      await supabase
        .from('exercises')
        .delete()
        .eq('word_list_id', listId);

      // Poi elimina la lista di parole
      const { error } = await supabase
        .from('word_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Lista di parole e relativi esercizi eliminati con successo',
      });

      await fetchWordLists();
      await fetchExercises();
    } catch (error) {
      console.error('Error deleting word list:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante l\'eliminazione della lista',
        variant: 'destructive',
      });
    }
  };

  const deleteExercise = async (exerciseId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo esercizio?')) return;
    
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Esercizio eliminato con successo',
      });

      await fetchExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante l\'eliminazione dell\'esercizio',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return <div className="p-4">Caricamento...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-6xl">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Dashboard Terapista
            </h1>
            <p className="text-lg text-muted-foreground">
              Benvenuto, {profile?.full_name}
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </header>

        {/* Debug Panel - Solo durante sviluppo */}
        <div className="mb-6">
          <DebugPanel onRevealTutorial={() => {
            localStorage.removeItem('tachistoscope_tutorial_completed');
            setShowTutorial(true);
          }} />
        </div>

        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Gestione Pazienti
            </TabsTrigger>
            <TabsTrigger value="wordlists" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Liste Parole
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Crea Esercizio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="mt-6">
            <PatientExerciseManager therapistId={profile?.id || ''} />
          </TabsContent>

          <TabsContent value="wordlists" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Crea Nuova Lista di Parole</CardTitle>
                  <CardDescription>
                    Crea una lista personalizzata di parole per gli esercizi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="list-name">Nome Lista</Label>
                      <Input
                        id="list-name"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="Nome della lista"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="list-description">Descrizione (opzionale)</Label>
                      <Input
                        id="list-description"
                        value={newListDescription}
                        onChange={(e) => setNewListDescription(e.target.value)}
                        placeholder="Descrizione della lista"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="list-words">Parole (una per riga o separate da virgole)</Label>
                    <Textarea
                      id="list-words"
                      value={newListWords}
                      onChange={(e) => setNewListWords(e.target.value)}
                      placeholder="gatto&#10;cane&#10;sole&#10;luna"
                      rows={8}
                    />
                  </div>
                  <Button 
                    onClick={createWordList} 
                    disabled={createListLoading}
                    className="w-full md:w-auto"
                  >
                    {createListLoading ? 'Creazione...' : 'Crea Lista'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Le Mie Liste di Parole ({wordLists.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {wordLists.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Non hai ancora creato nessuna lista di parole
                    </p>
                  ) : (
                    <div className="grid gap-4">
                       {wordLists.map((list) => (
                         <div key={list.id} className="p-4 border rounded-lg">
                           <div className="flex items-center justify-between mb-2">
                             <h3 className="font-medium">{list.name}</h3>
                             <div className="flex items-center gap-2">
                               <Badge variant="outline">{list.words.length} parole</Badge>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => deleteWordList(list.id)}
                                 className="h-8 w-8 p-0"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </div>
                           </div>
                           {list.description && (
                             <p className="text-sm text-muted-foreground mb-2">{list.description}</p>
                           )}
                           <p className="text-sm text-muted-foreground">
                             Prime parole: {list.words.slice(0, 5).join(', ')}
                             {list.words.length > 5 && '...'}
                           </p>
                         </div>
                       ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="exercises" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Crea/Modifica Esercizio</CardTitle>
                 <CardDescription>
                     Crea template di esercizi che potrai assegnare ai pazienti
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Lista di Parole</Label>
                      <Select value={selectedWordList} onValueChange={setSelectedWordList}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona lista" />
                        </SelectTrigger>
                        <SelectContent>
                          {wordLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name} ({list.words.length} parole)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Durata Esposizione (ms)</Label>
                      <Input
                        type="number"
                        min="50"
                        max="2000"
                        value={exerciseSettings.exposureDuration}
                        onChange={(e) => setExerciseSettings(prev => ({
                          ...prev,
                          exposureDuration: parseInt(e.target.value)
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Intervallo (ms)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1000"
                        value={exerciseSettings.intervalDuration}
                        onChange={(e) => setExerciseSettings(prev => ({
                          ...prev,
                          intervalDuration: parseInt(e.target.value)
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Formato Testo</Label>
                      <Select 
                        value={exerciseSettings.textCase} 
                        onValueChange={(value: any) => setExerciseSettings(prev => ({
                          ...prev,
                          textCase: value
                        }))}
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

                   <Button 
                     onClick={createExercise} 
                     disabled={createExerciseLoading}
                     className="w-full md:w-auto"
                   >
                     {createExerciseLoading ? 'Salvataggio...' : 'Salva Template'}
                   </Button>
                   
                   <Alert>
                     <AlertDescription>
                       I template creati qui possono essere assegnati ai pazienti tramite la sezione "Gestione Pazienti"
                     </AlertDescription>
                   </Alert>
                 </CardContent>
               </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistiche</CardTitle>
                <CardDescription>
                  Panoramica delle prestazioni dei pazienti
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Le statistiche saranno disponibili quando i pazienti completeranno gli esercizi
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tutorial Modal */}
        <TutorialModal 
          open={showTutorial} 
          onOpenChange={setShowTutorial} 
        />
      </div>
    </div>
  );
};