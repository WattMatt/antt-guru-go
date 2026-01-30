import { useState, useCallback, useRef, useEffect } from 'react';
import { Task, ViewMode } from '@/types/gantt';
import { addDays, differenceInDays, startOfDay } from 'date-fns';

export type DragMode = 'move' | 'resize-start' | 'resize-end' | null;

interface DragState {
  task: Task | null;
  mode: DragMode;
  startX: number;
  originalStartDate: Date;
  originalEndDate: Date;
}

interface UseGanttDragOptions {
  viewMode: ViewMode;
  unitWidth: number;
  chartStartDate: Date;
  onTaskUpdate: (taskId: string, startDate: Date, endDate: Date) => void;
}

export function useGanttDrag({ viewMode, unitWidth, chartStartDate, onTaskUpdate }: UseGanttDragOptions) {
  const [dragState, setDragState] = useState<DragState>({
    task: null,
    mode: null,
    startX: 0,
    originalStartDate: new Date(),
    originalEndDate: new Date()
  });

  const [previewDates, setPreviewDates] = useState<{ startDate: Date; endDate: Date } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getDaysPerUnit = useCallback(() => {
    switch (viewMode) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      default: return 1;
    }
  }, [viewMode]);

  const pixelsToDays = useCallback((pixels: number) => {
    const daysPerUnit = getDaysPerUnit();
    return Math.round((pixels / unitWidth) * daysPerUnit);
  }, [unitWidth, getDaysPerUnit]);

  const handleDragStart = useCallback((
    e: React.MouseEvent,
    task: Task,
    mode: DragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState({
      task,
      mode,
      startX: e.clientX,
      originalStartDate: startOfDay(new Date(task.start_date)),
      originalEndDate: startOfDay(new Date(task.end_date))
    });
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState.task || !dragState.mode) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaDays = pixelsToDays(deltaX);

    let newStartDate = dragState.originalStartDate;
    let newEndDate = dragState.originalEndDate;

    switch (dragState.mode) {
      case 'move':
        newStartDate = addDays(dragState.originalStartDate, deltaDays);
        newEndDate = addDays(dragState.originalEndDate, deltaDays);
        break;
      case 'resize-start':
        newStartDate = addDays(dragState.originalStartDate, deltaDays);
        // Ensure start doesn't go past end
        if (newStartDate >= newEndDate) {
          newStartDate = addDays(newEndDate, -1);
        }
        break;
      case 'resize-end':
        newEndDate = addDays(dragState.originalEndDate, deltaDays);
        // Ensure end doesn't go before start
        if (newEndDate <= newStartDate) {
          newEndDate = addDays(newStartDate, 1);
        }
        break;
    }

    setPreviewDates({ startDate: newStartDate, endDate: newEndDate });
  }, [dragState, pixelsToDays]);

  const handleDragEnd = useCallback(() => {
    if (dragState.task && previewDates) {
      onTaskUpdate(dragState.task.id, previewDates.startDate, previewDates.endDate);
    }

    setDragState({
      task: null,
      mode: null,
      startX: 0,
      originalStartDate: new Date(),
      originalEndDate: new Date()
    });
    setPreviewDates(null);
  }, [dragState.task, previewDates, onTaskUpdate]);

  useEffect(() => {
    if (dragState.mode) {
      const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
      const handleMouseUp = () => handleDragEnd();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.mode, handleDragMove, handleDragEnd]);

  const getPreviewPosition = useCallback((task: Task) => {
    if (!previewDates || dragState.task?.id !== task.id) return null;

    const taskStart = startOfDay(previewDates.startDate);
    const taskEnd = startOfDay(previewDates.endDate);
    
    const daysFromStart = differenceInDays(taskStart, chartStartDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    
    const daysPerUnit = getDaysPerUnit();
    const left = (daysFromStart / daysPerUnit) * unitWidth;
    const width = (duration / daysPerUnit) * unitWidth;

    return { left: Math.max(0, left), width: Math.max(unitWidth / 2, width) };
  }, [previewDates, dragState.task?.id, chartStartDate, unitWidth, getDaysPerUnit]);

  return {
    isDragging: !!dragState.mode,
    draggedTaskId: dragState.task?.id ?? null,
    previewDates,
    containerRef,
    handleDragStart,
    getPreviewPosition
  };
}
