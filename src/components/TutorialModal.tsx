import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Users, BookOpen, Calendar, BarChart3, CheckCircle } from 'lucide-react';

interface TutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tutorialSteps = [
  {
    title: "Benvenuto nel Tachistoscopio!",
    description: "Questo breve tutorial ti guiderà attraverso le funzionalità principali della piattaforma per terapisti.",
    icon: CheckCircle,
    content: "La piattaforma ti permette di gestire pazienti, creare liste di parole personalizzate e monitorare i progressi degli esercizi tachistoscopici."
  },
  {
    title: "Gestione Pazienti",
    description: "Crea e gestisci i tuoi pazienti",
    icon: Users,
    content: "Nella sezione 'Gestione Pazienti' puoi:\n• Creare nuovi pazienti inserendo nome ed email del tutore\n• Cercare pazienti esistenti\n• Cliccare su un paziente per modificare il suo piano settimanale\n• Visualizzare le statistiche individuali di ogni paziente"
  },
  {
    title: "Liste Parole",
    description: "Crea le tue liste personalizzate",
    icon: BookOpen,
    content: "Nella sezione 'Liste Parole' puoi:\n• Creare nuove liste di parole per gli esercizi\n• Inserire parole separate da virgole o nuove righe\n• Visualizzare e gestire tutte le tue liste\n• Ogni lista mostra il numero di parole contenute"
  },
  {
    title: "Template Esercizi",
    description: "Configura i parametri degli esercizi",
    icon: Calendar,
    content: "Nella sezione 'Crea Esercizio' puoi:\n• Selezionare una lista di parole\n• Configurare durata esposizione e intervallo\n• Scegliere il formato del testo\n• Salvare template da assegnare ai pazienti"
  },
  {
    title: "Piano Settimanale",
    description: "Assegna esercizi giornalieri",
    icon: BarChart3,
    content: "Una volta selezionato un paziente in 'Gestione Pazienti':\n• Visualizzi il piano settimanale (Lunedì-Venerdì)\n• Puoi assegnare esercizi diversi per ogni giorno\n• Modificare le liste di parole per ogni giorno\n• Monitorare le statistiche del paziente"
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
      <DialogContent className="max-w-2xl">
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