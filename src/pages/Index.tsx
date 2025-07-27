import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/components/AuthPage';
import { TherapistDashboard } from '@/components/TherapistDashboard';
import { PatientDashboard } from '@/components/PatientDashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-2 border-primary/10 rounded-full mx-auto"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Caricamento in corso...</h2>
            <p className="text-sm text-muted-foreground">Verifica dell'autenticazione</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  if (profile.role === 'therapist') {
    return <TherapistDashboard />;
  }

  if (profile.role === 'patient') {
    return <PatientDashboard />;
  }

  return <AuthPage />;
};

export default Index;
