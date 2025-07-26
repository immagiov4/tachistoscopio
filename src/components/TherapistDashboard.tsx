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

import { PatientExerciseManager } from '@/components/PatientExerciseManager';
import { TutorialModal } from '@/components/TutorialModal';
import { WordListManager } from '@/components/WordListManager';
import { WordGenerator } from '@/components/WordGenerator';
import { WordList as TachistoscopeWordList } from '@/types/tachistoscope';

export const TherapistDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [patients, setPatients] = useState<Profile[]>([]);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Word list manager state
  const [currentWordList, setCurrentWordList] = useState<TachistoscopeWordList>({ id: 'empty', name: 'Nessuna lista', words: [], description: '' });

  // Patient creation state
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [createPatientLoading, setCreatePatientLoading] = useState(false);


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

  const fetchWordLists = async () => {
    try {
      const { data, error } = await supabase
        .from('word_lists')
        .select('*')
        .eq('created_by', profile?.id);

      if (error) throw error;

      const allWordLists = (data || []).map(list => ({
        ...list,
        settings: (typeof list.settings === 'object' && list.settings !== null && !Array.isArray(list.settings)) ? list.settings as any : {
          exposureDuration: 500,
          intervalDuration: 200,
          textCase: 'original' as const,
          useMask: false,
          maskDuration: 200
        }
      }));
      setWordLists(allWordLists as unknown as WordList[]);
    } catch (error) {
      console.error('Error fetching word lists:', error);
    }
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


        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="patients" 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {}}
            >
              <UserCog className="h-4 w-4" />
              Gestione Pazienti
            </TabsTrigger>
            <TabsTrigger 
              value="wordlists" 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {}}
            >
              <BookOpen className="h-4 w-4" />
              Liste Parole &amp; Esercizi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="mt-6">
            <PatientExerciseManager therapistId={profile?.id || ''} />
          </TabsContent>

          <TabsContent value="wordlists" className="mt-6">
            <WordListManager
              currentWordList={currentWordList}
              onWordListChange={setCurrentWordList}
              therapistId={profile?.id}
            />
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