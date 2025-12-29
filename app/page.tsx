'use client';

import { useState, useEffect } from 'react';
import { formatDisplayDateTime } from '@/lib/utils/dateUtils';

interface Exercise {
  id: string;
  name: string;
  type: string;
  description: string | null;
  targetSets: number;
  targetReps: number | null;
  targetDuration: number | null;
  targetDaysPerWeek: number;
  createdAt: string;
  updatedAt: string;
  progress?: {
    daysCompletedLast7Days: number;
    progressPercentage: number;
    isOnTrack: boolean;
  };
}

export default function Home() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);
  const [historySessions, setHistorySessions] = useState<any[]>([]);

  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    type: 'REP_BASED',
    description: '',
    targetSets: '3',
    targetReps: '10',
    targetDuration: '3:00',  // Default 3 minutes in MM:SS format
    targetDaysPerWeek: '3',
  });

  const [sessionForm, setSessionForm] = useState({
    sets: '',
    reps: '',
    weight: '',
    duration: '',
    notes: '',
  });

  const [completedSets, setCompletedSets] = useState<number[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [newPersonalBest, setNewPersonalBest] = useState(false);

  const [timerState, setTimerState] = useState({
    isRunning: false,
    seconds: 0,
    intervalId: null as NodeJS.Timeout | null,
  });

  const [repCounter, setRepCounter] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
      }
    };
  }, [timerState.intervalId]);

  const fetchData = async () => {
    try {
      const exercisesRes = await fetch('/api/exercises');
      const exercisesData = await exercisesRes.json();
      
      // Fetch progress for each exercise
      const exercisesWithProgress = await Promise.all(
        exercisesData.map(async (exercise: Exercise) => {
          try {
            const progressRes = await fetch(`/api/exercises/${exercise.id}/progress`);
            const progressData = await progressRes.json();
            return { ...exercise, progress: progressData };
          } catch {
            return exercise;
          }
        })
      );
      
      // Filter out archived exercises
      const activeExercises = exercisesWithProgress.filter(
        (ex: Exercise & { archived?: boolean }) => !ex.archived
      );
      setExercises(activeExercises);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate time-based exercise duration input
    if (exerciseForm.type === 'TIME_BASED') {
      const parsed = parseTimeInput(exerciseForm.targetDuration);
      if (parsed === null) {
        alert('Invalid duration format. Use seconds (e.g., 180) or MM:SS format (e.g., 3:00)');
        return;
      }
      // Ensure we're sending the parsed seconds value
      exerciseForm.targetDuration = String(parsed);
    }
    
    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exerciseForm),
      });

      if (response.ok) {
        setExerciseForm({ 
          name: '', 
          type: 'REP_BASED', 
          description: '',
          targetSets: '3',
          targetReps: '10',
          targetDuration: '3:00',  // Reset to MM:SS format
          targetDaysPerWeek: '3',
        });
        setShowExerciseForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create exercise:', error);
    }
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExerciseId(exercise.id);
    setExerciseForm({
      name: exercise.name,
      type: exercise.type,
      description: exercise.description || '',
      targetSets: String(exercise.targetSets),
      targetReps: String(exercise.targetReps || 10),
      targetDuration: exercise.targetDuration ? formatTime(exercise.targetDuration) : '3:00',
      targetDaysPerWeek: String(exercise.targetDaysPerWeek),
    });
    setShowExerciseForm(true);
  };

  const handleArchiveExercise = async (id: string) => {
    if (!confirm('Are you sure you want to archive this exercise? It will no longer appear in your active list.')) return;

    try {
      await fetch(`/api/exercises/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to archive exercise:', error);
    }
  };

  const handleShowHistory = async (exercise: Exercise) => {
    setHistoryExercise(exercise);
    try {
      const response = await fetch(`/api/exercises/${exercise.id}/sessions`);
      const sessions = await response.json();
      setHistorySessions(sessions);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setHistorySessions([]);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return;

    try {
      await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete exercise:', error);
    }
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExercise) return;

    // Must have at least one completed set
    if (completedSets.length === 0) {
      alert('Please complete at least one set before logging.');
      return;
    }

    // Stop timer if running
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
    }

    try {
      const payload = selectedExercise.type === 'TIME_BASED' 
        ? {
            sets: completedSets.length,
            duration: Math.round(completedSets.reduce((a, b) => a + b, 0) / completedSets.length),
            setsData: JSON.stringify(completedSets), // Store individual set times
            notes: sessionForm.notes,
          }
        : {
            sets: completedSets.length,
            reps: Math.round(completedSets.reduce((a, b) => a + b, 0) / completedSets.length),
            weight: sessionForm.weight ? parseFloat(sessionForm.weight) : null,
            setsData: JSON.stringify(completedSets), // Store individual set reps
            notes: sessionForm.notes,
          };

      // Update existing session or create new one
      const url = currentSessionId
        ? `/api/exercises/${selectedExercise.id}/sessions/${currentSessionId}`
        : `/api/exercises/${selectedExercise.id}/sessions`;
      
      const method = currentSessionId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSessionForm({ sets: '', reps: '', weight: '', duration: '', notes: '' });
        setSelectedExercise(null);
        setTimerState({ isRunning: false, seconds: 0, intervalId: null });
        setRepCounter(0);
        setCompletedSets([]);
        setCurrentSessionId(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to log session:', error);
    }
  };

  const openExerciseDialog = async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setSessionForm({
      sets: String(exercise.targetSets),
      reps: String(exercise.targetReps || ''),
      weight: '',
      duration: String(exercise.targetDuration || ''),
      notes: '',
    });
    setTimerState({ isRunning: false, seconds: 0, intervalId: null });
    setRepCounter(0);
    setNewPersonalBest(false);
    
    // Load personal best
    try {
      const pbResponse = await fetch(`/api/exercises/${exercise.id}/personal-best`);
      if (pbResponse.ok) {
        const pbData = await pbResponse.json();
        setPersonalBest(pbData.personalBest);
      } else {
        setPersonalBest(null);
      }
    } catch (error) {
      console.error('Failed to load personal best:', error);
      setPersonalBest(null);
    }
    
    // Check for today's session
    try {
      const response = await fetch(`/api/exercises/${exercise.id}/sessions/today`);
      if (response.ok) {
        const todaySession = await response.json();
        if (todaySession) {
          setCurrentSessionId(todaySession.id);
          
          // Try to load individual set data from setsData JSON
          if (todaySession.setsData) {
            try {
              const setsArray = JSON.parse(todaySession.setsData);
              setCompletedSets(setsArray);
            } catch (e) {
              // Fallback to old format if JSON parse fails
              if (exercise.type === 'TIME_BASED' && todaySession.sets > 0) {
                const setsArray = Array(todaySession.sets).fill(todaySession.duration);
                setCompletedSets(setsArray);
              }
              if (exercise.type === 'REP_BASED' && todaySession.sets > 0) {
                const setsArray = Array(todaySession.sets).fill(todaySession.reps);
                setCompletedSets(setsArray);
              }
            }
          } else {
            // Fallback for sessions without setsData
            if (exercise.type === 'TIME_BASED' && todaySession.sets > 0) {
              const setsArray = Array(todaySession.sets).fill(todaySession.duration);
              setCompletedSets(setsArray);
            }
            if (exercise.type === 'REP_BASED' && todaySession.sets > 0) {
              const setsArray = Array(todaySession.sets).fill(todaySession.reps);
              setCompletedSets(setsArray);
            }
          }
          
          // Load other form data
          setSessionForm(prev => ({
            ...prev,
            sets: String(todaySession.sets || exercise.targetSets),
            reps: String(todaySession.reps || exercise.targetReps || ''),
            weight: String(todaySession.weight || ''),
            notes: todaySession.notes || '',
          }));
        } else {
          setCompletedSets([]);
          setCurrentSessionId(null);
        }
      } else {
        setCompletedSets([]);
        setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Failed to load today\'s session:', error);
      setCompletedSets([]);
      setCurrentSessionId(null);
    }
  };

  const startTimer = () => {
    if (!timerState.isRunning) {
      const intervalId = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          seconds: prev.seconds + 1,
        }));
      }, 1000);
      setTimerState(prev => ({ ...prev, isRunning: true, intervalId }));
    }
  };

  const stopTimer = () => {
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
    }
    setTimerState(prev => ({ ...prev, isRunning: false, intervalId: null }));
    // Update duration in form
    setSessionForm(prev => ({ ...prev, duration: String(timerState.seconds) }));
  };

  const completeSet = () => {
    // Ignore if timer is 0
    if (timerState.seconds === 0) return;

    // Stop timer if running
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
    }

    // Check if this is a new personal best
    if (personalBest === null || timerState.seconds > personalBest) {
      setPersonalBest(timerState.seconds);
      setNewPersonalBest(true);
      // Auto-hide celebration after 3 seconds
      setTimeout(() => setNewPersonalBest(false), 3000);
    }

    // Record the completed set time
    setCompletedSets(prev => [...prev, timerState.seconds]);

    // Reset timer
    setTimerState({ isRunning: false, seconds: 0, intervalId: null });
  };

  const completeRepSet = () => {
    // Ignore if rep counter is 0
    if (repCounter === 0) return;

    // Check if this is a new personal best
    if (personalBest === null || repCounter > personalBest) {
      setPersonalBest(repCounter);
      setNewPersonalBest(true);
      // Auto-hide celebration after 3 seconds
      setTimeout(() => setNewPersonalBest(false), 3000);
    }

    // Record the completed set reps
    setCompletedSets(prev => [...prev, repCounter]);

    // Reset counter
    setRepCounter(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const parseTimeInput = (input: string): number | null => {
    if (!input) return null;
    
    // Check if it contains a colon (MM:SS format)
    if (input.includes(':')) {
      const parts = input.split(':');
      if (parts.length !== 2) return null;
      
      const mins = parseInt(parts[0]);
      const secs = parts[1];
      
      // Validate seconds format: must be exactly 2 digits
      if (secs.length !== 2) return null;
      
      const secsNum = parseInt(secs);
      
      // Validate range
      if (isNaN(mins) || isNaN(secsNum) || mins < 0 || secsNum < 0 || secsNum > 59) {
        return null;
      }
      
      return mins * 60 + secsNum;
    } else {
      // Pure seconds format
      const seconds = parseInt(input);
      if (isNaN(seconds) || seconds < 0) return null;
      return seconds;
    }
  };

  const validateTimeInput = (input: string): boolean => {
    return parseTimeInput(input) !== null;
  };

  const closeDialog = () => {
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
    }
    setSelectedExercise(null);
    setTimerState({ isRunning: false, seconds: 0, intervalId: null });
    setRepCounter(0);
    setCompletedSets([]);
    setCurrentSessionId(null);
    setPersonalBest(null);
    setNewPersonalBest(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-4xl font-bold">PhysioHelper</h1>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Logout
          </button>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Track your physiotherapy workouts
        </p>

        <div className="max-w-3xl mx-auto">
          {/* Exercises Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Exercises</h2>
              <button
                onClick={() => {
                  setShowExerciseForm(!showExerciseForm);
                  if (showExerciseForm) {
                    setEditingExerciseId(null);
                    setExerciseForm({ 
                      name: '', 
                      type: 'REP_BASED', 
                      description: '',
                      targetSets: '3',
                      targetReps: '10',
                      targetDuration: '3:00',
                      targetDaysPerWeek: '3',
                    });
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                {showExerciseForm ? 'Cancel' : 'Add Exercise'}
              </button>
            </div>

            {showExerciseForm && (
              <form onSubmit={handleCreateExercise} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                <h3 className="text-lg font-semibold mb-3">{editingExerciseId ? 'Edit Exercise' : 'New Exercise'}</h3>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={exerciseForm.type}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, type: e.target.value })}
                    disabled={!!editingExerciseId}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="REP_BASED">Rep Based (e.g., 3 sets of 10 reps)</option>
                    <option value="TIME_BASED">Time Based (e.g., 2 sets of 3 minutes)</option>
                  </select>
                  {editingExerciseId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Exercise type cannot be changed when editing
                    </p>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Sets</label>
                  <input
                    type="number"
                    value={exerciseForm.targetSets}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, targetSets: e.target.value })}
                    required
                    min="1"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                  />
                </div>
                
                {exerciseForm.type === 'REP_BASED' ? (
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Reps per Set</label>
                    <input
                      type="number"
                      value={exerciseForm.targetReps}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, targetReps: e.target.value })}
                      required
                      min="1"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Duration per Set</label>
                    <input
                      type="text"
                      value={exerciseForm.targetDuration}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, targetDuration: e.target.value })}
                      onBlur={(e) => {
                        const value = e.target.value;
                        const parsed = parseTimeInput(value);
                        if (parsed !== null) {
                          // Valid input, store as seconds and display as MM:SS
                          const formatted = formatTime(parsed);
                          setExerciseForm({ ...exerciseForm, targetDuration: formatted });
                        }
                      }}
                      required
                      className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                      placeholder="e.g., 180 or 3:00 for 3 minutes"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter seconds (e.g., 180) or MM:SS format (e.g., 3:00)
                    </p>
                  </div>
                )}
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Target Days Per Week</label>
                  <input
                    type="number"
                    value={exerciseForm.targetDaysPerWeek}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, targetDaysPerWeek: e.target.value })}
                    required
                    min="1"
                    max="7"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                  <textarea
                    value={exerciseForm.description}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                  >
                    {editingExerciseId ? 'Update Exercise' : 'Save Exercise'}
                  </button>
                  {editingExerciseId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Are you sure you want to permanently delete this exercise? This cannot be undone.')) {
                          handleDeleteExercise(editingExerciseId);
                          setShowExerciseForm(false);
                          setEditingExerciseId(null);
                          setExerciseForm({ 
                            name: '', 
                            type: 'REP_BASED', 
                            description: '',
                            targetSets: '3',
                            targetReps: '10',
                            targetDuration: '3:00',
                            targetDaysPerWeek: '3',
                          });
                        }
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="space-y-3">
              {exercises.length === 0 ? (
                <p className="text-gray-500">No exercises yet. Add one to get started!</p>
              ) : (
                exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    onClick={() => void openExerciseDialog(exercise)}
                    className="p-4 border rounded hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{exercise.name}</h3>
                          <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">
                            {exercise.type === 'REP_BASED' ? 'Reps' : 'Time'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <p>
                            {exercise.targetSets} sets × {' '}
                            {exercise.type === 'REP_BASED' 
                              ? `${exercise.targetReps} reps`
                              : `${Math.floor((exercise.targetDuration || 0) / 60)}:${String((exercise.targetDuration || 0) % 60).padStart(2, '0')}`
                            }
                          </p>
                        </div>
                        
                        {exercise.progress && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className={`font-medium ${
                                exercise.progress.isOnTrack 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                {exercise.progress.daysCompletedLast7Days} / {exercise.targetDaysPerWeek} days
                              </span>
                              <span className="text-gray-500">in last 7 days</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                              <div 
                                className={`h-2 rounded-full ${
                                  exercise.progress.isOnTrack 
                                    ? 'bg-green-500' 
                                    : 'bg-orange-500'
                                }`}
                                style={{ width: `${Math.min(exercise.progress.progressPercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {exercise.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {exercise.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditExercise(exercise);
                          }}
                          className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowHistory(exercise);
                          }}
                          className="text-purple-500 hover:text-purple-700 text-sm px-2 py-1"
                        >
                          History
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveExercise(exercise.id);
                          }}
                          className="text-orange-500 hover:text-orange-700 text-sm px-2 py-1"
                        >
                          End
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Exercise Session Dialog */}
        {selectedExercise && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedExercise.name}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Target: {selectedExercise.targetSets} sets × {' '}
                    {selectedExercise.type === 'REP_BASED' 
                      ? `${selectedExercise.targetReps} reps`
                      : `${Math.floor((selectedExercise.targetDuration || 0) / 60)}:${String((selectedExercise.targetDuration || 0) % 60).padStart(2, '0')}`
                    }
                  </p>
                </div>
                <button
                  onClick={closeDialog}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleLogSession}>
                {selectedExercise.type === 'REP_BASED' ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Rep Counter</label>
                      
                      {/* Rep Counter Display */}
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="flex items-center gap-4">
                          {/* Manual Input */}
                          <input
                            type="number"
                            value={repCounter}
                            onChange={(e) => setRepCounter(parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-24 px-4 py-3 text-center text-3xl font-bold border-2 rounded dark:bg-gray-600 border-gray-300 dark:border-gray-500"
                          />
                          
                          {/* Big Green + Button */}
                          <button
                            type="button"
                            onClick={() => setRepCounter(prev => prev + 1)}
                            className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 text-white text-5xl font-bold shadow-lg transition-all active:scale-95"
                          >
                            +
                          </button>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                          Target: {selectedExercise.targetReps} reps
                          {personalBest && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                              • PB: {personalBest}
                            </span>
                          )}
                        </p>
                        
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={completeRepSet}
                            disabled={repCounter === 0}
                            className={`px-6 py-2 rounded text-sm font-medium transition-all ${
                              repCounter === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            Complete Set
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Weight (kg) - Optional</label>
                      <input
                        type="number"
                        step="0.1"
                        value={sessionForm.weight}
                        onChange={(e) => setSessionForm({ ...sessionForm, weight: e.target.value })}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                        placeholder="e.g., 5.0"
                      />
                    </div>
                    
                    {/* Display Completed Sets for Reps */}
                    {completedSets.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                        <p className="text-sm font-medium mb-2">
                          Completed Sets: {completedSets.length}
                          {personalBest && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                              (PB: {personalBest} reps)
                            </span>
                          )}
                        </p>
                        <div className="space-y-2">
                          {completedSets.map((reps, index) => {
                            const isPersonalBest = personalBest !== null && reps >= personalBest;
                            return (
                              <div 
                                key={index} 
                                className={`px-3 py-2 rounded flex items-center justify-between ${
                                  isPersonalBest 
                                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold' 
                                    : 'bg-green-500 text-white'
                                }`}
                              >
                                <span>Set {index + 1}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{reps} reps</span>
                                  {isPersonalBest && (
                                    <span className="text-xl" title="Personal Best!">🏆</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Personal Best Celebration for Reps */}
                    {newPersonalBest && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-lg animate-bounce">
                        <p className="text-center text-white font-bold text-lg flex items-center justify-center gap-2">
                          <span className="text-3xl">🎉</span>
                          New Personal Best!
                          <span className="text-3xl">🎉</span>
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Timer</label>
                    
                    {/* Timer Circle */}
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="relative w-56 h-56">
                        {/* Background Circle */}
                        <svg className="w-56 h-56 transform -rotate-90" viewBox="0 0 200 200">
                          <circle
                            cx="100"
                            cy="100"
                            r="85"
                            stroke="currentColor"
                            strokeWidth="20"
                            fill="none"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          {/* Progress Circle */}
                          <circle
                            cx="100"
                            cy="100"
                            r="85"
                            stroke="currentColor"
                            strokeWidth="20"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 85}`}
                            strokeDashoffset={`${2 * Math.PI * 85 * (1 - Math.min(timerState.seconds / (selectedExercise.targetDuration || 1), 1))}`}
                            className={`transition-all drop-shadow-lg ${
                              timerState.isRunning
                                ? 'text-green-500'
                                : timerState.seconds > 0
                                ? 'text-blue-500'
                                : 'text-gray-300'
                            }`}
                            strokeLinecap="round"
                            style={{
                              filter: timerState.isRunning ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))' : 'none'
                            }}
                          />
                        </svg>
                        
                        {/* Center Button */}
                        <button
                          type="button"
                          onClick={timerState.isRunning ? stopTimer : startTimer}
                          className={`absolute inset-0 m-auto w-40 h-40 rounded-full flex flex-col items-center justify-center text-3xl font-bold transition-all ${
                            timerState.isRunning
                              ? 'bg-green-500 hover:bg-green-600 shadow-green-500/50'
                              : timerState.seconds > 0
                              ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/50'
                              : 'bg-gray-400 hover:bg-gray-500'
                          } text-white shadow-2xl`}
                        >
                          <div className="text-4xl">{formatTime(timerState.seconds)}</div>
                          {selectedExercise.targetDuration && (
                            <div className="text-sm mt-1 opacity-80">
                              / {formatTime(selectedExercise.targetDuration)}
                            </div>
                          )}
                        </button>
                      </div>
                      
                      <div className="mt-4 flex gap-2">
                        {!timerState.isRunning && (
                          <button
                            type="button"
                            onClick={completeSet}
                            disabled={timerState.seconds === 0}
                            className={`px-6 py-2 rounded text-sm font-medium transition-all ${
                              timerState.seconds === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            Complete Set
                          </button>
                        )}
                      </div>
                      
                      {/* Display Completed Sets */}
                      {completedSets.length > 0 && (
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                          <p className="text-sm font-medium mb-2">
                            Completed Sets: {completedSets.length}
                            {personalBest && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                (PB: {formatTime(personalBest)})
                              </span>
                            )}
                          </p>
                          <div className="space-y-2">
                            {completedSets.map((time, index) => {
                              const isPersonalBest = personalBest !== null && time >= personalBest;
                              return (
                                <div 
                                  key={index} 
                                  className={`px-3 py-2 rounded flex items-center justify-between ${
                                    isPersonalBest 
                                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold' 
                                      : 'bg-green-500 text-white'
                                  }`}
                                >
                                  <span>Set {index + 1}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono">{formatTime(time)}</span>
                                    {isPersonalBest && (
                                      <span className="text-xl" title="Personal Best!">🏆</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Personal Best Celebration */}
                      {newPersonalBest && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-lg animate-bounce">
                          <p className="text-center text-white font-bold text-lg flex items-center justify-center gap-2">
                            <span className="text-3xl">🎉</span>
                            New Personal Best!
                            <span className="text-3xl">🎉</span>
                          </p>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                        {timerState.isRunning ? 'Click to stop' : timerState.seconds > 0 ? 'Click Complete Set to record' : 'Click to start timer'}
                      </p>
                    </div>
                    
                    {/* Hidden input to store the duration */}
                    <input
                      type="hidden"
                      value={sessionForm.duration}
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <textarea
                    value={sessionForm.notes}
                    onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium"
                  >
                    Log Session
                  </button>
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* History Dialog */}
        {historyExercise && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto overflow-x-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{historyExercise.name} - History</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {historyExercise.type === 'REP_BASED' ? 'Rep Based' : 'Time Based'} Exercise
                  </p>
                </div>
                <button
                  onClick={() => {
                    setHistoryExercise(null);
                    setHistorySessions([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Mini Calendar */}
              {historySessions.length > 0 && (() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const daysInMonth = lastDay.getDate();
                const startingDayOfWeek = firstDay.getDay();
                
                // Get set of days when exercise was done (format: YYYY-MM-DD)
                const exerciseDays = new Set(
                  historySessions.map(session => session.completedAt.split(' ')[0])
                );
                
                const weeks = [];
                let week = new Array(7).fill(null);
                let dayCounter = 1;
                
                // Fill in the days
                for (let i = 0; i < 42; i++) {
                  const dayOfWeek = i % 7;
                  
                  if (i >= startingDayOfWeek && dayCounter <= daysInMonth) {
                    week[dayOfWeek] = dayCounter;
                    dayCounter++;
                  }
                  
                  if (dayOfWeek === 6) {
                    weeks.push(week);
                    week = new Array(7).fill(null);
                  }
                }
                
                return (
                  <div className="mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded max-w-xs mx-auto">
                    <div className="text-center font-semibold mb-2 text-sm">
                      {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="font-semibold text-gray-500 dark:text-gray-400 pb-1 text-center text-xs">
                          {day}
                        </div>
                      ))}
                      {weeks.map((week, weekIdx) => (
                        week.map((day, dayIdx) => {
                          if (day === null) {
                            return <div key={`${weekIdx}-${dayIdx}`} className="w-7 h-7" />;
                          }
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const hasExercise = exerciseDays.has(dateStr);
                          
                          return (
                            <div
                              key={`${weekIdx}-${dayIdx}`}
                              className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${
                                hasExercise
                                  ? 'bg-green-500 text-white font-semibold'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {day}
                            </div>
                          );
                        })
                      ))}
                    </div>
                  </div>
                );
              })()}

              {historySessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No sessions logged yet for this exercise.
                </div>
              ) : (
                <>
                  {/* Statistics Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</div>
                      <div className="text-2xl font-bold">{historySessions.length}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Avg Sets</div>
                      <div className="text-2xl font-bold">
                        {(historySessions.reduce((sum, s) => sum + s.sets, 0) / historySessions.length).toFixed(1)}
                      </div>
                    </div>
                    {historyExercise.type === 'REP_BASED' ? (
                      <>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Reps</div>
                          <div className="text-2xl font-bold">
                            {historySessions.some(s => s.reps) 
                              ? (historySessions.reduce((sum, s) => sum + (s.reps || 0), 0) / historySessions.filter(s => s.reps).length).toFixed(1)
                              : '-'}
                          </div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Total Reps</div>
                          <div className="text-2xl font-bold">
                            {historySessions.reduce((sum, s) => sum + (s.sets * (s.reps || 0)), 0)}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</div>
                          <div className="text-2xl font-bold">
                            {historySessions.some(s => s.duration) 
                              ? formatTime(Math.round(historySessions.reduce((sum, s) => sum + (s.duration || 0), 0) / historySessions.filter(s => s.duration).length))
                              : '-'}
                          </div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Total Time</div>
                          <div className="text-2xl font-bold">
                            {formatTime(historySessions.reduce((sum, s) => sum + (s.sets * (s.duration || 0)), 0))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 30-Day Graph */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">
                      Last 30 Days - {historyExercise.type === 'REP_BASED' ? 'Total Reps' : 'Total Time'}
                    </h3>
                    {(() => {
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      console.log('Today is:', todayStr);
                      
                      const days: Array<{ date: number; month: number; value: number; dateStr: string; displayDate: string; label?: string }> = [];
                      
                      // Create array of last 30 days (29 days ago through today)
                      for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
                        const date = new Date();
                        date.setDate(date.getDate() - daysAgo);
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        
                        if (daysAgo <= 2) {
                          console.log(`${daysAgo} days ago: ${dateStr} (${date.getMonth() + 1}/${date.getDate()})`);
                        }
                        
                        // Find sessions for this day
                        const daySessions = historySessions.filter(s => {
                          const sessionDate = s.completedAt.split(' ')[0];
                          return sessionDate === dateStr;
                        });
                        
                        let value = 0;
                        if (historyExercise.type === 'REP_BASED') {
                          // Sum all reps for the day
                          daySessions.forEach(session => {
                            const setsData = session.setsData ? JSON.parse(session.setsData) : [];
                            if (setsData.length > 0) {
                              value += setsData.reduce((a: number, b: number) => a + b, 0);
                            } else {
                              value += (session.reps || 0) * session.sets;
                            }
                          });
                        } else {
                          // Sum all time for the day
                          daySessions.forEach(session => {
                            const setsData = session.setsData ? JSON.parse(session.setsData) : [];
                            if (setsData.length > 0) {
                              value += setsData.reduce((a: number, b: number) => a + b, 0);
                            } else {
                              value += (session.duration || 0) * session.sets;
                            }
                          });
                        }
                        
                        days.push({
                          date: date.getDate(),
                          month: date.getMonth() + 1,
                          value,
                          dateStr,
                          displayDate: `${date.getMonth() + 1}/${date.getDate()}`
                        });
                      }
                      
                      console.log('Last 3 days:', days.slice(-3).map(d => d.displayDate));
                      console.log('Days with data:', days.filter(d => d.value > 0).length);
                      
                      const maxValue = Math.max(...days.map(d => d.value), 1);
                      console.log('Max value:', maxValue);
                      
                      // Calculate goal value for each day based on that day's sessions
                      // If no session that day, carry forward the previous day's goal
                      const dayGoals: number[] = [];
                      for (let idx = 0; idx < days.length; idx++) {
                        const day = days[idx];
                        const daySessions = historySessions.filter(s => {
                          const sessionDate = s.completedAt.split(' ')[0];
                          return sessionDate === day.dateStr;
                        });
                        
                        if (daySessions.length > 0 && daySessions[0].targetSets) {
                          // Use the session's saved targets
                          const session = daySessions[0];
                          const goalValue = historyExercise.type === 'REP_BASED'
                            ? (session.targetSets * (session.targetReps || 0))
                            : (session.targetSets * (session.targetDuration || 0));
                          dayGoals.push(goalValue);
                        } else if (idx > 0) {
                          // No session that day, use previous day's goal
                          dayGoals.push(dayGoals[idx - 1]);
                        } else {
                          // First day with no data, use current exercise targets
                          const goalValue = historyExercise.type === 'REP_BASED'
                            ? (historyExercise.targetSets * (historyExercise.targetReps || 0))
                            : (historyExercise.targetSets * (historyExercise.targetDuration || 0));
                          dayGoals.push(goalValue);
                        }
                      }
                      
                      // Calculate which days are "on track" - check all possible 7-day windows containing this day
                      const daysOnTrack = days.map((day, idx) => {
                        // Check all 7-day windows that include this day
                        // Window can start from idx-6 to idx, as long as it includes idx and has 7 days
                        for (let windowStart = Math.max(0, idx - 6); windowStart <= idx; windowStart++) {
                          const windowEnd = windowStart + 7;
                          if (windowEnd > days.length) continue; // Window goes beyond data
                          if (windowStart > idx || windowEnd <= idx) continue; // Day not in window
                          
                          const windowDays = days.slice(windowStart, windowEnd);
                          const daysWithActivity = windowDays.filter(d => d.value > 0).length;
                          
                          if (daysWithActivity >= historyExercise.targetDaysPerWeek) {
                            return true; // Found a valid window
                          }
                        }
                        return false;
                      });
                      
                      return (
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                          <div className="relative flex items-end justify-between h-40 gap-0.5">
                            {days.map((day, idx) => {
                              const heightPercent = maxValue > 0 ? (day.value / maxValue) * 100 : 0;
                              const minHeight = day.value > 0 ? Math.max(heightPercent, 5) : 0;
                              const isOnTrack = daysOnTrack[idx];
                              
                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                                  <div
                                    className={`w-full rounded-t ${
                                      day.value > 0 
                                        ? (isOnTrack ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600')
                                        : 'bg-gray-300 dark:bg-gray-600 opacity-30'
                                    }`}
                                    style={{ height: day.value > 0 ? `${minHeight}%` : '2px' }}
                                  >
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">
                                      {day.displayDate}: {day.value > 0 
                                        ? (historyExercise.type === 'REP_BASED' ? `${day.value} reps` : formatTime(day.value))
                                        : 'No activity'}
                                      {dayGoals[idx] > 0 && (
                                        <span className="block text-orange-300">
                                          Goal: {historyExercise.type === 'REP_BASED' ? `${dayGoals[idx]} reps` : formatTime(dayGoals[idx])}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* Continuous goal line overlay */}
                            <svg 
                              className="absolute inset-0 pointer-events-none"
                              style={{ width: '100%', height: '100%' }}
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                            >
                              <polyline
                                points={days.map((day, idx) => {
                                  const x = ((idx + 0.5) / days.length) * 100;
                                  const goalPercent = maxValue > 0 ? Math.min((dayGoals[idx] / maxValue) * 100, 100) : 0;
                                  const y = 100 - goalPercent;
                                  return `${x},${y}`;
                                }).join(' ')}
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="0.8"
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>30 days ago</span>
                            <span>Today</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Session List */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Recent Sessions</h3>
                    <div className="space-y-2">
                      {historySessions.map((session) => {
                        const setsData = session.setsData ? JSON.parse(session.setsData) : [];
                        return (
                          <div key={session.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {formatDisplayDateTime(session.completedAt)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {session.sets} sets
                                  {historyExercise.type === 'REP_BASED' ? (
                                    setsData.length > 0 ? (
                                      <span> × {setsData.join(', ')} reps</span>
                                    ) : (
                                      <span> × {session.reps} reps avg</span>
                                    )
                                  ) : (
                                    setsData.length > 0 ? (
                                      <span> × {setsData.map((s: number) => formatTime(s)).join(', ')}</span>
                                    ) : (
                                      <span> × {formatTime(session.duration)} avg</span>
                                    )
                                  )}
                                </div>
                                {session.notes && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                                    {session.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
