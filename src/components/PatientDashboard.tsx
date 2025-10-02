import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Play, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Exercise, ExerciseSession as DBExerciseSession } from '@/types/database';
import { SimpleExerciseDisplay } from './SimpleExerciseDisplay';
import { ThemeSelector, ThemeType, themes } from './ThemeSelector';
import { toast } from '@/hooks/use-toast';
import { LoadingPage, StatsSkeleton } from '@/components/ui/loading';
import {
  ExerciseSession,
  SessionResult,
  fetchTodayExercise,
  checkIfCompletedToday,
  fetchRecentSessions,
  createExerciseSession,
  saveSessionToDatabase,
  fetchStudioPatientProfile,
  formatSessionDate,
  calculateAverageAccuracy,
  calculateTotalWords,
  getAccuracyColorClass
} from './PatientDashboard/helpers';
import { renderExerciseInfo, renderStats } from './PatientDashboard/renderHelpers';
interface PatientDashboardProps {
  studioStudentId?: string; // Per modalità studio del coach
}
const renderSettingsPanel = (
  accessibilitySettings: { fontSize: 'small' | 'medium' | 'large' | 'extra-large' },
  setAccessibilitySettings: (settings: any) => void,
  selectedTheme: ThemeType,
  setSelectedTheme: (theme: ThemeType) => void
) => {
  return (
    <Card className="border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full"></span>
          Impostazioni Esercizio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Dimensione Testo</p>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sizes = ['small', 'medium', 'large', 'extra-large'] as const;
                  const currentIndex = sizes.indexOf(accessibilitySettings.fontSize);
                  if (currentIndex > 0) {
                    setAccessibilitySettings({ fontSize: sizes[currentIndex - 1] });
                  }
                }}
                disabled={accessibilitySettings.fontSize === 'small'}
                className="w-7 h-7 sm:w-8 sm:h-8 p-0 border-2 hover:scale-110 transition-transform duration-200 text-xs"
              >
                -
              </Button>
              <span className="text-xs sm:text-sm font-bold text-primary min-w-[60px] sm:min-w-[70px] text-center px-2 sm:px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                {accessibilitySettings.fontSize === 'small'
                  ? 'Piccolo'
                  : accessibilitySettings.fontSize === 'medium'
                  ? 'Medio'
                  : accessibilitySettings.fontSize === 'large'
                  ? 'Grande'
                  : 'XL'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sizes = ['small', 'medium', 'large', 'extra-large'] as const;
                  const currentIndex = sizes.indexOf(accessibilitySettings.fontSize);
                  if (currentIndex < sizes.length - 1) {
                    setAccessibilitySettings({ fontSize: sizes[currentIndex + 1] });
                  }
                }}
                disabled={accessibilitySettings.fontSize === 'extra-large'}
                className="w-7 h-7 sm:w-8 sm:h-8 p-0 border-2 hover:scale-110 transition-transform duration-200 text-xs"
              >
                +
              </Button>
            </div>
          </div>
          <div className="text-center bg-white rounded-lg p-3 border border-gray-200">
            <div
              className={`font-bold text-gray-700 transition-all duration-300 ${
                accessibilitySettings.fontSize === 'small'
                  ? 'text-xl'
                  : accessibilitySettings.fontSize === 'medium'
                  ? 'text-2xl'
                  : accessibilitySettings.fontSize === 'large'
                  ? 'text-3xl'
                  : 'text-4xl'
              }`}
            >
              Aa
            </div>
            <p className="text-xs text-gray-500 mt-1">Anteprima</p>
          </div>
        </div>
        <ThemeSelector selectedTheme={selectedTheme} onThemeChange={setSelectedTheme} />
      </CardContent>
    </Card>
  );
};

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  studioStudentId
}) => {
  const {
    profile,
    signOut
  } = useAuth();
  const [todayExercise, setTodayExercise] = useState<Exercise | null>(null);
  const [completedToday, setCompletedToday] = useState(false);
  const [currentSession, setCurrentSession] = useState<ExerciseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessibilitySettings, setAccessibilitySettings] = useState<{
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  }>({
    fontSize: 'large'
  });
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('rainbow');
  const [recentSessions, setRecentSessions] = useState<DBExerciseSession[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [studioPatientProfile, setStudioPatientProfile] = useState<any>(null);

  // Usa lo studentId dalla modalità studio o dal profilo corrente
  const effectiveStudentId = studioStudentId || profile?.id;

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
    if (effectiveStudentId) {
      loadTodayExercise();
      loadRecentSessions();
      
      if (studioStudentId) {
        loadStudioPatientProfile();
      }
    }
  }, [effectiveStudentId, studioStudentId]);
  
  const loadStudioPatientProfile = async () => {
    if (!studioStudentId) return;
    
    try {
      const data = await fetchStudioPatientProfile(studioStudentId);
      setStudioPatientProfile(data);
    } catch (error) {
      console.error('Error fetching studio patient profile:', error);
    }
  };

  const loadTodayExercise = async () => {
    if (!effectiveStudentId) return;

    try {
      const exercise = await fetchTodayExercise(effectiveStudentId);
      setTodayExercise(exercise);

      if (exercise) {
        const completed = await checkIfCompletedToday(exercise.id, effectiveStudentId);
        setCompletedToday(completed);
      }
    } catch (error) {
      console.error('Error fetching today exercise:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSessions = async () => {
    if (!effectiveStudentId) return;

    try {
      setStatsLoading(true);
      const sessions = await fetchRecentSessions(effectiveStudentId);
      setRecentSessions(sessions);
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
        variant: 'destructive'
      });
      return;
    }

    const session = createExerciseSession(
      todayExercise.word_list.words,
      todayExercise.settings,
      accessibilitySettings,
      selectedTheme
    );
    setCurrentSession(session);
  };
  const handleExerciseComplete = async (result: SessionResult) => {
    if (!effectiveStudentId || !todayExercise) {
      console.error('Missing required data:', { effectiveStudentId, todayExercise });
      toast({
        title: 'Errore',
        description: 'Dati mancanti per salvare la sessione',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('Attempting to save session:', {
        userProfile: profile,
        isStudent: profile?.role === 'student',
        isCoach: profile?.role === 'coach',
        studioMode: !!studioStudentId
      });

      await saveSessionToDatabase(result, todayExercise.id, effectiveStudentId);
      
      toast({
        title: 'Esercizio Completato!',
        description: `Precisione: ${result.accuracy.toFixed(1)}%`
      });
      setCompletedToday(true);
      await loadRecentSessions();
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast({
        title: 'Errore nel salvare i risultati',
        description: `Dettagli errore: ${error?.message || 'Errore sconosciuto'}`,
        variant: 'destructive'
      });
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
    return <LoadingPage title="Caricamento Dashboard..." description="Stiamo preparando i tuoi dati personali" />;
  }
  if (currentSession) {
    return <SimpleExerciseDisplay session={currentSession} onComplete={handleExerciseComplete} onStop={handleStopExercise} onUpdateSession={setCurrentSession} theme={selectedTheme} />;
  }

  // Applica il tema alla dashboard
  const currentTheme = themes.find(t => t.id === selectedTheme) || themes[3];
  return <div className={`min-h-screen relative ${selectedTheme === 'rainbow' ? 'bg-gradient-to-r' : selectedTheme === 'space' ? 'bg-gradient-to-br' : selectedTheme === 'ocean' ? 'bg-gradient-to-tr' : selectedTheme === 'nature' ? 'bg-gradient-to-bl' : 'bg-gradient-to-r'} ${currentTheme.preview.background}`}>
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(60,60,60,1) 0.5px, transparent 0)`,
      backgroundSize: '2px 2px'
    }}></div>
      <div className="container mx-auto p-2 sm:p-4 max-w-lg sm:max-w-4xl">{/* Larghezza limitata su mobile */}
        <header className="mb-8 flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-white/20">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              La Mia Area
            </h1>
            <p className="text-lg text-gray-600">
              Benvenuto, {studioStudentId ? studioPatientProfile?.full_name : profile?.full_name}
            </p>
          </div>
          {!studioStudentId && (
            <Button onClick={handleSignOut} variant="outline" className="bg-white/40 border-gray-600 text-gray-800 hover:bg-white/60 hover:border-gray-800 hover:text-gray-900 backdrop-blur-sm transition-all duration-200">
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          )}
        </header>

        <div className="grid gap-6">
          <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Calendar className="h-5 w-5" />
                Esercizio di Oggi
              </CardTitle>
              <CardDescription className="text-gray-600">
                {todayExercise ? `${todayExercise.word_list?.words.length} parole da leggere` : 'Rilassati, oggi niente esercizi!'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderExerciseInfo({
                todayExercise,
                completedToday,
                startExercise,
                renderSettings: () =>
                  renderSettingsPanel(
                    accessibilitySettings,
                    setAccessibilitySettings,
                    selectedTheme,
                    setSelectedTheme
                  )
              })}
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-800">I Tuoi Progressi</CardTitle>
              <CardDescription className="text-gray-600">
                Statistiche degli esercizi completati
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <StatsSkeleton />
              ) : (
                renderStats({
                  recentSessions,
                  formatDate: formatSessionDate,
                  getColorClass: getAccuracyColorClass
                })
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>;
};