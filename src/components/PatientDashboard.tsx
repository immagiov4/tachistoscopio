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
      settings: todayExercise.settings,
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
              ) : completedToday ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-700 mb-2">
                    Esercizio Completato!
                  </h3>
                  <p className="text-muted-foreground">
                    Hai già completato l'esercizio di oggi. Torna domani per il prossimo!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
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
                      <p className="text-2xl font-bold text-primary">
                        {todayExercise.settings.fontSize}
                      </p>
                      <p className="text-sm text-muted-foreground">Dimensione</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Lista: {todayExercise.word_list?.name}</h4>
                    {todayExercise.word_list?.description && (
                      <p className="text-sm text-muted-foreground">
                        {todayExercise.word_list.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {todayExercise.word_list?.words.slice(0, 10).map((word, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {word}
                        </Badge>
                      ))}
                      {todayExercise.word_list && todayExercise.word_list.words.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{todayExercise.word_list.words.length - 10} altre
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <Button 
                      onClick={startExercise} 
                      size="lg" 
                      className="min-h-[60px] px-8 text-lg touch-manipulation"
                    >
                      <Play className="h-6 w-6 mr-3" />
                      Inizia Esercizio
                    </Button>
                  </div>

                  <div className="text-center text-sm text-muted-foreground space-y-1">
                    <p>💡 Consigli per l'esercizio:</p>
                    <p>• Siediti comodamente di fronte allo schermo</p>
                    <p>• Leggi ogni parola ad alta voce appena la vedi</p>
                    <p>• Se sbagli, tocca il pulsante "Errore"</p>
                    <p>• Concentrati e non avere fretta</p>
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