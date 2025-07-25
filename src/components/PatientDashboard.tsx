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
import { DebugPanel } from './DebugPanel';
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

export const PatientDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [todayExercise, setTodayExercise] = useState<Exercise | null>(null);
  const [completedToday, setCompletedToday] = useState(false);
  const [currentSession, setCurrentSession] = useState<ExerciseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessibilitySettings, setAccessibilitySettings] = useState<{fontSize: 'small' | 'medium' | 'large' | 'extra-large'}>({ fontSize: 'large' });

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
  }, []);

  // Salva le preferenze quando cambiano
  useEffect(() => {
    localStorage.setItem('tachistoscope-accessibility', JSON.stringify(accessibilitySettings));
  }, [accessibilitySettings]);

  useEffect(() => {
    if (profile) {
      fetchTodayExercise();
    }
  }, [profile]);

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
        .eq('patient_id', profile?.id)
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
          .eq('patient_id', profile?.id)
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
        fontSize: accessibilitySettings.fontSize // Usa le preferenze del paziente
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
          patient_id: profile!.id,
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
      }
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              La Mia Area
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

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Esercizio di Oggi - {DAYS_OF_WEEK[new Date().getDay()]}
              </CardTitle>
              <CardDescription>
                {todayExercise 
                  ? `${todayExercise.word_list?.words.length} parole da leggere`
                  : 'Nessun esercizio programmato per oggi'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!todayExercise ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Non c'è nessun esercizio programmato per oggi.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contatta il tuo terapista per programmare gli esercizi.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {completedToday && (
                    <div className="text-center py-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-green-700 font-medium">
                        Esercizio già completato oggi!
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        Puoi ripeterlo per migliorare
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {todayExercise.word_list?.words.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Parole</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {todayExercise.settings.exposureDuration}ms
                      </p>
                      <p className="text-sm text-muted-foreground">Durata</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Dimensione Testo</p>
                        <div className="flex items-center justify-center gap-2">
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
                            className="w-8 h-8 p-0"
                          >
                            -
                          </Button>
                          <span className="text-lg font-bold text-primary min-w-[80px]">
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
                            className="w-8 h-8 p-0"
                          >
                            +
                          </Button>
                        </div>
                        <div className={`font-bold ${
                          accessibilitySettings.fontSize === 'small' ? 'text-lg' :
                          accessibilitySettings.fontSize === 'medium' ? 'text-xl' :
                          accessibilitySettings.fontSize === 'large' ? 'text-2xl' : 'text-3xl'
                        }`}>
                          Aa
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-semibold text-foreground">{todayExercise.word_list?.name}</h4>
                        {todayExercise.word_list?.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {todayExercise.word_list.description}
                          </p>
                        )}
                        <p className="text-sm font-medium text-primary mt-1">
                          {todayExercise.word_list?.words.length} parole da leggere
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button 
                      onClick={startExercise} 
                      size="lg" 
                      className="min-h-[60px] px-8 text-lg touch-manipulation"
                    >
                      <Play className="h-6 w-6 mr-3" />
                      {completedToday ? "Ripeti Esercizio" : "Inizia Esercizio"}
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-500 text-lg">💡</div>
                      <div className="text-sm space-y-1">
                        <p className="font-medium text-blue-800">Consigli per l'esercizio:</p>
                        <div className="space-y-1 text-blue-700">
                          <p>• Siediti comodamente di fronte allo schermo</p>
                          <p>• Leggi ogni parola ad alta voce appena la vedi</p>
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

          <Card>
            <CardHeader>
              <CardTitle>I Tuoi Progressi</CardTitle>
              <CardDescription>
                Statistiche degli esercizi completati
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Le statistiche saranno disponibili dopo aver completato alcuni esercizi
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Debug Panel - Solo in preview/development */}
          <DebugPanel />
        </div>
      </div>
    </div>
  );
};