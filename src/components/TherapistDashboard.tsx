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
import { PatientDashboard } from './PatientDashboard';
import { LoadingPage } from '@/components/ui/loading';
import { sanitizeInput } from '@/utils/passwordValidation';

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
  const [activeTab, setActiveTab] = useState('patients'); // Add state for active tab

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
    // Sanitize input data
    const sanitizedEmail = sanitizeInput(newPatientEmail, 254);
    const sanitizedName = sanitizeInput(newPatientName, 100);
    
    if (!sanitizedEmail || !sanitizedName) {
      toast({
        title: 'Errore',
        description: 'Compila tutti i campi con dati validi',
        variant: 'destructive',
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      toast({
        title: 'Errore',
        description: 'Formato email non valido',
        variant: 'destructive',
      });
      return;
    }

    setCreatePatientLoading(true);
    try {
      // Create user via edge function since admin SDK is not available in browser
      const { data, error } = await supabase.functions.invoke('create-patient', {
        body: {
          email: sanitizedEmail,
          fullName: sanitizedName,
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
    if (!confirm('Sei sicuro di voler eliminare questo paziente? Verranno eliminati anche tutti i suoi esercizi e sessioni.')) return;
    
    try {
      // Prima elimina tutte le sessioni del paziente
      await supabase
        .from('exercise_sessions')
        .delete()
        .eq('patient_id', patientId);

      // Poi elimina gli esercizi del paziente
      await supabase
        .from('exercises')
        .delete()
        .eq('patient_id', patientId);

      // Infine elimina il paziente
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
    if (!confirm('Sei sicuro di voler eliminare questo esercizio e tutte le sue sessioni?')) return;
    
    try {
      // Prima elimina tutte le sessioni dell'esercizio
      await supabase
        .from('exercise_sessions')
        .delete()
        .eq('exercise_id', exerciseId);

      // Poi elimina l'esercizio
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
    return (
      <LoadingPage 
        title="Caricamento Area Terapista..." 
        description="Stiamo preparando la dashboard per i tuoi pazienti"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-6xl">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-6">
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
          </div>
          
        </header>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20 rounded-lg shadow-sm h-auto">
            <TabsTrigger 
              value="patients" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold py-2 px-2 sm:px-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-primary/30 transition-all duration-200 h-auto"
            >
              <UserCog className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Gestione Pazienti</span>
              <span className="sm:hidden text-center">Pazienti</span>
              <Badge variant="secondary" className="text-xs ml-0 sm:ml-1 hidden sm:inline-flex">Pazienti, Esercizi e Monitoraggio</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="wordlists" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold py-2 px-2 sm:px-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-primary/30 transition-all duration-200 h-auto"
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Liste Parole</span>
              <span className="sm:hidden text-center">Parole</span>
              <Badge variant="secondary" className="text-xs ml-0 sm:ml-1 hidden sm:inline-flex">Creazione & Modifica</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="mt-6">
            <PatientExerciseManager 
              therapistId={profile?.id || ''} 
              onNavigateToWordLists={() => setActiveTab('wordlists')}
            />
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