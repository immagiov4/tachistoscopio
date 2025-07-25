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
        <Loader2 className="h-8 w-8 animate-spin" />
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
