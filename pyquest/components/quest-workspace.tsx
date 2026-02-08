'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { QuestData } from '@/types/quest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComponentQuestEditor } from '@/components/component-quest-editor';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface QuestWorkspaceProps {
  quest: QuestData;
  initialCode: string;
  attempt: any;
}

interface ExecutionResult {
  schemaVersion?: string;
  success?: boolean;
  status?: 'passed' | 'failed';
  score?: number;
  feedback?: string;
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
  runtimeMs?: number;
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
  // For component quests, use specialized editor
  if (quest.type === 'component') {
    return (
      <ComponentQuestEditor
        quest={quest}
        initialCode={initialCode}
        onSave={async (code: string) => {
          await fetch(`/api/quests/${quest.id}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          });
        }}
      />
    );
  }

  const [code, setCode] = useState(initialCode);
  const [predictedOutput, setPredictedOutput] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [traceReadingAnswers, setTraceReadingAnswers] = useState<Record<string, string>>({});
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
      console.log('[quest-workspace] Sending code to execute endpoint:', `/api/quests/${quest.id}/execute`);
      
      // Build payload based on quest type
      let payload: any;
      if (quest.type === 'predict_output') {
        payload = { questId: quest.id, predictedStdout: predictedOutput };
      } else if (quest.type === 'explain') {
        payload = { questId: quest.id, explanationText };
      } else if (quest.type === 'trace_reading') {
        payload = { questId: quest.id, traceReadingAnswers };
      } else {
        // code or debug_fix
        payload = { questId: quest.id, userCode: code };
      }

      const response = await fetch(`/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('[quest-workspace] Response status:', response.status);

      const result: ExecutionResult = await response.json();
      console.log('[quest-workspace] Execution result:', result);
      
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
      console.error('[quest-workspace] Error running code:', error);
      
      // Provide more helpful error message
      let errorMessage = 'Network error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for specific connection errors
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to code execution service. Please start the runner service with: docker-compose up runner';
        }
      }
      
      setTestResults({
        allPassed: false,
        stdout: '',
        stderr: errorMessage,
        testResults: [],
        executionTime: 0,
        error: errorMessage
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
            {/* Score and Feedback (for all quest types) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Results</CardTitle>
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
                        : testResults.status === 'failed' ? 'Not Quite Right' : 'Some Tests Failed'}
                    </p>
                  </div>

                  {/* Score Display */}
                  {testResults.score !== undefined && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Score</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              testResults.score >= 80 ? 'bg-green-500' : 
                              testResults.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${testResults.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold">{testResults.score}%</span>
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  {testResults.feedback && (
                    <div className="mb-3 p-3 bg-white rounded border">
                      <div className="text-sm font-medium text-gray-700 mb-1">Feedback</div>
                      <div className="text-gray-800 whitespace-pre-wrap">{testResults.feedback}</div>
                    </div>
                  )}

                  {/* Runtime */}
                  {(testResults.executionTime || testResults.runtimeMs) && (
                    <div className="text-xs text-gray-500 mt-2">
                      Executed in {testResults.runtimeMs || testResults.executionTime}ms
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Execution Output (only for code/debug_fix) */}
            {(quest.type === 'code' || quest.type === 'debug_fix') && (testResults.stdout || testResults.stderr) && (
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
                </CardContent>
              </Card>
            )}

            {/* Test Results Details (only for code/debug_fix with test results) */}
            {(quest.type === 'code' || quest.type === 'debug_fix') && testResults.testResults && testResults.testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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

                  {testResults.error && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                      <div className="text-sm font-medium text-red-800">
                        Execution Error: {testResults.error}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Right Column: Input based on Quest Type */}
      <div className="space-y-4">
        {quest.type === 'predict_output' ? (
          /* Predict Output UI */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Predict the Output</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What will the hidden code print?
                  </label>
                  <textarea
                    className="w-full h-40 p-3 border rounded font-mono text-sm"
                    placeholder="Enter the expected stdout here..."
                    value={predictedOutput}
                    onChange={(e) => setPredictedOutput(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the exact output you expect, including newlines.
                  </p>
                </div>
                
                <Button 
                  variant="primary" 
                  onClick={handleRunCode}
                  disabled={isRunning || !predictedOutput.trim()}
                  className="font-semibold w-full"
                >
                  {isRunning ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Checking...
                    </>
                  ) : (
                    <>✓ Check Prediction</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : quest.type === 'explain' ? (
          /* Explain UI */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Write Your Explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Explanation
                  </label>
                  <textarea
                    className="w-full h-60 p-3 border rounded text-sm"
                    placeholder="Write your explanation here..."
                    value={explanationText}
                    onChange={(e) => setExplanationText(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Write 2-3 sentences covering the key concepts.
                  </p>
                </div>

                {/* Rubric Hints (unlocked after attempts) */}
                {quest.explainRubric && hintTierUnlocked > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="text-sm font-medium text-blue-800 mb-2">Rubric Guidelines:</div>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {quest.explainRubric.slice(0, hintTierUnlocked).map((item, idx) => (
                        <li key={idx}>• {item.description || `Include: ${item.keywords.join(', ')}`}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <Button 
                  variant="primary" 
                  onClick={handleRunCode}
                  disabled={isRunning || !explanationText.trim()}
                  className="font-semibold w-full"
                >
                  {isRunning ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Grading...
                    </>
                  ) : (
                    <>📝 Submit Explanation</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : quest.type === 'trace_reading' ? (
          /* Trace Reading UI */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Debug Trace Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stack Trace Display */}
                {quest.traceReading?.stackTrace && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stack Trace
                    </label>
                    <div className="bg-gray-900 text-red-400 p-4 rounded font-mono text-xs whitespace-pre-wrap border-2 border-red-500 overflow-x-auto">
                      {quest.traceReading.stackTrace}
                    </div>
                  </div>
                )}

                {/* Buggy Code Display */}
                {quest.traceReading?.buggyCode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buggy Code Snippet
                    </label>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm whitespace-pre-wrap border border-gray-600 overflow-x-auto">
                      {quest.traceReading.buggyCode}
                    </div>
                  </div>
                )}

                {/* Questions */}
                {quest.traceReading?.questions && quest.traceReading.questions.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="text-sm font-semibold text-gray-700">Answer the following questions:</div>
                    {quest.traceReading.questions.map((question, idx) => (
                      <div key={question.id} className="border rounded p-4 bg-white">
                        <div className="text-sm font-medium text-gray-800 mb-3">
                          {idx + 1}. {question.question}
                          <span className="ml-2 text-xs text-gray-500">
                            ({question.points || 1} {question.points === 1 ? 'point' : 'points'})
                          </span>
                        </div>

                        {question.type === 'multiple_choice' ? (
                          <div className="space-y-2">
                            {question.options?.map((option, optIdx) => (
                              <label key={optIdx} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  value={option}
                                  checked={traceReadingAnswers[question.id] === option}
                                  onChange={(e) => setTraceReadingAnswers(prev => ({
                                    ...prev,
                                    [question.id]: e.target.value
                                  }))}
                                  className="mt-1"
                                />
                                <span className="text-sm text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="w-full p-2 border rounded text-sm font-mono"
                            placeholder="Type your answer..."
                            value={traceReadingAnswers[question.id] || ''}
                            onChange={(e) => setTraceReadingAnswers(prev => ({
                              ...prev,
                              [question.id]: e.target.value
                            }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button 
                  variant="primary" 
                  onClick={handleRunCode}
                  disabled={isRunning || Object.keys(traceReadingAnswers).length === 0}
                  className="font-semibold w-full mt-4"
                >
                  {isRunning ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Checking...
                    </>
                  ) : (
                    <>🔍 Submit Answers</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Code Editor UI (for 'code' and 'debug_fix') */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {quest.type === 'debug_fix' ? 'Fix the Bug' : 'Code Editor'}
                </CardTitle>
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
              {quest.type === 'debug_fix' && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    🐛 <strong>Debug Challenge:</strong> The starter code has a bug. Find and fix it with minimal changes.
                  </p>
                </div>
              )}

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
        )}
      </div>
    </div>
  );
}
