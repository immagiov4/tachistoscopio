import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';
import { ExerciseDisplay } from './ExerciseDisplay';
import { ResultsPanel } from './ResultsPanel';
import { WordListManager } from './WordListManager';
import {
  WordList,
  ExerciseSettings,
  ExerciseSession,
  SessionResult,
  DEFAULT_SETTINGS
} from '@/types/tachistoscope';

export const TachistoscopeApp: React.FC = () => {
  const [currentWordList, setCurrentWordList] = useState<WordList>({ id: 'empty', name: 'Nessuna lista', words: [], description: '' });
  const [settings, setSettings] = useState<ExerciseSettings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [results, setResults] = useState<SessionResult | null>(null);
  const [activeTab, setActiveTab] = useState('settings');

  const handleStartExercise = useCallback(() => {
    if (currentWordList.words.length === 0) {
      return;
    }

    const newSession: ExerciseSession = {
      wordList: currentWordList,
      settings: { ...settings },
      startTime: Date.now(),
      currentWordIndex: 0,
      errors: [],
      isRunning: true,
      isPaused: false,
    };

    setSession(newSession);
    setResults(null);
    setActiveTab('exercise');
  }, [currentWordList, settings]);

  const handleExerciseComplete = useCallback((sessionData: ExerciseSession) => {
    const endTime = Date.now();
    const duration = endTime - sessionData.startTime;
    const totalWords = sessionData.wordList.words.length;
    const incorrectWords = sessionData.errors.length;
    const correctWords = totalWords - incorrectWords;
    const accuracy = (correctWords / totalWords) * 100;

    const missedWords = sessionData.errors.map(
      index => sessionData.wordList.words[index]
    );

    const result: SessionResult = {
      totalWords,
      correctWords,
      incorrectWords,
      accuracy,
      duration,
      missedWords,
      settings: sessionData.settings,
      wordListName: sessionData.wordList.name,
    };

    setResults(result);
    setSession(null);
    setActiveTab('results');
  }, []);

  const handleStopExercise = useCallback(() => {
    if (session) {
      handleExerciseComplete(session);
    }
  }, [session, handleExerciseComplete]);

  const handleBackToSettings = useCallback(() => {
    setActiveTab('settings');
    setResults(null);
    setSession(null);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Tachistoscope Training
          </h1>
          <p className="text-lg text-muted-foreground">
            Improve reading speed and visual word recognition
          </p>
        </header>

        {session ? (
          <ExerciseDisplay
            session={session}
            onComplete={handleExerciseComplete}
            onStop={handleStopExercise}
            onUpdateSession={setSession}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="wordlists">Word Lists</TabsTrigger>
              <TabsTrigger value="results" disabled={!results}>
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-6">
              <SettingsPanel
                settings={settings}
                onSettingsChange={setSettings}
                currentWordList={currentWordList}
                onWordListChange={setCurrentWordList}
                onStartExercise={handleStartExercise}
              />
            </TabsContent>

            <TabsContent value="wordlists" className="mt-6">
              <WordListManager
                currentWordList={currentWordList}
                onWordListChange={setCurrentWordList}
              />
            </TabsContent>

            <TabsContent value="results" className="mt-6">
              {results && (
                <ResultsPanel
                  results={results}
                  onBackToSettings={handleBackToSettings}
                  onStartAgain={handleStartExercise}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};