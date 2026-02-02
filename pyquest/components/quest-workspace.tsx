'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { QuestData } from '@/types/quest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface QuestWorkspaceProps {
  quest: QuestData;
  initialCode: string;
  attempt: any;
}

interface ExecutionResult {
  schemaVersion?: string;
  success?: boolean;
  allPassed: boolean;
  stdout: string;
  stderr: string;
  testResults: Array<{
    id?: string;
    description: string;
    expectedBehavior?: string;
    passed: boolean;
    message?: string;
    expected?: any;
    actual?: any;
    error?: string;
  }>;
  executionTime: number;
  xpEarned?: number;
  error?: string;
  message?: string;
  attempt?: {
    attemptsCount: number;
    hintTierUnlocked: number;
    lastResult?: any;
  };
  hintPolicy?: {
    hintUnlockAttempts: number;
    nextHintUnlockAtAttempt: number | null;
  };
}

export function QuestWorkspace({ quest, initialCode, attempt }: QuestWorkspaceProps) {
  const [code, setCode] = useState(initialCode);
  const [showHint, setShowHint] = useState(false);
  const [currentHintLevel, setCurrentHintLevel] = useState(0);
  const [hintTierUnlocked, setHintTierUnlocked] = useState(attempt?.hintTierUnlocked ?? 0);
  const [attemptsCount, setAttemptsCount] = useState(attempt?.attemptsCount ?? 0);
  const [nextHintUnlockAtAttempt, setNextHintUnlockAtAttempt] = useState<number | null>(null);
  const [hintUnlockAttempts] = useState(quest.hintUnlockAttempts ?? 2);
  const [testResults, setTestResults] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save functionality
  const saveCode = useCallback(async (codeToSave: string) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/quests/${quest.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToSave })
      });
      
      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving code:', error);
    } finally {
      setIsSaving(false);
    }
  }, [quest.id]);

  // Auto-save every 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (code !== initialCode) {
        saveCode(code);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [code, initialCode, saveCode]);

  useEffect(() => {
    if (hintTierUnlocked <= 0) {
      setShowHint(false);
      setCurrentHintLevel(0);
      return;
    }

    if (currentHintLevel > hintTierUnlocked - 1) {
      setCurrentHintLevel(Math.max(hintTierUnlocked - 1, 0));
    }
  }, [hintTierUnlocked, currentHintLevel]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setTestResults(null);

    try {
      const response = await fetch(`/api/quests/${quest.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const result: ExecutionResult = await response.json();
      setTestResults(result);

      if (result.attempt) {
        setAttemptsCount(result.attempt.attemptsCount);
        setHintTierUnlocked(result.attempt.hintTierUnlocked);
      }

      if (result.hintPolicy) {
        setNextHintUnlockAtAttempt(result.hintPolicy.nextHintUnlockAtAttempt);
      }
      
      if (result.allPassed) {
        setLastSaved(new Date());
        
        // Check for new achievements after quest completion
        if (result.xpEarned && result.xpEarned > 0) {
          try {
            const achievementResponse = await fetch('/api/achievements/check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (achievementResponse.ok) {
              const achievementData = await achievementResponse.json();
              if (achievementData.newAchievements && achievementData.newAchievements.length > 0) {
                // You could show a notification here for new achievements
                console.log('New achievements unlocked:', achievementData.newAchievements);
              }
            }
          } catch (err) {
            console.error('Error checking achievements:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error running code:', error);
      setTestResults({
        allPassed: false,
        stdout: '',
        stderr: 'Network error occurred',
        testResults: [],
        executionTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveCode = async () => {
    await saveCode(code);
  };

  const handleShowHint = () => {
    if (hintTierUnlocked <= 0) {
      return;
    }

    setShowHint(true);
    if (currentHintLevel < hintTierUnlocked - 1) {
      setCurrentHintLevel(prev => prev + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Instructions & Results */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{quest.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded ${
                quest.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                quest.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {quest.difficulty}
              </span>
              <span className="text-sm text-yellow-600 font-medium">
                {quest.xpReward} XP
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Story</h3>
              <p className="text-gray-700">{quest.story}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Instructions</h3>
              <div className="text-gray-700 whitespace-pre-wrap">{quest.instructions}</div>
            </div>

            {attempt && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="text-sm text-gray-700">
                  <strong>Your Progress:</strong>
                  <div className="mt-1">
                    Attempts: {attemptsCount} | 
                    Status: {attempt.status} |
                    Hint Tier: {hintTierUnlocked}/{quest.hints.length}
                    {attempt.passed && <span className="text-green-600 ml-1">✓ Passed</span>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hints Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            {!showHint ? (
              <div className="space-y-3">
                <Button variant="outline" onClick={handleShowHint} disabled={hintTierUnlocked <= 0}>
                  Show Hint
                </Button>

                {hintTierUnlocked <= 0 && (
                  <div className="text-sm text-gray-600">
                    No hints unlocked yet. Submit {hintUnlockAttempts} attempt(s) to unlock the first hint.
                  </div>
                )}

                {hintTierUnlocked > 0 && nextHintUnlockAtAttempt && (
                  <div className="text-sm text-gray-600">
                    Next hint unlocks after attempt {nextHintUnlockAtAttempt}.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {quest.hints.slice(0, hintTierUnlocked).slice(0, currentHintLevel + 1).map((hint, index) => (
                  <div 
                    key={index}
                    className="bg-yellow-50 border border-yellow-200 rounded p-3"
                  >
                    <div className="text-sm font-medium text-yellow-800 mb-1">
                      Hint {hint.level}
                    </div>
                    <div className="text-gray-700">{hint.text}</div>
                  </div>
                ))}
                
                {currentHintLevel < hintTierUnlocked - 1 && (
                  <Button variant="outline" onClick={handleShowHint} size="sm">
                    Show Next Hint
                  </Button>
                )}

                {hintTierUnlocked < quest.hints.length && nextHintUnlockAtAttempt && (
                  <div className="text-xs text-gray-500">
                    Next hint unlocks after attempt {nextHintUnlockAtAttempt}.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Output & Test Results */}
        {testResults && (
          <>
            {/* Execution Output */}
            {(testResults.stdout || testResults.stderr) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Output</CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.stdout && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">STDOUT</div>
                      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm whitespace-pre-wrap">
                        {testResults.stdout}
                      </div>
                    </div>
                  )}
                  
                  {testResults.stderr && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">STDERR</div>
                      <div className="bg-gray-900 text-red-400 p-3 rounded font-mono text-sm whitespace-pre-wrap">
                        {testResults.stderr}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Executed in {testResults.executionTime}ms
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className={`p-4 rounded ${
                  testResults.allPassed 
                    ? 'bg-green-50 border-2 border-green-500' 
                    : 'bg-red-50 border-2 border-red-400'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">
                      {testResults.allPassed ? '🎉' : '❌'}
                    </span>
                    <p className={`font-bold text-lg ${
                      testResults.allPassed ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {testResults.allPassed 
                        ? `All Tests Passed! +${testResults.xpEarned || quest.xpReward} XP` 
                        : 'Some Tests Failed'}
                    </p>
                  </div>
                  
                  {testResults.testResults && testResults.testResults.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {testResults.testResults.map((test, index) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded border ${
                            test.passed 
                              ? 'bg-white border-green-300' 
                              : 'bg-white border-red-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`text-lg font-bold ${
                              test.passed ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {test.passed ? '✓' : '✗'}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {test.description}
                              </div>

                              {test.expectedBehavior && (
                                <div className="mt-1 text-sm text-gray-600">
                                  Expected behavior: {test.expectedBehavior}
                                </div>
                              )}

                              {test.message && (
                                <div className={`mt-1 text-sm ${test.passed ? 'text-green-700' : 'text-red-700'}`}>
                                  {test.message}
                                </div>
                              )}
                              
                              {!test.passed && (test.expected !== undefined || test.actual !== undefined) && (
                                <div className="mt-2 text-sm space-y-1">
                                  {test.expected !== undefined && (
                                    <div>
                                      <span className="text-gray-600">Expected: </span>
                                      <span className="font-mono text-gray-900">
                                        {JSON.stringify(test.expected)}
                                      </span>
                                    </div>
                                  )}
                                  {test.actual !== undefined && (
                                    <div>
                                      <span className="text-gray-600">Actual: </span>
                                      <span className="font-mono text-gray-900">
                                        {JSON.stringify(test.actual)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {test.error && (
                                <div className="mt-1 text-sm text-red-600">
                                  Error: {test.error}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {testResults.error && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                      <div className="text-sm font-medium text-red-800">
                        Execution Error: {testResults.error}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Right Column: Code Editor */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Code Editor</CardTitle>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {isSaving && (
                  <span className="flex items-center gap-1">
                    <span className="animate-pulse">●</span> Saving...
                  </span>
                )}
                {lastSaved && !isSaving && (
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded overflow-hidden">
              <Editor
                height="500px"
                defaultLanguage="python"
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on',
                  padding: { top: 10, bottom: 10 }
                }}
              />
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button 
                variant="primary" 
                onClick={handleRunCode}
                disabled={isRunning}
                className="font-semibold"
              >
                {isRunning ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Running Tests...
                  </>
                ) : (
                  <>▶ Run Tests</>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleSaveCode}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : '💾 Save'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  if (confirm('Reset code to starter template?')) {
                    setCode(quest.starterCode);
                  }
                }}
              >
                🔄 Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
