import { useMemo, useState, useEffect } from 'react';
import { Task } from '@/types/gantt';

export interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  action?: () => void;
}

interface UseOnboardingProgressOptions {
  tasks: Task[];
  projectId: string;
  onAddTask?: () => void;
  onExport?: () => void;
}

const DISMISSED_KEY_PREFIX = 'gantt_onboarding_dismissed_';

export function useOnboardingProgress({ 
  tasks, 
  projectId, 
  onAddTask,
  onExport 
}: UseOnboardingProgressOptions) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`${DISMISSED_KEY_PREFIX}${projectId}`) === 'true';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${DISMISSED_KEY_PREFIX}${projectId}`);
      setIsDismissed(stored === 'true');
    }
  }, [projectId]);

  const steps = useMemo((): OnboardingStep[] => {
    const hasTask = tasks.length > 0;
    const hasOwner = tasks.some(t => t.owner && t.owner.trim() !== '');
    const hasProgress = tasks.some(t => t.progress > 0 && t.progress < 100);
    const hasCompleted = tasks.some(t => t.status === 'completed');
    const hasMultipleTasks = tasks.length >= 3;
    const hasInProgress = tasks.some(t => t.status === 'in_progress');

    return [
      {
        id: 'create_task',
        label: 'Create your first task',
        completed: hasTask,
        action: onAddTask
      },
      {
        id: 'set_dates',
        label: 'Set task dates (start and end)',
        completed: hasTask, // Dates are required on task creation
      },
      {
        id: 'assign_owner',
        label: 'Assign an owner to a task',
        completed: hasOwner,
        action: onAddTask
      },
      {
        id: 'update_progress',
        label: 'Update task progress',
        completed: hasProgress || hasCompleted,
        action: onAddTask
      },
      {
        id: 'mark_complete',
        label: 'Mark a task as complete',
        completed: hasCompleted,
      },
      {
        id: 'multiple_tasks',
        label: 'Create multiple tasks (3+)',
        completed: hasMultipleTasks,
        action: onAddTask
      },
      {
        id: 'dependencies',
        label: 'Link tasks with dependencies',
        completed: false, // Future feature
      },
      {
        id: 'export',
        label: 'Export your chart',
        completed: false, // We can't track this easily, so it stays false
        action: onExport
      }
    ];
  }, [tasks, onAddTask, onExport]);

  const completedCount = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = Math.round((completedCount / totalSteps) * 100);
  const isComplete = completedCount === totalSteps;

  // Show onboarding for new/small projects (0-2 tasks) unless dismissed
  const shouldShow = !isDismissed && tasks.length <= 2;

  const dismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${DISMISSED_KEY_PREFIX}${projectId}`, 'true');
    }
  };

  const reset = () => {
    setIsDismissed(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${DISMISSED_KEY_PREFIX}${projectId}`);
    }
  };

  return {
    steps,
    completedCount,
    totalSteps,
    progressPercentage,
    isComplete,
    shouldShow,
    isDismissed,
    dismiss,
    reset
  };
}
