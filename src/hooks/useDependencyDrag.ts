import { useState, useCallback, useEffect, useRef } from 'react';
import { Task, DependencyType } from '@/types/gantt';

interface UseDependencyDragProps {
  tasks: Task[];
  onCreateDependency: (predecessorId: string, successorId: string, dependencyType: DependencyType) => void;
}

interface DragState {
  isDragging: boolean;
  sourceTaskId: string | null;
  sourcePoint: { x: number; y: number } | null;
  currentPoint: { x: number; y: number } | null;
  targetTaskId: string | null;
}

export function useDependencyDrag({ tasks, onCreateDependency }: UseDependencyDragProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sourceTaskId: null,
    sourcePoint: null,
    currentPoint: null,
    targetTaskId: null
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback((
    e: React.MouseEvent,
    taskId: string,
    startPoint: { x: number; y: number }
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setDragState({
      isDragging: true,
      sourceTaskId: taskId,
      sourcePoint: startPoint,
      currentPoint: startPoint,
      targetTaskId: null
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragState(prev => ({
      ...prev,
      currentPoint: { x, y }
    }));
  }, [dragState.isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging) return;

    if (dragState.sourceTaskId && dragState.targetTaskId && dragState.sourceTaskId !== dragState.targetTaskId) {
      onCreateDependency(dragState.sourceTaskId, dragState.targetTaskId, 'finish_to_start');
    }

    setDragState({
      isDragging: false,
      sourceTaskId: null,
      sourcePoint: null,
      currentPoint: null,
      targetTaskId: null
    });
  }, [dragState, onCreateDependency]);

  const setTargetTask = useCallback((taskId: string | null) => {
    if (!dragState.isDragging) return;
    if (taskId === dragState.sourceTaskId) return;
    
    setDragState(prev => ({
      ...prev,
      targetTaskId: taskId
    }));
  }, [dragState.isDragging, dragState.sourceTaskId]);

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  return {
    containerRef,
    isDragging: dragState.isDragging,
    sourceTaskId: dragState.sourceTaskId,
    targetTaskId: dragState.targetTaskId,
    sourcePoint: dragState.sourcePoint,
    currentPoint: dragState.currentPoint,
    handleDragStart,
    setTargetTask
  };
}
