'use client';

import { useState } from 'react';
import { QuestData, questDataSchema } from '@/lib/quest-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const defaultQuest: QuestData = {
  id: '',
  world: 'python-basics',
  title: '',
  story: '',
  instructions: '',
  starterCode: '# Write your code below\n',
  solutionHidden: '',
  tests: [
    {
      id: 'test-1',
      type: 'output',
      description: '',
      expectedBehavior: '',
      expected: '',
    },
  ],
  hints: [
    {
      level: 1,
      text: '',
    },
  ],
  hintUnlockAttempts: 2,
  xpReward: 50,
  difficulty: 'beginner',
  order: 1,
};

export function QuestBuilder() {
  const [quest, setQuest] = useState<QuestData>(defaultQuest);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'form' | 'preview' | 'export'>('form');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const handleInputChange = (field: keyof QuestData, value: any) => {
    setQuest((prev) => ({ ...prev, [field]: value }));
    setValidationStatus('idle');
  };

  const handleTestChange = (index: number, field: string, value: any) => {
    const newTests = [...quest.tests];
    newTests[index] = { ...newTests[index], [field]: value };
    setQuest((prev) => ({ ...prev, tests: newTests }));
    setValidationStatus('idle');
  };

  const handleHintChange = (index: number, field: string, value: any) => {
    const newHints = [...quest.hints];
    newHints[index] = { ...newHints[index], [field]: value };
    setQuest((prev) => ({ ...prev, hints: newHints }));
    setValidationStatus('idle');
  };

  const addTest = () => {
    setQuest((prev) => ({
      ...prev,
      tests: [
        ...prev.tests,
        {
          id: `test-${prev.tests.length + 1}`,
          type: 'output',
          description: '',
          expectedBehavior: '',
          expected: '',
        },
      ],
    }));
  };

  const removeTest = (index: number) => {
    if (quest.tests.length > 1) {
      setQuest((prev) => ({
        ...prev,
        tests: prev.tests.filter((_, i) => i !== index),
      }));
    }
  };

  const addHint = () => {
    setQuest((prev) => ({
      ...prev,
      hints: [
        ...prev.hints,
        {
          level: prev.hints.length + 1,
          text: '',
        },
      ],
    }));
  };

  const removeHint = (index: number) => {
    if (quest.hints.length > 1) {
      setQuest((prev) => ({
        ...prev,
        hints: prev.hints.filter((_, i) => i !== index),
      }));
    }
  };

  const validateQuest = () => {
    try {
      questDataSchema.parse(quest);
      setErrors({});
      setValidationStatus('valid');
      return true;
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
      }
      setErrors(newErrors);
      setValidationStatus('invalid');
      return false;
    }
  };

  const exportQuest = () => {
    if (!validateQuest()) return;

    const json = JSON.stringify(quest, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quest.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveQuest = async () => {
    if (!validateQuest()) return;

    try {
      const response = await fetch('/api/admin/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quest),
      });

      if (response.ok) {
        alert('Quest saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error saving quest: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving quest:', error);
      alert('Failed to save quest');
    }
  };

  const loadQuest = (questId: string) => {
    fetch(`/api/quests/${questId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuest(data);
        setValidationStatus('idle');
      })
      .catch((error) => {
        console.error('Error loading quest:', error);
        alert('Failed to load quest');
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quest Builder</h1>
          <p className="text-gray-600 mb-6">Create and manage Python learning quests</p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={activeTab === 'form' ? 'default' : 'outline'}
            onClick={() => setActiveTab('form')}
          >
            📝 Form
          </Button>
          <Button
            variant={activeTab === 'preview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('preview')}
          >
            👁️ Preview
          </Button>
          <Button
            variant={activeTab === 'export' ? 'default' : 'outline'}
            onClick={() => setActiveTab('export')}
          >
            💾 Export
          </Button>
        </div>

        {/* Validation Status */}
        {validationStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg mb-6 ${
              validationStatus === 'valid'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {validationStatus === 'valid' ? '✅ Quest is valid!' : '❌ Quest has validation errors'}
          </motion.div>
        )}

        {/* Form Tab */}
        {activeTab === 'form' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quest ID *</label>
                  <input
                    type="text"
                    value={quest.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    placeholder="python-basics-hello-world"
                    className="w-full p-2 border rounded-lg"
                  />
                  {errors.id && <p className="text-red-600 text-sm mt-1">{errors.id}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">World *</label>
                  <select
                    value={quest.world}
                    onChange={(e) => handleInputChange('world', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="python-basics">Python Basics</option>
                    <option value="data-structures">Data Structures</option>
                    <option value="algorithms">Algorithms</option>
                    <option value="oop">Object-Oriented Programming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={quest.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Hello, Python World!"
                    className="w-full p-2 border rounded-lg"
                  />
                  {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Story *</label>
                  <textarea
                    value={quest.story}
                    onChange={(e) => handleInputChange('story', e.target.value)}
                    placeholder="Tell the story behind this quest..."
                    rows={4}
                    className="w-full p-2 border rounded-lg"
                  />
                  {errors.story && <p className="text-red-600 text-sm mt-1">{errors.story}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Instructions *</label>
                  <textarea
                    value={quest.instructions}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    placeholder="Provide clear instructions for the learner..."
                    rows={4}
                    className="w-full p-2 border rounded-lg"
                  />
                  {errors.instructions && (
                    <p className="text-red-600 text-sm mt-1">{errors.instructions}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Difficulty *</label>
                    <select
                      value={quest.difficulty}
                      onChange={(e) =>
                        handleInputChange('difficulty', e.target.value as any)
                      }
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">XP Reward *</label>
                    <input
                      type="number"
                      value={quest.xpReward}
                      onChange={(e) => handleInputChange('xpReward', parseInt(e.target.value))}
                      min={1}
                      max={1000}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Order *</label>
                    <input
                      type="number"
                      value={quest.order}
                      onChange={(e) => handleInputChange('order', parseInt(e.target.value))}
                      min={1}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Hint Unlock Attempts *
                  </label>
                  <input
                    type="number"
                    value={quest.hintUnlockAttempts}
                    onChange={(e) =>
                      handleInputChange('hintUnlockAttempts', parseInt(e.target.value))
                    }
                    min={1}
                    max={10}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Code */}
            <Card>
              <CardHeader>
                <CardTitle>Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Starter Code *</label>
                  <textarea
                    value={quest.starterCode}
                    onChange={(e) => handleInputChange('starterCode', e.target.value)}
                    placeholder="# Write your code below"
                    rows={6}
                    className="w-full p-2 border rounded-lg font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Solution (Hidden) *</label>
                  <textarea
                    value={quest.solutionHidden}
                    onChange={(e) => handleInputChange('solutionHidden', e.target.value)}
                    placeholder="print('Hello, World!')"
                    rows={6}
                    className="w-full p-2 border rounded-lg font-mono text-sm"
                  />
                  {errors.solutionHidden && (
                    <p className="text-red-600 text-sm mt-1">{errors.solutionHidden}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tests</CardTitle>
                <Button onClick={addTest} size="sm">
                  + Add Test
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {quest.tests.map((test, index) => (
                  <div key={index} className="border p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Test {index + 1}</h4>
                      {quest.tests.length > 1 && (
                        <Button
                          onClick={() => removeTest(index)}
                          variant="outline"
                          size="sm"
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Test ID *</label>
                      <input
                        type="text"
                        value={test.id}
                        onChange={(e) => handleTestChange(index, 'id', e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Type *</label>
                      <select
                        value={test.type}
                        onChange={(e) => handleTestChange(index, 'type', e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="output">Output</option>
                        <option value="variable_exists">Variable Exists</option>
                        <option value="variable_type">Variable Type</option>
                        <option value="variable_value">Variable Value</option>
                        <option value="function_call">Function Call</option>
                        <option value="list_contains">List Contains</option>
                        <option value="list_length">List Length</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Description *</label>
                      <input
                        type="text"
                        value={test.description}
                        onChange={(e) => handleTestChange(index, 'description', e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Expected Behavior *
                      </label>
                      <input
                        type="text"
                        value={test.expectedBehavior}
                        onChange={(e) =>
                          handleTestChange(index, 'expectedBehavior', e.target.value)
                        }
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>

                    {test.type === 'output' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Expected Output</label>
                        <input
                          type="text"
                          value={test.expected || ''}
                          onChange={(e) => handleTestChange(index, 'expected', e.target.value)}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                    )}

                    {(test.type === 'variable_exists' ||
                      test.type === 'variable_type' ||
                      test.type === 'variable_value') && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Variable Name</label>
                        <input
                          type="text"
                          value={test.variable || ''}
                          onChange={(e) => handleTestChange(index, 'variable', e.target.value)}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ))}
                {errors.tests && <p className="text-red-600 text-sm">{errors.tests}</p>}
              </CardContent>
            </Card>

            {/* Hints */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Hints</CardTitle>
                <Button onClick={addHint} size="sm">
                  + Add Hint
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {quest.hints.map((hint, index) => (
                  <div key={index} className="border p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Hint {index + 1}</h4>
                      {quest.hints.length > 1 && (
                        <Button
                          onClick={() => removeHint(index)}
                          variant="outline"
                          size="sm"
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Level *</label>
                      <input
                        type="number"
                        value={hint.level}
                        onChange={(e) =>
                          handleHintChange(index, 'level', parseInt(e.target.value))
                        }
                        min={1}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Text *</label>
                      <textarea
                        value={hint.text}
                        onChange={(e) => handleHintChange(index, 'text', e.target.value)}
                        rows={3}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                ))}
                {errors.hints && <p className="text-red-600 text-sm">{errors.hints}</p>}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button onClick={validateQuest} variant="outline">
                🔍 Validate
              </Button>
              <Button onClick={saveQuest} variant="default">
                💾 Save Quest
              </Button>
            </div>
          </motion.div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader>
                <CardTitle>{quest.title || 'Untitled Quest'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Story</h3>
                  <p className="text-gray-700">{quest.story || 'No story provided'}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Instructions</h3>
                  <p className="text-gray-700">{quest.instructions || 'No instructions provided'}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Starter Code</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                    {quest.starterCode}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    Metadata
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">Difficulty</p>
                      <p className="font-semibold capitalize">{quest.difficulty}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">XP Reward</p>
                      <p className="font-semibold">{quest.xpReward} XP</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">Tests</p>
                      <p className="font-semibold">{quest.tests.length}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">Hints</p>
                      <p className="font-semibold">{quest.hints.length}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Tests</h3>
                  <div className="space-y-2">
                    {quest.tests.map((test, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium">{test.description}</p>
                        <p className="text-sm text-gray-600">{test.expectedBehavior}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Hints</h3>
                  <div className="space-y-2">
                    {quest.hints.map((hint, index) => (
                      <div key={index} className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm font-medium">Level {hint.level}</p>
                        <p className="text-sm text-gray-700">{hint.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader>
                <CardTitle>Export Quest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">JSON Preview</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96">
                    {JSON.stringify(quest, null, 2)}
                  </pre>
                </div>

                <div className="flex gap-4">
                  <Button onClick={exportQuest} variant="default">
                    📥 Download JSON
                  </Button>
                  <Button onClick={validateQuest} variant="outline">
                    🔍 Validate Before Export
                  </Button>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">💡 Export Instructions</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Validate your quest to ensure it meets all requirements</li>
                    <li>Click "Download JSON" to save the quest file</li>
                    <li>Place the file in the <code>content/quests/</code> directory</li>
                    <li>Commit the file to your repository</li>
                    <li>The quest will be available in your app!</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
