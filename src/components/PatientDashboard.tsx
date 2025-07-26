import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Play, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Exercise, ExerciseSession as DBExerciseSession, DAYS_OF_WEEK } from '@/types/database';
import { SimpleExerciseDisplay } from './SimpleExerciseDisplay';

import { ThemeSelector, ThemeType, themes } from './ThemeSelector';
import { toast } from '@/hooks/use-toast';

interface ExerciseSession {
  words: string[];
  settings: any;
  startTime: number;
  currentWordIndex: number;
  errors: number[];
  isRunning: boolean;
  isPaused: boolean;
}

interface SessionResult {
  totalWords: number;
  correctWords: number;
  incorrectWords: number;
  accuracy: number;
  duration: number;
  missedWords: string[];
  settings: any;
}

interface PatientDashboardProps {
  studioPatientId?: string; // Per modalità studio del terapista
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ studioPatientId }) => {
  const { profile, signOut } = useAuth();
  const [todayExercise, setTodayExercise] = useState<Exercise | null>(null);
  const [completedToday, setCompletedToday] = useState(false);
  const [currentSession, setCurrentSession] = useState<ExerciseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessibilitySettings, setAccessibilitySettings] = useState<{fontSize: 'small' | 'medium' | 'large' | 'extra-large'}>({ fontSize: 'large' });
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('rainbow');
  const [recentSessions, setRecentSessions] = useState<DBExerciseSession[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Usa il patientId dalla modalità studio o dal profilo corrente
  const effectivePatientId = studioPatientId || profile?.id;

  // Carica le preferenze salvate
  useEffect(() => {
    const saved = localStorage.getItem('tachistoscope-accessibility');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setAccessibilitySettings(parsedSettings);
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    }
    
    const savedTheme = localStorage.getItem('tachistoscope-theme');
    if (savedTheme) {
      setSelectedTheme(savedTheme as ThemeType);
    }
  }, []);

  // Salva le preferenze quando cambiano
  useEffect(() => {
    localStorage.setItem('tachistoscope-accessibility', JSON.stringify(accessibilitySettings));
  }, [accessibilitySettings]);

  useEffect(() => {
    localStorage.setItem('tachistoscope-theme', selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    if (effectivePatientId) {
      fetchTodayExercise();
      fetchRecentSessions();
    }
  }, [effectivePatientId]);

  const fetchTodayExercise = async () => {
    try {
      const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday

      // Check if exercise for today exists
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select(`
          *,
          word_list:word_lists(*)
        `)
        .eq('patient_id', effectivePatientId)
        .eq('day_of_week', today)
        .single();

      if (exerciseError && exerciseError.code !== 'PGRST116') {
        console.error('Error fetching today exercise:', exerciseError);
        setLoading(false);
        return;
      }

      setTodayExercise(exercise as any || null);

      // Check if already completed today
      if (exercise) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const { data: sessions, error: sessionsError } = await supabase
          .from('exercise_sessions')
          .select('*')
          .eq('exercise_id', exercise.id)
          .eq('patient_id', effectivePatientId)
          .gte('completed_at', startOfDay.toISOString())
          .lte('completed_at', endOfDay.toISOString());

        if (sessionsError) {
          console.error('Error checking today sessions:', sessionsError);
        } else {
          setCompletedToday(sessions && sessions.length > 0);
        }
      }
    } catch (error) {
      console.error('Error fetching today exercise:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSessions = async () => {
    try {
      setStatsLoading(true);
      
      // Recupera le ultime 10 sessioni dell'utente
      const { data: sessions, error } = await supabase
        .from('exercise_sessions')
        .select('*')
        .eq('patient_id', effectivePatientId)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching sessions:', error);
      } else {
        setRecentSessions(sessions || []);
      }
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const startExercise = () => {
    if (!todayExercise?.word_list) {
      toast({
        title: 'Errore',
        description: 'Esercizio non disponibile',
        variant: 'destructive',
      });
      return;
    }

    const session: ExerciseSession = {
      words: todayExercise.word_list.words,
      settings: {
        ...todayExercise.settings,
        fontSize: accessibilitySettings.fontSize, // Usa le preferenze del paziente
        theme: selectedTheme // Aggiungi il tema
      },
      startTime: Date.now(),
      currentWordIndex: 0,
      errors: [],
      isRunning: true,
      isPaused: false,
    };

    setCurrentSession(session);
  };

  const handleExerciseComplete = async (result: SessionResult) => {
    try {
      // Save session to database
      const { error } = await supabase
        .from('exercise_sessions')
        .insert({
          exercise_id: todayExercise!.id,
          patient_id: effectivePatientId!,
          total_words: result.totalWords,
          correct_words: result.correctWords,
          incorrect_words: result.incorrectWords,
          accuracy: result.accuracy,
          duration: result.duration,
          missed_words: result.missedWords,
        });

      if (error) {
        console.error('Error saving session:', error);
        toast({
          title: 'Errore',
          description: 'Errore nel salvare i risultati',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Esercizio Completato!',
          description: `Precisione: ${result.accuracy.toFixed(1)}%`,
        });
        setCompletedToday(true);
        await fetchRecentSessions(); // Aggiorna anche le statistiche
      }
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      // Evita doppio trigger rimuovendo immediatamente la sessione corrente
      setCurrentSession(null);
    }
  };

  const handleStopExercise = () => {
    setCurrentSession(null);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return <div className="p-4">Caricamento...</div>;
  }

  if (currentSession) {
    return (
      <SimpleExerciseDisplay
        session={currentSession}
        onComplete={handleExerciseComplete}
        onStop={handleStopExercise}
        onUpdateSession={setCurrentSession}
        theme={selectedTheme}
      />
    );
  }

  // Applica il tema alla dashboard
  const currentTheme = themes.find(t => t.id === selectedTheme) || themes[3];

  return (
    <div className={`min-h-screen relative ${
      selectedTheme === 'rainbow' ? 'bg-gradient-to-r' : 
      selectedTheme === 'space' ? 'bg-gradient-to-br' :
      selectedTheme === 'ocean' ? 'bg-gradient-to-tr' :
      selectedTheme === 'nature' ? 'bg-gradient-to-bl' :
      'bg-gradient-to-r'
    } ${currentTheme.preview.background}`}>
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(60,60,60,1) 0.5px, transparent 0)`,
          backgroundSize: '2px 2px'
        }}
      ></div>
      <div className="container mx-auto p-4 max-w-4xl">
        <header className="mb-8 flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-white/20">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              La Mia Area
            </h1>
            <p className="text-lg text-gray-600">
              Benvenuto, {profile?.full_name}
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="bg-white/40 border-gray-600 text-gray-800 hover:bg-white/60 hover:border-gray-800 hover:text-gray-900 backdrop-blur-sm transition-all duration-200">
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </header>

        <div className="grid gap-6">
          <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Calendar className="h-5 w-5" />
                Esercizio di Oggi
              </CardTitle>
              <CardDescription className="text-gray-600">
                {todayExercise 
                  ? `${todayExercise.word_list?.words.length} parole da leggere`
                  : 'Rilassati, oggi niente esercizi!'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!todayExercise ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">😎</div>
                  <p className="text-lg font-medium text-gray-700">
                    Giorno libero!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedToday && (
                    <div className="text-center py-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                      <p className="text-green-700 font-medium text-sm">
                        Esercizio già completato oggi!
                      </p>
                      <p className="text-xs text-green-600">
                        Puoi ripeterlo per migliorare
                      </p>
                    </div>
                  )}

                  {/* Info della lista con design migliorato */}
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm border border-primary/20 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0 animate-pulse"></div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">{todayExercise.word_list?.name}</h4>
                        {todayExercise.word_list?.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {todayExercise.word_list.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                            {todayExercise.word_list?.words.length} parole
                          </span>
                          <span className="text-xs text-gray-500">da leggere</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Controlli eleganti per dimensione testo */}
                  <div className="border-2 border-gray-100 rounded-xl p-4 bg-white/80 backdrop-blur-sm hover:border-primary/30 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Dimensione Testo
                      </p>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const sizes = ['small', 'medium', 'large', 'extra-large'] as const;
                            const currentIndex = sizes.indexOf(accessibilitySettings.fontSize);
                            if (currentIndex > 0) {
                              setAccessibilitySettings({fontSize: sizes[currentIndex - 1]});
                            }
                          }}
                          disabled={accessibilitySettings.fontSize === 'small'}
                          className="w-8 h-8 p-0 border-2 hover:scale-110 transition-transform duration-200"
                        >
                          -
                        </Button>
                        <span className="text-sm font-bold text-primary min-w-[70px] text-center px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                          {accessibilitySettings.fontSize === 'small' ? 'Piccolo' :
                           accessibilitySettings.fontSize === 'medium' ? 'Medio' :
                           accessibilitySettings.fontSize === 'large' ? 'Grande' : 'XL'}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const sizes = ['small', 'medium', 'large', 'extra-large'] as const;
                            const currentIndex = sizes.indexOf(accessibilitySettings.fontSize);
                            if (currentIndex < sizes.length - 1) {
                              setAccessibilitySettings({fontSize: sizes[currentIndex + 1]});
                            }
                          }}
                          disabled={accessibilitySettings.fontSize === 'extra-large'}
                          className="w-8 h-8 p-0 border-2 hover:scale-110 transition-transform duration-200"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                      <div className={`font-bold text-gray-700 transition-all duration-300 ${
                        accessibilitySettings.fontSize === 'small' ? 'text-xl' :
                        accessibilitySettings.fontSize === 'medium' ? 'text-2xl' :
                        accessibilitySettings.fontSize === 'large' ? 'text-3xl' : 'text-4xl'
                      }`}>
                        Aa
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Anteprima dimensione</p>
                    </div>
                  </div>

                  {/* Tema compatto */}
                  <ThemeSelector 
                    selectedTheme={selectedTheme}
                    onThemeChange={setSelectedTheme}
                  />

                  <Button
                    onClick={startExercise} 
                    size="lg" 
                    className="w-full min-h-[56px] text-lg font-semibold touch-manipulation bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 border-0"
                  >
                    <Play className="h-6 w-6 mr-3" />
                    {completedToday ? "Ripeti Esercizio" : "Inizia Esercizio"}
                  </Button>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-500 text-sm">💡</div>
                      <div className="text-xs">
                        <p className="font-medium text-blue-800 mb-1">Consigli:</p>
                        <div className="space-y-0.5 text-blue-700">
                          <p>• Siediti comodamente di fronte allo schermo</p>
                          <p>• Leggi ogni parola ad alta voce</p>
                          <p>• Se sbagli, tocca ovunque sullo schermo</p>
                          <p>• Concentrati e non avere fretta</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-gray-800">I Tuoi Progressi</CardTitle>
              <CardDescription className="text-gray-600">
                Statistiche degli esercizi completati
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Caricamento statistiche...</p>
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    Completa il tuo primo esercizio per vedere le statistiche
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Statistiche generali */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg border-l-4 border-blue-500" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                      backdropFilter: 'blur(8px) saturate(1.2)',
                      boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 8px, inset rgba(255, 255, 255, 0.5) 0px 1px 0px'
                    }}>
                      <div className="text-2xl font-bold text-blue-700">
                        {recentSessions.length}
                      </div>
                      <div className="text-xs text-blue-600">Sessioni</div>
                    </div>
                    <div className="text-center p-3 rounded-lg border-l-4 border-green-500" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                      backdropFilter: 'blur(8px) saturate(1.2)',
                      boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 8px, inset rgba(255, 255, 255, 0.5) 0px 1px 0px'
                    }}>
                      <div className="text-2xl font-bold text-green-700">
                        {Math.round(recentSessions.reduce((acc, s) => acc + s.accuracy, 0) / recentSessions.length)}%
                      </div>
                      <div className="text-xs text-green-600">Precisione Media</div>
                    </div>
                    <div className="text-center p-3 rounded-lg border-l-4 border-orange-500" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                      backdropFilter: 'blur(8px) saturate(1.2)',
                      boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 8px, inset rgba(255, 255, 255, 0.5) 0px 1px 0px'
                    }}>
                      <div className="text-2xl font-bold text-orange-700">
                        {recentSessions.reduce((acc, s) => acc + s.total_words, 0)}
                      </div>
                      <div className="text-xs text-orange-600">Parole Totali</div>
                    </div>
                  </div>

                  {/* Ultime sessioni */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Ultime Sessioni</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {recentSessions.slice(0, 5).map((session, index) => {
                        const date = new Date(session.completed_at);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString();
                        
                        let dateLabel;
                        if (isToday) {
                          dateLabel = `Oggi ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
                        } else if (isYesterday) {
                          dateLabel = `Ieri ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
                        } else {
                          dateLabel = date.toLocaleDateString('it-IT', { 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        }

                        return (
                          <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                session.accuracy >= 90 ? 'bg-green-500' :
                                session.accuracy >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <div>
                                <div className="text-sm font-medium text-gray-800">
                                  {session.correct_words}/{session.total_words} parole ({Math.round(session.accuracy)}%)
                                </div>
                                <div className="text-xs text-gray-600">{dateLabel}</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {Math.round(session.duration / 1000)}s
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progressi nel tempo */}
                  {recentSessions.length >= 3 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Andamento Precisione</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-end justify-between gap-1 h-24">
                          {recentSessions.slice(0, 7).reverse().map((session, index) => {
                            const height = Math.max((session.accuracy / 100) * 80, 8); // Minimo 8px di altezza
                            return (
                              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                                <div className="text-xs text-gray-600 font-medium">
                                  {Math.round(session.accuracy)}%
                                </div>
                                <div 
                                  className={`w-full rounded transition-all duration-300 ${
                                    session.accuracy >= 90 ? 'bg-green-500' :
                                    session.accuracy >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ height: `${height}px` }}
                                  title={`Precisione: ${Math.round(session.accuracy)}%`}
                                ></div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-2">
                          Ultime {Math.min(recentSessions.length, 7)} sessioni
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};