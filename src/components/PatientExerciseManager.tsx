import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen, BarChart3, Search, Copy, Plus, Trash2, UserCheck, ArrowUp, Users, UserCog, Edit } from 'lucide-react';
import { WordList, Exercise, ExerciseSettings, DAYS_OF_WEEK } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { LoadingPage } from '@/components/ui/loading';
import { PatientDashboard } from '@/components/PatientDashboard';
import {
  PatientWithEmail,
  PatientWithExerciseCount,
  fetchPatientsWithEmails,
  fetchWordLists,
  fetchExercises,
  calculateExerciseCounts,
  fetchPatientExercises,
  fetchPatientSessions,
  buildWeeklyExercisesMap,
  upsertExercise,
  deleteExerciseWithSessions,
  createPatientAccount,
  deletePatientAccount,
  getErrorMessage,
  filterPatients,
  paginatePatients,
  calculateAverageAccuracy,
  calculateTotalWords
} from './PatientExerciseManager/helpers';
interface PatientExerciseManagerProps {
  therapistId: string;
  onNavigateToWordLists?: () => void;
}
export const PatientExerciseManager: React.FC<PatientExerciseManagerProps> = ({
  therapistId,
  onNavigateToWordLists
}) => {
  const [patients, setPatients] = useState<PatientWithEmail[]>([]);
  const [patientsWithExercises, setPatientsWithExercises] = useState<PatientWithExerciseCount[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithEmail | null>(null);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
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
  const [weeklyExercises, setWeeklyExercises] = useState<{
    [key: number]: Partial<Exercise>;
  }>({});

  // Studio mode state
  const [studioMode, setStudioMode] = useState<string | null>(null);
  
  // Floating button state
  const [showFloatingActions, setShowFloatingActions] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  useEffect(() => {
    fetchInitialData();
  }, [therapistId]);
  useEffect(() => {
    if (selectedPatient) {
      fetchPatientData();
    }
  }, [selectedPatient]);

  // Reset pagination when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  const checkFloatingActionsVisibility = useCallback(() => {
    const patientListCard = document.querySelector('[data-patient-list]');
    if (patientListCard) {
      const rect = patientListCard.getBoundingClientRect();
      const shouldShow = rect.bottom < window.innerHeight * 0.6;
      setShowFloatingActions(shouldShow);
    }
  }, []);
  
  
  // Show floating buttons when scrolled past patient list - using CSS transitions only
  useEffect(() => {
    const handleScroll = () => {
      checkFloatingActionsVisibility();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [checkFloatingActionsVisibility]);

  // Re-check floating buttons when filtered list changes size
  useEffect(() => {
    // Small delay to let DOM update after filtering
    const timeoutId = setTimeout(checkFloatingActionsVisibility, 100);
    return () => clearTimeout(timeoutId);
  }, [patientsWithExercises.length, searchTerm, checkFloatingActionsVisibility]);
  
  
  const scrollToPatientList = () => {
    const patientListCard = document.querySelector('[data-patient-list]');
    if (patientListCard) {
      patientListCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const enterStudioModeForSelected = () => {
    if (selectedPatient) {
      enterStudioMode(selectedPatient.id);
    } else {
      toast({
        title: 'Nessuno studente selezionato',
        description: 'Seleziona uno studente dall\'elenco prima di entrare in modalità allenamento',
        variant: 'destructive'
      });
    }
  };
  
  const scrollToPatientIndicator = () => {
    setTimeout(() => {
      const indicator = document.querySelector('[data-patient-indicator]');
      if (indicator) {
        indicator.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };
  
  const handlePatientSelection = (patient: PatientWithEmail) => {
    setSelectedPatient(patient);
    scrollToPatientIndicator();
  };
  
  const enterStudioMode = (patientId: string) => {
    setScrollPosition(window.scrollY);
    setStudioMode(patientId);
  };
  
  const exitStudioMode = () => {
    setStudioMode(null);
    setTimeout(() => {
      window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
      // Re-check floating buttons visibility after scroll
      setTimeout(() => {
        const patientListCard = document.querySelector('[data-patient-list]');
        if (patientListCard) {
          const rect = patientListCard.getBoundingClientRect();
          const shouldShow = rect.bottom < window.innerHeight * 0.6;
          setShowFloatingActions(shouldShow);
        }
      }, 500);
    }, 100);
  };
  
  const fetchInitialData = async () => {
    setSelectedPatient(null);
    try {
      const [patients, allWordLists, exercises] = await Promise.all([
        fetchPatientsWithEmails(therapistId),
        fetchWordLists(therapistId),
        fetchExercises(therapistId)
      ]);

      const patientsWithCounts = calculateExerciseCounts(patients, exercises);

      setPatients(patients);
      setPatientsWithExercises(patientsWithCounts);
      setWordLists(allWordLists);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePatientExerciseCount = useCallback(async () => {
    if (!selectedPatient) return;
    
    try {
      const exercises = await fetchExercises(therapistId);
      const studentExercises = exercises.filter(e => e.student_id === selectedPatient.id);
      const newCount = studentExercises.length;
      
      setPatientsWithExercises(prev => 
        prev.map(patient => 
          patient.id === selectedPatient.id 
            ? { ...patient, exerciseCount: newCount }
            : patient
        )
      );
    } catch (error) {
      console.error('Error updating exercise count:', error);
    }
  }, [selectedPatient, therapistId]);
  const fetchPatientData = async () => {
    if (!selectedPatient) return;
    try {
      const [exercises, sessions] = await Promise.all([
        fetchPatientExercises(selectedPatient.id),
        fetchPatientSessions(selectedPatient.id)
      ]);

      setPatientSessions(sessions);

      const weeklyData = buildWeeklyExercisesMap(exercises);
      setWeeklyExercises(weeklyData);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };
  const updateExercise = async (dayOfWeek: number, wordListId: string, settings: ExerciseSettings) => {
    if (!selectedPatient) return;
    
    try {
      await upsertExercise(selectedPatient.id, therapistId, dayOfWeek, wordListId, settings);
      await fetchPatientData();
      updatePatientExerciseCount();
    } catch (error: any) {
      console.error('Error updating exercise:', error);
      const errorMessage = getErrorMessage(error, 'update');
      toast({
        title: 'Errore di aggiornamento',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };
  const removeExercise = async (dayOfWeek: number) => {
    if (!selectedPatient) return;
    
    try {
      console.log(`Tentativo di rimozione esercizio per giorno ${dayOfWeek}, studente ${selectedPatient.id}`);
      
      const exercise = weeklyExercises[dayOfWeek];
      if (!exercise || !exercise.id) {
        console.log('Nessun esercizio trovato per questo giorno');
        return;
      }

      await deleteExerciseWithSessions(exercise.id);
      console.log('Esercizio eliminato con successo');

      await fetchPatientData();
      updatePatientExerciseCount();
      
      toast({
        title: 'Successo',
        description: 'Esercizio eliminato con successo'
      });
    } catch (error: any) {
      console.error('Error removing exercise:', error);
      const errorMessage = getErrorMessage(error, 'remove');
      toast({
        title: 'Errore di rimozione',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };
  const createPatient = async () => {
    if (!newPatientEmail || !newPatientName) {
      toast({
        title: 'Errore',
        description: 'Compila tutti i campi',
        variant: 'destructive'
      });
      return;
    }

    setCreatePatientLoading(true);
    try {
      const data = await createPatientAccount(newPatientEmail, newPatientName, therapistId);

      if (data.warning) {
        toast({
          title: 'Studente creato con warning',
          description: data.warning,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Successo',
          description: data.message
        });
      }

      setNewPatientEmail('');
      setNewPatientName('');
      await fetchInitialData();
    } catch (error: any) {
      console.error('Error creating patient:', error);
      const errorMessage = getErrorMessage(error, 'create');
      toast({
        title: 'Errore di creazione',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setCreatePatientLoading(false);
    }
  };
  const deletePatient = async (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    
    if (!confirm(`Sei sicuro di voler eliminare lo studente ${patient.full_name}? Verranno eliminati anche tutti i suoi esercizi e sessioni, e l'account verrà rimosso completamente dal sistema.`)) return;

    try {
      const data = await deletePatientAccount(patientId);
      
      toast({
        title: 'Successo',
        description: data.message || 'Studente eliminato con successo dal sistema'
      });

      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
      await fetchInitialData();
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      const errorMessage = getErrorMessage(error, 'delete');
      toast({
        title: 'Errore di eliminazione',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };
  const filteredPatients = filterPatients(patientsWithExercises, searchTerm);
  const { paginatedPatients, totalPages } = paginatePatients(filteredPatients, currentPage, patientsPerPage);
  if (loading) {
    return (
      <LoadingPage 
        title="Caricamento Gestione Esercizi..." 
        description="Stiamo preparando gli esercizi per i tuoi studenti"
      />
    );
  }

  // Se in modalità studio, mostra la dashboard dello studente
  if (studioMode) {
    const studioPatient = patients.find(p => p.id === studioMode);
    if (studioPatient) {
      return <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Modalità Allenamento - {studioPatient.full_name}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Stai gestendo gli esercizi come se fossi lo studente
                </p>
              </div>
            </div>
            <Button onClick={exitStudioMode} variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              Torna alla Gestione
            </Button>
          </div>
          
          {/* Importa e usa il PatientDashboard con iframe stondato */}
          <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg">
            <PatientDashboard studioStudentId={selectedPatient.id} />
          </div>
        </div>;
    }
  }
  return <div className="space-y-6">
      {/* Create new patient */}
      <Card>
        <CardHeader>
          <CardTitle className="mb-4">Crea Nuovo Studente</CardTitle>
          <CardDescription className="leading-relaxed space-y-1">
            Aggiungi un nuovo studente al tuo gruppo. Verrà inviata automaticamente un'email con:
            <br />• <strong>Link di accesso rapido</strong> (magic link) per entrare immediatamente
            <br />• <strong>Password temporanea</strong> come alternativa per l'accesso manuale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-name">Nome Completo</Label>
              <Input id="patient-name" placeholder="Nome dello studente" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-email">Email *</Label>
              <Input id="patient-email" type="email" placeholder="email@esempio.it" value={newPatientEmail} onChange={e => setNewPatientEmail(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                L'email verrà inviata a questo indirizzo con le credenziali di accesso
              </p>
            </div>
          </div>
          <Button className="w-full md:w-auto" onClick={createPatient} disabled={createPatientLoading}>
            {createPatientLoading ? 'Creazione...' : 'Crea Studente'}
          </Button>
        </CardContent>
      </Card>

      {/* Patient Search and Selection */}
      <Card data-patient-list>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 mb-4">
            <Search className="h-5 w-5" />
            Elenco Studenti ({filteredPatients.length})
          </CardTitle>
          <CardDescription>
            Clicca su uno studente per modificare il suo piano settimanale e visualizzare le statistiche
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Cerca studente</Label>
              <Input id="search" placeholder="Nome o email dello studente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          
          <div className="grid gap-4 max-h-96 overflow-y-auto">  {/* Changed from h-96 to max-h-96 */}
            {paginatedPatients.map(patient => <div key={patient.id} className={`p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:shadow-md min-h-[80px] ${selectedPatient?.id === patient.id ? 'bg-primary/10 border-primary border-solid shadow-md' : 'hover:bg-muted border-muted-foreground/30'}`} onClick={() => handlePatientSelection(patient)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{patient.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {patient.email && <span className="text-blue-600">{patient.email}</span>}
                      {patient.email && ' • '}
                      Creato il {new Date(patient.created_at).toLocaleDateString('it-IT')} • {patient.exerciseCount} esercizi
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="default" size="sm" onClick={e => {
                      e.stopPropagation();
                      handlePatientSelection(patient);
                    }} className="h-8 px-3 bg-gray-600 hover:bg-gray-700 text-white">
                      <UserCog className="h-4 w-4 mr-1" />
                      Gestisci Studente
                    </Button>
                    <Button variant="default" size="sm" onClick={e => {
                  e.stopPropagation();
                  enterStudioMode(patient.id);
                }} className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white" title="Modalità Allenamento: Gestisci gli esercizi dello studente durante l'allenamento">
                      <BookOpen className="h-4 w-4 mr-1" />
                      Modalità Allenamento
                    </Button>
                    <Button variant="delete" size="sm" onClick={e => {
                  e.stopPropagation();
                  deletePatient(patient.id);
                }} className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>)}
          </div>
          
          {totalPages > 1 && <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                Precedente
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                Pagina {currentPage} di {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                Successiva
              </Button>
            </div>}
        </CardContent>
      </Card>

      {selectedPatient && <div className="space-y-6">
          {/* Indicatore studente selezionato */}
          <div data-patient-indicator className="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Stai gestendo: <span className="font-semibold">{selectedPatient.full_name}</span>
              </p>
              <p className="text-xs text-blue-700">Tutti i pannelli sottostanti si riferiscono a questo studente</p>
            </div>
          </div>

          {/* Weekly Exercise Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5" />
                <div>
                  <CardTitle>Piano Settimanale</CardTitle>
                  <CardDescription className="mt-2">
                    Gestisci gli esercizi per ogni giorno della settimana
                  </CardDescription>
                </div>
              </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToWordLists}
                  className="flex items-center gap-2"
                  disabled={!onNavigateToWordLists}
                >
                  <Edit className="h-4 w-4" />
                  Crea nuovo esercizio
                </Button>
              </div>
            </CardHeader>
            <CardContent>
            <div className="grid gap-2">
                {DAYS_OF_WEEK.map((day, index) => {
              const dayOfWeek = (index + 1) % 7; // Monday = 1, ..., Saturday = 6, Sunday = 0
              const exercise = weeklyExercises[dayOfWeek];
              return <div key={dayOfWeek} className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-16 text-sm font-medium text-center">
                        {day.slice(0, 3)}
                      </div>
                      
                      {exercise ? <div className="flex-1 flex items-center gap-2">
                          <Button variant="delete" size="sm" onClick={() => removeExercise(dayOfWeek)} className="h-6 w-6 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          
                          <Select value={exercise.word_list_id} onValueChange={value => {
                    const selectedList = wordLists.find(list => list.id === value);
                    const settings = selectedList?.settings || exercise.settings as ExerciseSettings;
                    updateExercise(dayOfWeek, value, settings);
                  }}>
                            <SelectTrigger className="h-6 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {wordLists.map(list => <SelectItem key={list.id} value={list.id}>
                                  {list.name}
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                          
                          <span className="text-xs text-muted-foreground">
                            {exercise.word_list?.words?.length} parole • Esp: {exercise.word_list?.settings?.exposureDuration || exercise.settings?.exposureDuration}ms • Int: {exercise.word_list?.settings?.intervalDuration || exercise.settings?.intervalDuration}ms{(exercise.word_list?.settings?.useMask !== undefined ? exercise.word_list.settings.useMask : exercise.settings?.useMask) ? ' • Maschera' : ''}
                          </span>
                        </div> : <div className="flex-1">
                          <Select onValueChange={value => {
                    const selectedList = wordLists.find(list => list.id === value);
                    const settings = selectedList?.settings || {
                      exposureDuration: 500,
                      intervalDuration: 200,
                      fontSize: 'large',
                      textCase: 'original',
                      useMask: false,
                      maskDuration: 200
                    };
                    updateExercise(dayOfWeek, value, settings);
                  }}>
                            <SelectTrigger className="h-6 text-xs">
                              <SelectValue placeholder="Nessun esercizio" />
                            </SelectTrigger>
                            <SelectContent>
                              {wordLists.map(list => <SelectItem key={list.id} value={list.id}>
                                  {list.name} ({list.words.length})
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>}
                    </div>;
            })}
              </div>
            </CardContent>
          </Card>

          {/* Patient Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Statistiche Studente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patientSessions.length === 0 ? <p className="text-muted-foreground text-center py-8">
                  Lo studente non ha ancora completato nessun esercizio
                </p> : <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {patientSessions.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Sessioni Totali</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {calculateAverageAccuracy(patientSessions)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Precisione Media</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {calculateTotalWords(patientSessions)}
                      </div>
                      <div className="text-sm text-muted-foreground">Parole Totali</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Ultime Sessioni</h4>
                    {patientSessions.slice(0, 5).map((session, index) => <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">
                            {new Date(session.completed_at).toLocaleDateString('it-IT')} - {new Date(session.completed_at).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.total_words} parole - {Math.round(session.duration / 1000)}s
                          </div>
                        </div>
                        <Badge variant={session.accuracy >= 80 ? 'default' : session.accuracy >= 60 ? 'secondary' : 'destructive'}>
                          {Math.round(session.accuracy)}%
                        </Badge>
                      </div>)}
                  </div>
                </div>}
            </CardContent>
          </Card>
        </div>}
        
      {/* Floating Actions - sempre nel DOM per animazioni fluide */}
      <div className={`fixed bottom-6 right-6 flex flex-col gap-3 z-50 transition-opacity duration-300 ${showFloatingActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <Button
            onClick={scrollToPatientList}
            size="sm"
            variant="outline"
            className="shadow-lg bg-white/90 hover:bg-white border-gray-300 text-gray-700 hover:text-gray-900 rounded-full h-12 px-5 font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl backdrop-blur-sm"
            title="Torna all'elenco studenti"
          >
            <ArrowUp className="h-4 w-4 mr-2" />
            Torna agli studenti
          </Button>

          {selectedPatient && (
            <Button
              onClick={enterStudioModeForSelected}
              size="sm"
              className="shadow-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full h-14 px-6 font-medium border-0 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              title="Entra in modalità allenamento per lo studente selezionato"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              Modalità Allenamento
            </Button>
          )}
        </div>
    </div>;
};