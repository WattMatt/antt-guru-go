import { useState, useCallback } from 'react';
import { Task } from '@/types/gantt';

interface UseTaskReorderProps {
  tasks: Task[];
  onReorder: (taskId: string, newIndex: number) => void;
}

export function useTaskReorder({ tasks, onReorder }: UseTaskReorderProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDropTargetIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (taskId && draggedTaskId) {
      const currentIndex = tasks.findIndex(t => t.id === taskId);
      if (currentIndex !== targetIndex && currentIndex !== -1) {
        onReorder(taskId, targetIndex);
      }
    }
    
    setDraggedTaskId(null);
    setDropTargetIndex(null);
  }, [draggedTaskId, tasks, onReorder]);

  return {
    draggedTaskId,
    dropTargetIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}
