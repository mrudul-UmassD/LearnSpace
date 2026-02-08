'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { QuestData, ComponentTest } from '@/lib/quest-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Eye, Code, PlayCircle } from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface ComponentQuestEditorProps {
  quest: QuestData;
  initialCode: string;
  onSave?: (code: string) => Promise<void>;
}

interface ComponentTestResult {
  id: string;
  type: string;
  description: string;
  passed: boolean;
  message?: string;
  actual?: string;
  expected?: string;
}

interface ExecutionResult {
  success: boolean;
  allPassed: boolean;
  testResults: ComponentTestResult[];
  renderedHTML?: string;
  error?: string;
  executionTimeMs: number;
}

export function ComponentQuestEditor({ quest, initialCode, onSave }: ComponentQuestEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [testResults, setTestResults] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showTests, setShowTests] = useState(true);

  // Auto-save functionality
  const saveCode = useCallback(async (codeToSave: string) => {
    if (!onSave) return;
    
    try {
      setIsSaving(true);
      await onSave(codeToSave);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving code:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  // Auto-save every 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (code !== initialCode) {
        saveCode(code);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [code, initialCode, saveCode]);

  const handleRunTests = async () => {
    setIsRunning(true);
    setTestResults(null);

    try {
      // First, save the attempt to the backend
      const saveResponse = await fetch(`/api/quests/${quest.id}/execute-component`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questId: quest.id, 
          componentCode: code 
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save attempt');
      }

      // Execute tests client-side using the sandbox
      const { evaluateComponent } = await import('@/lib/component-sandbox');
      
      const result = await evaluateComponent(
        code,
        quest.componentTests || [],
        5000 // 5 second timeout
      );

      setTestResults(result);

      // If all tests passed, mark quest as complete
      if (result.allPassed) {
        await fetch(`/api/quests/${quest.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true })
        });
      }

    } catch (error) {
      console.error('Error executing component:', error);
      setTestResults({
        success: false,
        allPassed: false,
        testResults: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: 0
      });
    } finally {
      setIsRunning(false);
    }
  };

  const passedTests = testResults?.testResults.filter(t => t.passed).length ?? 0;
  const totalTests = testResults?.testResults.length ?? 0;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Quest Info Header */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{quest.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{quest.story}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-700">{quest.instructions}</p>
          </div>
        </CardContent>
      </Card>

      {/* Main Workspace */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel: Code Editor */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="w-5 h-5" />
                Component Code
              </CardTitle>
              <Button
                onClick={handleRunTests}
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    Run Tests
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="typescript"
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Preview & Test Results */}
        <div className="w-1/2 flex flex-col gap-4 min-h-0">
          {/* Live Preview */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'}
              </Button>
            </CardHeader>
            {showPreview && (
              <CardContent className="flex-1 overflow-auto min-h-0">
                {testResults?.renderedHTML ? (
                  <div 
                    className="p-4 border rounded bg-white"
                    dangerouslySetInnerHTML={{ __html: testResults.renderedHTML }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Run tests to see preview</p>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Test Results */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                Tests
                {testResults && (
                  <span className="text-sm font-normal text-gray-600">
                    ({passedTests}/{totalTests} passed)
                  </span>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTests(!showTests)}
              >
                {showTests ? 'Hide' : 'Show'}
              </Button>
            </CardHeader>
            {showTests && (
              <CardContent className="flex-1 overflow-auto min-h-0">
                {testResults ? (
                  <div className="space-y-3">
                    {/* Overall Status */}
                    <div className={`p-3 rounded-lg ${
                      testResults.allPassed 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {testResults.allPassed ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-800">All Tests Passed!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="font-semibold text-red-800">
                              {passedTests}/{totalTests} Tests Passed
                            </span>
                          </>
                        )}
                      </div>
                      {testResults.error && (
                        <p className="text-sm text-red-700 mt-2">{testResults.error}</p>
                      )}
                    </div>

                    {/* Individual Test Results */}
                    {testResults.testResults.map((test, index) => (
                      <div
                        key={test.id || index}
                        className={`p-3 rounded-lg border ${
                          test.passed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {test.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${
                              test.passed ? 'text-green-800' : 'text-red-800'
                            }`}>
                              {test.description}
                            </p>
                            {test.message && (
                              <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                            )}
                            {!test.passed && test.expected && (
                              <div className="mt-2 text-sm space-y-1">
                                <div className="text-red-700">
                                  <span className="font-semibold">Expected:</span> {test.expected}
                                </div>
                                {test.actual && (
                                  <div className="text-red-700">
                                    <span className="font-semibold">Actual:</span> {test.actual}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Execution Time */}
                    <div className="text-xs text-gray-500 text-right">
                      Execution time: {testResults.executionTimeMs}ms
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Run tests to see results</p>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
