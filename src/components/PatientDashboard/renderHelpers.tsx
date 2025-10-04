import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Play } from 'lucide-react';
import { Exercise, ExerciseSession as DBExerciseSession } from '@/types/database';

interface ExerciseInfoProps {
  todayExercise: Exercise | null;
  completedToday: boolean;
  startExercise: () => void;
  renderSettings: () => React.ReactNode;
}

export const renderExerciseInfo = ({
  todayExercise,
  completedToday,
  startExercise,
  renderSettings
}: ExerciseInfoProps): React.ReactNode => {
  if (!todayExercise) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">😎</div>
        <p className="text-lg font-medium text-gray-700">Giorno libero!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {completedToday && renderCompletedBadge()}
      {renderWordListInfo(todayExercise)}
      {renderStartButton(startExercise, completedToday)}
      {renderSettings()}
      {renderTips()}
    </div>
  );
};

const renderCompletedBadge = () => (
  <div className="text-center py-3 bg-green-50 border border-green-200 rounded-lg">
    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
    <p className="text-green-700 font-medium text-sm">
      Esercizio già completato oggi!
    </p>
    <p className="text-xs text-green-600">Puoi ripeterlo per migliorare</p>
  </div>
);

const renderWordListInfo = (todayExercise: Exercise) => (
  <div className="bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm border border-primary/20 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="flex items-start gap-3">
      <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0 animate-pulse"></div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-800 mb-1">
          {todayExercise.word_list?.name}
        </h4>
        {todayExercise.word_list?.description && (
          <p className="text-sm text-gray-600">
            {todayExercise.word_list.description}
          </p>
        )}
      </div>
    </div>
  </div>
);

const renderStartButton = (startExercise: () => void, completedToday: boolean) => (
  <Button
    onClick={startExercise}
    size="lg"
    className="w-full min-h-[64px] text-xl font-semibold touch-manipulation bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 border-0 mb-6"
  >
    <Play className="h-7 w-7 mr-3" />
    {completedToday ? "Ripeti Esercizio" : "Inizia Esercizio"}
  </Button>
);

const renderTips = () => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
    <div className="flex items-start gap-2">
      <div className="text-blue-500 text-sm">💡</div>
      <div className="text-xs">
        <p className="font-medium text-blue-800 mb-1">Consigli:</p>
        <div className="space-y-0.5 text-blue-700">
          <p>• Siediti comodamente di fronte allo schermo</p>
          <p>• Leggi ogni parola ad alta voce</p>
          <p>• Se sbagli, tocca ovunque sullo schermo</p>
          <p>• Concentrati e non avere fretta</p>
        </div>
      </div>
    </div>
  </div>
);

interface StatsProps {
  recentSessions: DBExerciseSession[];
  formatDate: (date: string) => string;
  getColorClass: (accuracy: number) => string;
}

export const renderStats = ({
  recentSessions,
  formatDate,
  getColorClass
}: StatsProps): React.ReactNode => {
  if (recentSessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">
          Completa il tuo primo esercizio per vedere le statistiche
        </p>
      </div>
    );
  }

  const avgAccuracy = Math.round(
    recentSessions.reduce((acc, s) => acc + s.accuracy, 0) / recentSessions.length
  );
  const totalWords = recentSessions.reduce((acc, s) => acc + s.total_words, 0);

  return (
    <div className="space-y-4">
      {renderStatsGrid(recentSessions, avgAccuracy, totalWords)}
      {renderSessionsList(recentSessions, formatDate, getColorClass)}
    </div>
  );
};

const renderStatsGrid = (
  sessions: DBExerciseSession[],
  avgAccuracy: number,
  totalWords: number
) => (
  <div className="grid grid-cols-3 gap-4">
    <div
      className="text-center p-3 rounded-lg border-l-4 border-blue-500"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        backdropFilter: 'blur(8px) saturate(1.2)',
        boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 8px, inset rgba(255, 255, 255, 0.5) 0px 1px 0px'
      }}
    >
      <div className="text-2xl font-bold text-blue-700">{sessions.length}</div>
      <div className="text-xs text-blue-600">Sessioni</div>
    </div>
    <div
      className="text-center p-3 rounded-lg border-l-4 border-green-500"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        backdropFilter: 'blur(8px) saturate(1.2)',
        boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 8px, inset rgba(255, 255, 255, 0.5) 0px 1px 0px'
      }}
    >
      <div className="text-2xl font-bold text-green-700">{avgAccuracy}%</div>
      <div className="text-xs text-green-600">Media</div>
    </div>
    <div
      className="text-center p-3 rounded-lg border-l-4 border-purple-500"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        backdropFilter: 'blur(8px) saturate(1.2)',
        boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 8px, inset rgba(255, 255, 255, 0.5) 0px 1px 0px'
      }}
    >
      <div className="text-2xl font-bold text-purple-700">{totalWords}</div>
      <div className="text-xs text-purple-600">Parole</div>
    </div>
  </div>
);

const renderSessionsList = (
  sessions: DBExerciseSession[],
  formatDate: (date: string) => string,
  getColorClass: (accuracy: number) => string
) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold text-gray-700">Ultime sessioni</h3>
    {sessions.map((session) => (
      <div
        key={session.id}
        className="p-3 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200 hover:bg-white/80 transition-all duration-200"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            {formatDate(session.completed_at)}
          </span>
          <Badge className={`${getColorClass(session.accuracy)} text-white border-0`}>
            {Math.round(session.accuracy)}%
          </Badge>
        </div>
        <div className="text-sm text-gray-700">
          {session.correct_words}/{session.total_words} parole corrette
        </div>
      </div>
    ))}
  </div>
);
