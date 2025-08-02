import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Users, BookOpen, Calendar, BarChart3, CheckCircle, UserCheck } from 'lucide-react';

interface TutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tutorialSteps = [
  {
    title: "Benvenuto nel Tachistoscopio!",
    description: "Questo breve tutorial ti guiderà attraverso le funzionalità principali della piattaforma per terapisti.",
    icon: CheckCircle,
    content: "La piattaforma ti permette di gestire pazienti, creare esercizi personalizzati e monitorare i progressi della terapia tachistoscopica."
  },
  {
    title: "Gestione Pazienti",
    description: "Crea e gestisci i tuoi pazienti",
    icon: Users,
    content: "Nella sezione 'Gestione Studenti' puoi:\n• Creare nuovi studenti inserendo nome ed email\n• Cercare studenti esistenti\n• Cliccare su uno studente per modificare il suo piano settimanale\n• Visualizzare le statistiche individuali di ogni studente"
  },
  {
    title: "Modalità Allenamento",
    description: "Gestisci gli esercizi durante la terapia",
    icon: UserCheck,
    content: "Il pulsante 'Modalità Allenamento' ti permette di:\n• Entrare nella dashboard dello studente senza login\n• Gestire gli esercizi durante le sessioni in studio\n• Avviare e supervisionare gli esercizi direttamente\n\nPerfetto per gli allenamenti in presenza!"
  },
  {
    title: "Piano Settimanale",
    description: "Assegna esercizi giornalieri",
    icon: Calendar,
    content: "Una volta selezionato uno studente:\n• Visualizzi il piano settimanale (Lunedì-Domenica)\n• Puoi assegnare/modificare esercizi per ogni giorno\n• Monitorare le statistiche dello studente\n• Ogni esercizio usa le impostazioni della lista parole"
  },
  {
    title: "Liste Parole & Esercizi",
    description: "Crea esercizi personalizzati",
    icon: BookOpen,
    content: "Nella sezione 'Liste Parole & Esercizi' puoi:\n• Creare esercizi completi con parole e impostazioni integrate\n• Generare parole automaticamente o inserirle manualmente\n• Configurare durata esposizione, intervallo e formato testo\n• Salvare i tuoi esercizi per riutilizzarli con diversi studenti\n\nUsa il pulsante 'Crea nuovo esercizio' dal Piano Settimanale per accesso rapido!"
  },
  {
    title: "Statistiche",
    description: "Monitora i progressi",
    icon: BarChart3,
    content: "Le statistiche sono integrate nell'elenco studenti e mostrano:\n• Numero di sessioni completate\n• Precisione media dello studente\n• Durata media degli esercizi\n• Cronologia delle ultime sessioni\n\nTutte le informazioni necessarie per monitorare i progressi!"
  }
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ open, onOpenChange }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // Salva che l'utente ha visto il tutorial
    localStorage.setItem('tachistoscope_tutorial_completed', 'true');
    onOpenChange(false);
  };

  const currentStepData = tutorialSteps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" />
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription>
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-sm leading-relaxed whitespace-pre-line">
                {currentStepData.content}
              </div>
              
              {/* Progress indicators */}
              <div className="flex justify-center space-x-2 pt-4">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full ${
                      index === currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Precedente
          </Button>

          <span className="text-sm text-muted-foreground self-center">
            {currentStep + 1} di {tutorialSteps.length}
          </span>

          {currentStep === tutorialSteps.length - 1 ? (
            <Button onClick={handleFinish}>
              Completa Tutorial
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Avanti
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};