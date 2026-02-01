import { useState, useCallback } from 'react';
import { Task } from '@/types/gantt';

interface UseTaskReorderProps {
  tasks: Task[];
  onReorder: (taskId: string, newIndex: number) => void;
}

export function useTaskReorder({ tasks, onReorder }: UseTaskReorderProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    
    // Set a custom drag image (optional - improves visual)
    const dragElement = e.currentTarget as HTMLElement;
    if (dragElement) {
      e.dataTransfer.setDragImage(dragElement, 20, 20);
    }
    
    setDraggedTaskId(taskId);
    // Small delay to allow the drag image to be captured before applying styles
    requestAnimationFrame(() => {
      setIsDragging(true);
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDropTargetIndex(null);
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number, taskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Don't show drop target on the dragged item itself
    if (taskId !== draggedTaskId) {
      setDropTargetIndex(index);
    }
  }, [draggedTaskId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're leaving to a non-child element
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    
    if (!currentTarget.contains(relatedTarget)) {
      setDropTargetIndex(null);
    }
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
    setIsDragging(false);
  }, [draggedTaskId, tasks, onReorder]);

  // Calculate if drop would be above or below the current position
  const getDropPosition = useCallback((index: number): 'above' | 'below' | null => {
    if (dropTargetIndex === null || draggedTaskId === null) return null;
    
    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
    if (draggedIndex === -1 || index !== dropTargetIndex) return null;
    
    return index < draggedIndex ? 'above' : 'below';
  }, [dropTargetIndex, draggedTaskId, tasks]);

  return {
    draggedTaskId,
    dropTargetIndex,
    isDragging,
    getDropPosition,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}
