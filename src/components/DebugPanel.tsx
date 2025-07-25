import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCw, Database, User, Shuffle, GraduationCap, Trash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DebugPanelProps {
  onRevealTutorial: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ onRevealTutorial }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetMarioSessions = async () => {
    setLoading(true);
    try {
      // Trova il profilo di Mario
      const { data: marioProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', 'Mario Rossi')
        .single();

      if (profileError || !marioProfile) {
        toast({
          title: "Errore",
          description: "Profilo di Mario non trovato",
          variant: "destructive"
        });
        return;
      }

      // Elimina tutte le sessioni di Mario
      const { error: deleteError } = await supabase
        .from('exercise_sessions')
        .delete()
        .eq('patient_id', marioProfile.id);

      if (deleteError) {
        toast({
          title: "Errore",
          description: "Errore nell'eliminazione delle sessioni: " + deleteError.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Successo",
        description: "Tutte le sessioni di Mario sono state eliminate",
      });

      // Forza ricarica della pagina per aggiornare tutti i componenti
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il reset: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetAllSessions = async () => {
    if (!confirm('Sei sicuro di voler eliminare TUTTE le sessioni di esercizio? Questa azione non può essere annullata.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('exercise_sessions')
        .delete()
        .gte('completed_at', '1970-01-01'); // Matcha tutti i record

      if (error) {
        toast({
          title: "Errore",
          description: "Errore nell'eliminazione: " + error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Successo",
        description: "Tutte le sessioni sono state eliminate",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il reset: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTestSession = async () => {
    setLoading(true);
    try {
      // Trova il profilo di Mario
      const { data: marioProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', 'Mario Rossi')
        .single();

      if (profileError || !marioProfile) {
        toast({
          title: "Errore",
          description: "Profilo di Mario non trovato",
          variant: "destructive"
        });
        return;
      }

      // Trova un esercizio esistente
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('id')
        .eq('patient_id', marioProfile.id)
        .limit(1)
        .single();

      if (exerciseError || !exercise) {
        toast({
          title: "Errore",
          description: "Nessun esercizio trovato per Mario",
          variant: "destructive"
        });
        return;
      }

      // Crea una sessione di test
      const { error: insertError } = await supabase
        .from('exercise_sessions')
        .insert({
          exercise_id: exercise.id,
          patient_id: marioProfile.id,
          total_words: 10,
          correct_words: 8,
          incorrect_words: 2,
          accuracy: 80.0,
          duration: 45,
          missed_words: ['parola1', 'parola2']
        });

      if (insertError) {
        toast({
          title: "Errore",
          description: "Errore nella creazione della sessione: " + insertError.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Successo",
        description: "Sessione di test creata per Mario",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la creazione: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createRandomSessions = async () => {
    setLoading(true);
    try {
      // Trova il profilo di Mario
      const { data: marioProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', 'Mario Rossi')
        .single();

      if (profileError || !marioProfile) {
        toast({
          title: "Errore",
          description: "Profilo di Mario non trovato",
          variant: "destructive"
        });
        return;
      }

      // Trova un esercizio esistente
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('id')
        .eq('patient_id', marioProfile.id)
        .limit(1)
        .single();

      if (exerciseError || !exercise) {
        toast({
          title: "Errore",
          description: "Nessun esercizio trovato per Mario",
          variant: "destructive"
        });
        return;
      }

      // Lista di parole possibili per missed_words
      const possibleWords = ['gatto', 'cane', 'sole', 'luna', 'lupo', 'tupo', 'suco', 'casa', 'mare', 'cielo'];
      
      // Crea 15 sessioni randomizzate per gli ultimi 30 giorni
      const sessions = [];
      for (let i = 0; i < 15; i++) {
        const totalWords = Math.floor(Math.random() * 10) + 5; // 5-14 parole
        const correctWords = Math.floor(Math.random() * totalWords); // 0 a totalWords
        const incorrectWords = totalWords - correctWords;
        const accuracy = totalWords > 0 ? (correctWords / totalWords) * 100 : 0;
        const duration = Math.floor(Math.random() * 20000) + 5000; // 5-25 secondi
        
        // Genera parole mancate casualmente
        const numMissedWords = Math.floor(Math.random() * 4); // 0-3 parole mancate
        const missedWords = [];
        for (let j = 0; j < numMissedWords; j++) {
          const randomWord = possibleWords[Math.floor(Math.random() * possibleWords.length)];
          if (!missedWords.includes(randomWord)) {
            missedWords.push(randomWord);
          }
        }

        // Data casuale negli ultimi 30 giorni
        const daysAgo = Math.floor(Math.random() * 30);
        const completedAt = new Date();
        completedAt.setDate(completedAt.getDate() - daysAgo);
        completedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

        sessions.push({
          exercise_id: exercise.id,
          patient_id: marioProfile.id,
          total_words: totalWords,
          correct_words: correctWords,
          incorrect_words: incorrectWords,
          accuracy: Math.round(accuracy * 100) / 100, // Arrotonda a 2 decimali
          duration: duration,
          missed_words: missedWords,
          completed_at: completedAt.toISOString()
        });
      }

      // Inserisci tutte le sessioni
      const { error: insertError } = await supabase
        .from('exercise_sessions')
        .insert(sessions);

      if (insertError) {
        toast({
          title: "Errore",
          description: "Errore nella creazione delle sessioni: " + insertError.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Successo",
        description: `${sessions.length} sessioni randomizzate create per Mario`,
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la creazione: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm("Sei sicuro di voler cancellare TUTTI i dati del database? Questa azione eliminerà:\n- Tutti i pazienti\n- Tutte le sessioni di esercizio\n- Tutti gli esercizi\n- Tutte le liste di parole\n\nQuesta operazione NON può essere annullata!")) {
      return;
    }
    
    if (!confirm("ULTIMA CONFERMA: Stai per eliminare TUTTO il contenuto del database. Sei ASSOLUTAMENTE sicuro?")) {
      return;
    }

    setLoading(true);
    try {
      // Elimina in ordine per rispettare le foreign key
      // Usa una condizione che matcha tutti i record
      const { error: sessionsError } = await supabase
        .from('exercise_sessions')
        .delete()
        .gte('completed_at', '1970-01-01');
      
      if (sessionsError) throw sessionsError;

      const { error: exercisesError } = await supabase
        .from('exercises')
        .delete()
        .gte('created_at', '1970-01-01');
      
      if (exercisesError) throw exercisesError;

      const { error: wordListsError } = await supabase
        .from('word_lists')
        .delete()
        .gte('created_at', '1970-01-01');
      
      if (wordListsError) throw wordListsError;

      const { error: patientsError } = await supabase
        .from('profiles')
        .delete()
        .eq('role', 'patient');
      
      if (patientsError) throw patientsError;

      toast({
        title: "Database Pulito",
        description: "Tutti i dati sono stati eliminati dal database",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la pulizia del database: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-yellow-400 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Database className="h-5 w-5" />
          🚧 Debug Panel (Solo Development)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={resetMarioSessions}
            disabled={loading}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <User className="h-4 w-4 mr-2" />
            )}
            Reset Sessioni Mario
          </Button>

          <Button
            onClick={createTestSession}
            disabled={loading}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Crea Sessione Test
          </Button>

          <Button
            onClick={createRandomSessions}
            disabled={loading}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4 mr-2" />
            )}
            Crea 15 Sessioni Random
          </Button>

          <Button
            onClick={onRevealTutorial}
            disabled={loading}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Rivedi Tutorial
          </Button>

          <Button
            onClick={resetAllSessions}
            disabled={loading}
            variant="outline"
            className="border-red-500 text-red-800 hover:bg-red-100"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            ⚠️ Reset TUTTE le Sessioni
          </Button>

          <Button
            onClick={clearAllData}
            disabled={loading}
            variant="outline"
            className="border-red-700 text-red-900 hover:bg-red-200 md:col-span-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash className="h-4 w-4 mr-2" />
            )}
            🔥 CANCELLA TUTTO IL DATABASE
          </Button>
        </div>

        <div className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded">
          <strong>Comandi disponibili:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li><strong>Reset Sessioni Mario:</strong> Elimina tutte le sessioni di esercizio di Mario Rossi</li>
            <li><strong>Crea Sessione Test:</strong> Aggiunge una sessione di esempio per Mario</li>
            <li><strong>Crea 15 Sessioni Random:</strong> Genera 15 sessioni con dati casuali negli ultimi 30 giorni</li>
            <li><strong>Rivedi Tutorial:</strong> Mostra di nuovo il tutorial guidato</li>
            <li><strong>Reset TUTTE le Sessioni:</strong> Elimina tutte le sessioni di tutti i pazienti</li>
            <li><strong>CANCELLA TUTTO IL DATABASE:</strong> ⚠️ Elimina tutti i dati (pazienti, liste, esercizi, sessioni)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};