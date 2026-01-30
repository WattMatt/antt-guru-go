import { useState, useCallback, useEffect } from 'react';
import { Task, TaskDependency } from '@/types/gantt';

export type ActionType = 
  | 'task_create' 
  | 'task_update' 
  | 'task_delete' 
  | 'task_toggle_status'
  | 'dependency_create' 
  | 'dependency_delete';

export interface UndoableAction {
  id: string;
  type: ActionType;
  timestamp: number;
  // For task actions
  taskId?: string;
  previousTask?: Partial<Task>;
  newTask?: Partial<Task>;
  // For dependency actions
  dependencyId?: string;
  dependency?: Partial<TaskDependency>;
}

interface UseUndoRedoProps {
  maxHistory?: number;
}

export function useUndoRedo({ maxHistory = 50 }: UseUndoRedoProps = {}) {
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const pushAction = useCallback((action: Omit<UndoableAction, 'id' | 'timestamp'>) => {
    const newAction: UndoableAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    setUndoStack(prev => {
      const newStack = [...prev, newAction];
      // Limit history size
      if (newStack.length > maxHistory) {
        return newStack.slice(-maxHistory);
      }
      return newStack;
    });

    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, [maxHistory]);

  const popUndo = useCallback((): UndoableAction | null => {
    if (undoStack.length === 0) return null;

    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);

    return action;
  }, [undoStack]);

  const popRedo = useCallback((): UndoableAction | null => {
    if (redoStack.length === 0) return null;

    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);

    return action;
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Get description for display
  const getActionDescription = useCallback((action: UndoableAction): string => {
    switch (action.type) {
      case 'task_create':
        return `Create task "${action.newTask?.name || 'Untitled'}"`;
      case 'task_update':
        return `Update task "${action.newTask?.name || action.previousTask?.name || 'Untitled'}"`;
      case 'task_delete':
        return `Delete task "${action.previousTask?.name || 'Untitled'}"`;
      case 'task_toggle_status':
        return `Toggle task "${action.previousTask?.name || 'Untitled'}"`;
      case 'dependency_create':
        return 'Create dependency';
      case 'dependency_delete':
        return 'Delete dependency';
      default:
        return 'Unknown action';
    }
  }, []);

  const lastUndoDescription = undoStack.length > 0 
    ? getActionDescription(undoStack[undoStack.length - 1]) 
    : null;

  const lastRedoDescription = redoStack.length > 0 
    ? getActionDescription(redoStack[redoStack.length - 1]) 
    : null;

  return {
    canUndo,
    canRedo,
    undoStack,
    redoStack,
    pushAction,
    popUndo,
    popRedo,
    clearHistory,
    lastUndoDescription,
    lastRedoDescription
  };
}
