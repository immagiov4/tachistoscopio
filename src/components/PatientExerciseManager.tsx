import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen, BarChart3, Search, Copy, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, WordList, Exercise, ExerciseSettings, DAYS_OF_WEEK } from '@/types/database';
import { toast } from '@/hooks/use-toast';

interface PatientExerciseManagerProps {
  therapistId: string;
}

export const PatientExerciseManager: React.FC<PatientExerciseManagerProps> = ({ therapistId }) => {
  const [patients, setPatients] = useState<Profile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [patientExercises, setPatientExercises] = useState<Exercise[]>([]);
  const [patientSessions, setPatientSessions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
      const [patientsData, wordListsData] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient')
          .eq('created_by', therapistId),
        supabase
          .from('word_lists')
          .select('*')
          .eq('created_by', therapistId)
      ]);

      setPatients(patientsData.data || []);
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
        description: `Esercizio per ${DAYS_OF_WEEK[dayOfWeek]} aggiornato`,
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
        description: `Esercizio per ${DAYS_OF_WEEK[dayOfWeek]} rimosso`,
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

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-4">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Patient Search and Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Seleziona Paziente
          </CardTitle>
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
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedPatient?.id === patient.id
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{patient.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Creato il {new Date(patient.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {patientExercises.filter(ex => ex.patient_id === patient.id).length} esercizi
                  </Badge>
                </div>
              </div>
            ))}
          </div>
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
              <div className="grid gap-4">
                {DAYS_OF_WEEK.slice(1, 6).map((day, index) => {
                  const dayOfWeek = index + 1; // Monday = 1, Friday = 5
                  const exercise = weeklyExercises[dayOfWeek];
                  
                  return (
                    <div key={dayOfWeek} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-lg">{day}</h3>
                        <div className="flex gap-2">
                          {exercise && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Copy to other days dropdown could be implemented
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeExercise(dayOfWeek)}
                              >
                                Rimuovi
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {exercise ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">
                              {exercise.word_list?.name}
                            </Badge>
                            <Badge variant="secondary">
                              {exercise.word_list?.words?.length} parole
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Durata: </span>
                              {exercise.settings?.exposureDuration}ms
                            </div>
                            <div>
                              <span className="text-muted-foreground">Intervallo: </span>
                              {exercise.settings?.intervalDuration}ms
                            </div>
                            <div>
                              <span className="text-muted-foreground">Formato: </span>
                              {exercise.settings?.textCase === 'original' ? 'Originale' :
                               exercise.settings?.textCase === 'uppercase' ? 'MAIUSCOLO' : 'minuscolo'}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Select
                              value={exercise.word_list_id}
                              onValueChange={(value) => {
                                updateExercise(dayOfWeek, value, exercise.settings as ExerciseSettings);
                              }}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
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
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-muted-foreground">Nessun esercizio programmato</p>
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
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Aggiungi esercizio..." />
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