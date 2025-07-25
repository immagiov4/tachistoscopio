import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, RotateCcw, Settings, CheckCircle, XCircle, Clock, Target } from 'lucide-react';
import { SessionResult } from '@/types/tachistoscope';

interface ResultsPanelProps {
  results: SessionResult;
  onBackToSettings: () => void;
  onStartAgain: () => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  onBackToSettings,
  onStartAgain
}) => {
  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const downloadResults = () => {
    const resultsText = `
Tachistoscope Exercise Results
============================

Date: ${new Date().toLocaleString()}
Word List: ${results.wordListName}
Total Words: ${results.totalWords}
Correct: ${results.correctWords}
Incorrect: ${results.incorrectWords}
Accuracy: ${results.accuracy.toFixed(1)}%
Duration: ${formatDuration(results.duration)}

Settings Used:
- Exposure Duration: ${results.settings.exposureDuration}ms
- Interval Duration: ${results.settings.intervalDuration}ms
- Font Size: ${results.settings.fontSize}
- Text Case: ${results.settings.textCase}
- Masking: ${results.settings.useMask ? 'Enabled' : 'Disabled'}
${results.settings.useMask ? `- Mask Duration: ${results.settings.maskDuration}ms` : ''}

${results.missedWords.length > 0 ? `
Missed Words:
${results.missedWords.map(word => `- ${word}`).join('\n')}
` : 'No words were missed!'}
    `.trim();

    const blob = new Blob([resultsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tachistoscope-results-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-success';
    if (accuracy >= 75) return 'text-warning';
    return 'text-destructive';
  };

  const getAccuracyMessage = (accuracy: number) => {
    if (accuracy >= 95) return 'Excellent! Outstanding performance.';
    if (accuracy >= 85) return 'Great job! Very good accuracy.';
    if (accuracy >= 75) return 'Good work! Room for improvement.';
    if (accuracy >= 60) return 'Keep practicing to improve accuracy.';
    return 'More practice needed. Try longer exposure times.';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Exercise Results
          </CardTitle>
          <CardDescription>
            Exercise completed on {new Date().toLocaleString()}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Words</p>
                <p className="text-2xl font-bold">{results.totalWords}</p>
              </div>
              <div className="text-muted-foreground">
                <Clock className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Correct</p>
                <p className="text-2xl font-bold text-success">{results.correctWords}</p>
              </div>
              <div className="text-success">
                <CheckCircle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Incorrect</p>
                <p className="text-2xl font-bold text-destructive">{results.incorrectWords}</p>
              </div>
              <div className="text-destructive">
                <XCircle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{formatDuration(results.duration)}</p>
              </div>
              <div className="text-muted-foreground">
                <Clock className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accuracy Score</CardTitle>
          <CardDescription>
            Your reading accuracy for this exercise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                <span className={getAccuracyColor(results.accuracy)}>
                  {results.accuracy.toFixed(1)}%
                </span>
              </span>
              <Badge variant={results.accuracy >= 85 ? "default" : results.accuracy >= 75 ? "secondary" : "destructive"}>
                {results.accuracy >= 90 ? 'Excellent' : 
                 results.accuracy >= 75 ? 'Good' : 
                 results.accuracy >= 60 ? 'Fair' : 'Needs Practice'}
              </Badge>
            </div>
            <Progress value={results.accuracy} className="w-full h-3" />
            <p className="text-sm text-muted-foreground">
              {getAccuracyMessage(results.accuracy)}
            </p>
          </div>
        </CardContent>
      </Card>

      {results.missedWords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Words to Review</CardTitle>
            <CardDescription>
              These words were marked as incorrect during the exercise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {results.missedWords.map((word, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {word}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Exercise Settings</CardTitle>
          <CardDescription>
            Settings used for this exercise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Word List:</span>
                <span className="text-sm font-medium">{results.wordListName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Exposure Duration:</span>
                <span className="text-sm font-medium">{results.settings.exposureDuration}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Interval Duration:</span>
                <span className="text-sm font-medium">{results.settings.intervalDuration}ms</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Font Size:</span>
                <span className="text-sm font-medium capitalize">{results.settings.fontSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Text Case:</span>
                <span className="text-sm font-medium capitalize">{results.settings.textCase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Masking:</span>
                <span className="text-sm font-medium">
                  {results.settings.useMask ? `Enabled (${results.settings.maskDuration}ms)` : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-center">
        <Button onClick={downloadResults} variant="outline" size="lg">
          <Download className="mr-2 h-4 w-4" />
          Download Results
        </Button>
        <Button onClick={onStartAgain} variant="outline" size="lg">
          <RotateCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button onClick={onBackToSettings} size="lg">
          <Settings className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>
      </div>
    </div>
  );
};