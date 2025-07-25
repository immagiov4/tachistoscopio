import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCw, Database, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const DebugPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Solo mostra in development/preview
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

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

      // Ricarica la pagina per aggiornare i dati
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

  const resetAllSessions = async () => {
    if (!confirm('Sei sicuro di voler eliminare TUTTE le sessioni di esercizio? Questa azione non può essere annullata.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('exercise_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Elimina tutto

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

  return (
    <Card className="border-2 border-yellow-400 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Database className="h-5 w-5" />
          🚧 Debug Panel (Solo Development)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            onClick={resetAllSessions}
            disabled={loading}
            variant="outline"
            className="border-red-500 text-red-800 hover:bg-red-100 md:col-span-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            ⚠️ Reset TUTTE le Sessioni
          </Button>
        </div>

        <div className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded">
          <strong>Comandi disponibili:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li><strong>Reset Sessioni Mario:</strong> Elimina tutte le sessioni di esercizio di Mario Rossi</li>
            <li><strong>Crea Sessione Test:</strong> Aggiunge una sessione di esempio per Mario</li>
            <li><strong>Reset TUTTE le Sessioni:</strong> Elimina tutte le sessioni di tutti i pazienti</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};