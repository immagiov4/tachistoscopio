import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen, BarChart3, Search, Copy, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, WordList, Exercise, ExerciseSettings, DAYS_OF_WEEK } from '@/types/database';
import { toast } from '@/hooks/use-toast';

interface PatientExerciseManagerProps {
  therapistId: string;
}

export const PatientExerciseManager: React.FC<PatientExerciseManagerProps> = ({ therapistId }) => {
  const [patients, setPatients] = useState<Profile[]>([]);
  const [patientsWithExercises, setPatientsWithExercises] = useState<Array<Profile & {exerciseCount: number}>>([]);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [patientExercises, setPatientExercises] = useState<Exercise[]>([]);
  const [patientSessions, setPatientSessions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 15;

  // Patient creation state
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [createPatientLoading, setCreatePatientLoading] = useState(false);

  // Exercise settings for each day
  const [weeklyExercises, setWeeklyExercises] = useState<{[key: number]: Partial<Exercise>}>({});

  useEffect(() => {
    fetchInitialData();
  }, [therapistId]);

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientData();
    }
  }, [selectedPatient]);

  const fetchInitialData = async () => {
    try {
      const [patientsData, wordListsData, exercisesData] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient')
          .eq('created_by', therapistId),
        supabase
          .from('word_lists')
          .select('*')
          .eq('created_by', therapistId),
        supabase
          .from('exercises')
          .select('patient_id')
          .eq('therapist_id', therapistId)
      ]);

      const patients = patientsData.data || [];
      const exercises = exercisesData.data || [];
      
      // Count exercises per patient
      const exerciseCounts = exercises.reduce((acc: {[key: string]: number}, exercise) => {
        acc[exercise.patient_id] = (acc[exercise.patient_id] || 0) + 1;
        return acc;
      }, {});

      const patientsWithCounts = patients.map(patient => ({
        ...patient,
        exerciseCount: exerciseCounts[patient.id] || 0
      }));

      setPatients(patients);
      setPatientsWithExercises(patientsWithCounts);
      setWordLists(wordListsData.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    if (!selectedPatient) return;

    try {
      const [exercisesData, sessionsData] = await Promise.all([
        supabase
          .from('exercises')
          .select(`
            *,
            word_list:word_lists(*)
          `)
          .eq('patient_id', selectedPatient.id),
        supabase
          .from('exercise_sessions')
          .select('*')
          .eq('patient_id', selectedPatient.id)
          .order('completed_at', { ascending: false })
          .limit(10)
      ]);

      setPatientExercises(exercisesData.data as any || []);
      setPatientSessions(sessionsData.data || []);

      // Initialize weekly exercises state
      const weeklyData: {[key: number]: Partial<Exercise>} = {};
      exercisesData.data?.forEach((exercise: any) => {
        weeklyData[exercise.day_of_week] = exercise;
      });
      setWeeklyExercises(weeklyData);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  const updateExercise = async (dayOfWeek: number, wordListId: string, settings: ExerciseSettings) => {
    if (!selectedPatient) return;

    try {
      const { error } = await supabase
        .from('exercises')
        .upsert({
          patient_id: selectedPatient.id,
          therapist_id: therapistId,
          word_list_id: wordListId,
          day_of_week: dayOfWeek,
          settings: settings as any,
        });

      if (error) throw error;

      toast({
        title: 'Successo',
        description: `Esercizio per ${DAYS_OF_WEEK[dayOfWeek === 0 ? 6 : dayOfWeek - 1]} aggiornato`,
      });

      await fetchPatientData();
    } catch (error) {
      console.error('Error updating exercise:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante l\'aggiornamento dell\'esercizio',
        variant: 'destructive',
      });
    }
  };

  const removeExercise = async (dayOfWeek: number) => {
    if (!selectedPatient) return;

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('patient_id', selectedPatient.id)
        .eq('day_of_week', dayOfWeek);

      if (error) throw error;

      toast({
        title: 'Successo',
        description: `Esercizio per ${DAYS_OF_WEEK[dayOfWeek === 0 ? 6 : dayOfWeek - 1]} rimosso`,
      });

      await fetchPatientData();
    } catch (error) {
      console.error('Error removing exercise:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante la rimozione dell\'esercizio',
        variant: 'destructive',
      });
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
      const { data, error } = await supabase.functions.invoke('create-patient', {
        body: {
          email: newPatientEmail,
          fullName: newPatientName,
          therapistId: therapistId,
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

      // Reset form and refresh data
      setNewPatientEmail('');
      setNewPatientName('');
      await fetchInitialData();
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

  const deletePatient = async (patientId: string) => {
    try {
      // Delete the patient profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Paziente eliminato con successo',
      });

      // Refresh data and clear selection if it was the deleted patient
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
      await fetchInitialData();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante l\'eliminazione del paziente',
        variant: 'destructive',
      });
    }
  };

  const copyExerciseToDay = (fromDay: number, toDay: number) => {
    const sourceExercise = weeklyExercises[fromDay];
    if (!sourceExercise) return;

    setWeeklyExercises(prev => ({
      ...prev,
      [toDay]: {
        ...sourceExercise,
        day_of_week: toDay
      }
    }));
  };

  const filteredPatients = patientsWithExercises.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginazione
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);
  const startIndex = (currentPage - 1) * patientsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + patientsPerPage);

  if (loading) {
    return <div className="p-4">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create new patient */}
      <Card>
        <CardHeader>
          <CardTitle>Crea Nuovo Paziente</CardTitle>
          <CardDescription>
            Aggiungi un nuovo paziente al tuo gruppo. Verrà inviata automaticamente un'email al genitore/tutore con:
            <br />• <strong>Link di accesso rapido</strong> (magic link) per entrare immediatamente
            <br />• <strong>Password temporanea</strong> come alternativa per l'accesso manuale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-name">Nome Completo</Label>
              <Input
                id="patient-name"
                placeholder="Nome del paziente"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-email">Email (genitore/tutore) *</Label>
              <Input
                id="patient-email"
                type="email"
                placeholder="email@esempio.it"
                value={newPatientEmail}
                onChange={(e) => setNewPatientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                L'email verrà inviata a questo indirizzo con le credenziali di accesso
              </p>
            </div>
          </div>
          <Button 
            className="w-full md:w-auto"
            onClick={createPatient}
            disabled={createPatientLoading}
          >
            {createPatientLoading ? 'Creazione...' : 'Crea Paziente'}
          </Button>
        </CardContent>
      </Card>

      {/* Patient Search and Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Elenco Pazienti ({filteredPatients.length})
          </CardTitle>
          <CardDescription>
            Clicca su un paziente per modificare il suo piano settimanale e visualizzare le statistiche
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Cerca paziente</Label>
              <Input
                id="search"
                placeholder="Nome del paziente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid gap-2 max-h-60 overflow-y-auto">
            {paginatedPatients.map((patient) => (
              <div
                key={patient.id}
                className={`p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedPatient?.id === patient.id
                    ? 'bg-primary/10 border-primary border-solid shadow-md'
                    : 'hover:bg-muted border-muted-foreground/30'
                }`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{patient.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Creato il {new Date(patient.created_at).toLocaleDateString('it-IT')} • {patient.exerciseCount} esercizi
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{patient.exerciseCount} esercizi</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePatient(patient.id);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Precedente
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                Pagina {currentPage} di {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Successiva
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPatient && (
        <>
          {/* Weekly Exercise Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Piano Settimanale - {selectedPatient.full_name}
              </CardTitle>
              <CardDescription>
                Gestisci gli esercizi per ogni giorno della settimana
              </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid gap-2">
                {DAYS_OF_WEEK.map((day, index) => {
                  const dayOfWeek = (index + 1) % 7; // Monday = 1, ..., Saturday = 6, Sunday = 0
                  const exercise = weeklyExercises[dayOfWeek];
                  
                  return (
                    <div key={dayOfWeek} className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-16 text-sm font-medium text-center">
                        {day.slice(0, 3)}
                      </div>
                      
                      {exercise ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {exercise.word_list?.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {exercise.word_list?.words?.length} parole • {exercise.settings?.exposureDuration}ms • {exercise.settings?.intervalDuration}ms
                          </span>
                          
                          <Select
                            value={exercise.word_list_id}
                            onValueChange={(value) => {
                              updateExercise(dayOfWeek, value, exercise.settings as ExerciseSettings);
                            }}
                          >
                            <SelectTrigger className="h-6 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {wordLists.map((list) => (
                                <SelectItem key={list.id} value={list.id}>
                                  {list.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExercise(dayOfWeek)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <Select
                            onValueChange={(value) => {
                              const defaultSettings: ExerciseSettings = {
                                exposureDuration: 500,
                                intervalDuration: 200,
                                fontSize: 'large',
                                textCase: 'original',
                                useMask: false,
                                maskDuration: 200,
                              };
                              updateExercise(dayOfWeek, value, defaultSettings);
                            }}
                          >
                            <SelectTrigger className="h-6 text-xs">
                              <SelectValue placeholder="Nessun esercizio" />
                            </SelectTrigger>
                            <SelectContent>
                              {wordLists.map((list) => (
                                <SelectItem key={list.id} value={list.id}>
                                  {list.name} ({list.words.length})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Patient Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Statistiche Paziente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patientSessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Il paziente non ha ancora completato nessun esercizio
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {patientSessions.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Sessioni Totali</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {Math.round(patientSessions.reduce((acc, session) => acc + session.accuracy, 0) / patientSessions.length)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Precisione Media</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {Math.round(patientSessions.reduce((acc, session) => acc + session.duration, 0) / patientSessions.length / 1000)}s
                      </div>
                      <div className="text-sm text-muted-foreground">Durata Media</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {patientSessions.reduce((acc, session) => acc + session.total_words, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Parole Totali</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Ultime Sessioni</h4>
                    {patientSessions.slice(0, 5).map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">
                            {new Date(session.completed_at).toLocaleDateString('it-IT')} - {new Date(session.completed_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.total_words} parole - {Math.round(session.duration / 1000)}s
                          </div>
                        </div>
                        <Badge variant={session.accuracy >= 80 ? 'default' : session.accuracy >= 60 ? 'secondary' : 'destructive'}>
                          {Math.round(session.accuracy)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};