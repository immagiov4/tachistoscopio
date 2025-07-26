import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div 
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
        className
      )}
      aria-label="Caricamento"
    />
  );
};

interface LoadingPageProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ 
  title = "Caricamento...", 
  description,
  className 
}) => {
  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50",
      className
    )}>
      <div className="text-center space-y-6 p-8">
        {/* Spinner elegante */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-2 border-transparent border-t-purple-400 rounded-full animate-spin animation-delay-75"></div>
          </div>
        </div>
        
        {/* Testo con animazione */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-800 animate-pulse">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
        
        {/* Indicatori di progresso animati */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-100"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-200"></div>
        </div>
      </div>
    </div>
  );
};

interface LoadingCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ 
  title = "Caricamento dati...", 
  description,
  className 
}) => {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-sm p-6",
      className
    )}>
      <div className="text-center space-y-4">
        <div className="w-8 h-8 mx-auto">
          <LoadingSpinner size="lg" className="text-blue-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-medium text-gray-800">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Skeleton components per contenuti specifici
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
};

export const StatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
};