'use client';

import { useState } from 'react';
import { QuestData } from '@/types/quest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuestWorkspaceProps {
  quest: QuestData;
  initialCode: string;
  attempt: any;
}

export function QuestWorkspace({ quest, initialCode, attempt }: QuestWorkspaceProps) {
  const [code, setCode] = useState(initialCode);
  const [showHint, setShowHint] = useState(false);
  const [currentHintLevel, setCurrentHintLevel] = useState(0);
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunCode = async () => {
    setIsRunning(true);
    setTestResults(null);

    try {
      // TODO: Implement code execution API
      // For now, simulate test results
      setTimeout(() => {
        setTestResults({
          passed: false,
          message: 'Code execution not yet implemented',
          tests: quest.tests.map(test => ({
            description: test.description,
            passed: false
          }))
        });
        setIsRunning(false);
      }, 1000);
    } catch (error) {
      console.error('Error running code:', error);
      setIsRunning(false);
    }
  };

  const handleShowHint = () => {
    setShowHint(true);
    if (currentHintLevel < quest.hints.length - 1) {
      setCurrentHintLevel(prev => prev + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Instructions */}
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
                    Attempts: {attempt.attemptsCount} | 
                    Status: {attempt.status} |
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
              <Button variant="outline" onClick={handleShowHint}>
                Show Hint
              </Button>
            ) : (
              <div className="space-y-3">
                {quest.hints.slice(0, currentHintLevel + 1).map((hint, index) => (
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
                
                {currentHintLevel < quest.hints.length - 1 && (
                  <Button variant="outline" onClick={handleShowHint} size="sm">
                    Show Next Hint
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-3 rounded ${
                testResults.passed 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`font-medium ${
                  testResults.passed ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResults.message}
                </p>
                
                {testResults.tests && (
                  <div className="mt-3 space-y-2">
                    {testResults.tests.map((test: any, index: number) => (
                      <div key={index} className="text-sm flex items-start gap-2">
                        <span>{test.passed ? '✓' : '✗'}</span>
                        <span className="text-gray-700">{test.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Code Editor */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Code Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-[500px] font-mono text-sm p-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
            />
            
            <div className="flex gap-2 mt-4">
              <Button 
                variant="primary" 
                onClick={handleRunCode}
                disabled={isRunning}
              >
                {isRunning ? 'Running...' : 'Run Tests'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setCode(quest.starterCode)}
              >
                Reset Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
