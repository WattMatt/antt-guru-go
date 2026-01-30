import { useMemo, useCallback, useRef } from 'react';
import { Task, TaskDependency, ViewMode, DependencyType } from '@/types/gantt';
import { format, differenceInDays, addDays, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isToday, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GettingStartedGuide } from './GettingStartedGuide';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { useDependencyDrag } from '@/hooks/useDependencyDrag';
import { GripVertical, Link2 } from 'lucide-react';
import { DependencyArrows } from './DependencyArrows';
import { DependencyDragLine } from './DependencyDragLine';

interface GanttChartProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  viewMode: ViewMode;
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onAddTask?: () => void;
  onTaskDateChange?: (taskId: string, startDate: Date, endDate: Date) => void;
  onCreateDependency?: (predecessorId: string, successorId: string, dependencyType: DependencyType) => void;
  onUpdateDependency?: (dependencyId: string, dependencyType: DependencyType) => void;
  onDeleteDependency?: (dependencyId: string) => void;
}

export function GanttChart({ tasks, dependencies, viewMode, onTaskClick, onToggleComplete, onAddTask, onTaskDateChange, onCreateDependency, onUpdateDependency, onDeleteDependency }: GanttChartProps) {
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const { startDate, endDate, timeUnits, unitWidth } = useMemo(() => {
    if (tasks.length === 0) {
      const today = startOfDay(new Date());
      return {
        startDate: today,
        endDate: addDays(today, 30),
        timeUnits: eachDayOfInterval({ start: today, end: addDays(today, 30) }),
        unitWidth: 40
      };
    }

    const allDates = tasks.flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
    const minDate = startOfDay(new Date(Math.min(...allDates.map(d => d.getTime()))));
    const maxDate = startOfDay(new Date(Math.max(...allDates.map(d => d.getTime()))));
    
    // Add padding
    const paddedStart = addDays(minDate, -7);
    const paddedEnd = addDays(maxDate, 14);

    let units: Date[];
    let width: number;

    switch (viewMode) {
      case 'day':
        units = eachDayOfInterval({ start: paddedStart, end: paddedEnd });
        width = 40;
        break;
      case 'week':
        units = eachWeekOfInterval({ start: paddedStart, end: paddedEnd });
        width = 100;
        break;
      case 'month':
        units = eachMonthOfInterval({ start: paddedStart, end: paddedEnd });
        width = 150;
        break;
      default:
        units = eachDayOfInterval({ start: paddedStart, end: paddedEnd });
        width = 40;
    }

    return {
      startDate: paddedStart,
      endDate: paddedEnd,
      timeUnits: units,
      unitWidth: width
    };
  }, [tasks, viewMode]);

  const handleTaskUpdate = useCallback((taskId: string, newStartDate: Date, newEndDate: Date) => {
    if (onTaskDateChange) {
      onTaskDateChange(taskId, newStartDate, newEndDate);
    }
  }, [onTaskDateChange]);

  const { isDragging, draggedTaskId, getPreviewPosition, handleDragStart } = useGanttDrag({
    viewMode,
    unitWidth,
    chartStartDate: startDate,
    onTaskUpdate: handleTaskUpdate
  });

  // Dependency drag hook
  const handleCreateDependency = useCallback((predecessorId: string, successorId: string, dependencyType: DependencyType) => {
    if (onCreateDependency) {
      onCreateDependency(predecessorId, successorId, dependencyType);
    }
  }, [onCreateDependency]);

  const {
    containerRef: depContainerRef,
    isDragging: isLinkDragging,
    sourceTaskId: linkSourceTaskId,
    targetTaskId: linkTargetTaskId,
    sourcePoint: linkSourcePoint,
    currentPoint: linkCurrentPoint,
    handleDragStart: handleLinkDragStart,
    setTargetTask
  } = useDependencyDrag({
    tasks,
    onCreateDependency: handleCreateDependency
  });

  const getTaskPosition = useCallback((task: Task) => {
    const taskStart = startOfDay(new Date(task.start_date));
    const taskEnd = startOfDay(new Date(task.end_date));
    
    const daysFromStart = differenceInDays(taskStart, startDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    
    let left: number;
    let width: number;

    switch (viewMode) {
      case 'day':
        left = daysFromStart * unitWidth;
        width = duration * unitWidth;
        break;
      case 'week':
        left = (daysFromStart / 7) * unitWidth;
        width = (duration / 7) * unitWidth;
        break;
      case 'month':
        left = (daysFromStart / 30) * unitWidth;
        width = (duration / 30) * unitWidth;
        break;
      default:
        left = daysFromStart * unitWidth;
        width = duration * unitWidth;
    }

    return { left: Math.max(0, left), width: Math.max(unitWidth / 2, width) };
  }, [startDate, viewMode, unitWidth]);

  const getTodayPosition = () => {
    const today = startOfDay(new Date());
    const daysFromStart = differenceInDays(today, startDate);
    
    switch (viewMode) {
      case 'day':
        return daysFromStart * unitWidth;
      case 'week':
        return (daysFromStart / 7) * unitWidth;
      case 'month':
        return (daysFromStart / 30) * unitWidth;
      default:
        return daysFromStart * unitWidth;
    }
  };

  const getStatusColor = (task: Task) => {
    const today = startOfDay(new Date());
    const taskEndDate = startOfDay(new Date(task.end_date));
    const isOverdue = isBefore(taskEndDate, today) && task.status !== 'completed';

    if (isOverdue) return 'bg-destructive';
    
    switch (task.status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'not_started':
      default:
        return 'bg-muted-foreground/40';
    }
  };

  const formatTimeUnit = (date: Date) => {
    switch (viewMode) {
      case 'day':
        return format(date, 'd');
      case 'week':
        return format(date, 'MMM d');
      case 'month':
        return format(date, 'MMM yyyy');
      default:
        return format(date, 'd');
    }
  };

  const formatHeaderUnit = (date: Date) => {
    switch (viewMode) {
      case 'day':
        return format(date, 'EEE');
      case 'week':
        return 'Week';
      case 'month':
        return '';
      default:
        return format(date, 'EEE');
    }
  };

  const chartWidth = timeUnits.length * unitWidth;
  const todayPosition = getTodayPosition();

  // Show getting started guide for empty projects
  if (tasks.length === 0 && onAddTask) {
    return (
      <div className="border rounded-lg overflow-hidden bg-card">
        <GettingStartedGuide onAddTask={onAddTask} />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex border rounded-lg overflow-hidden bg-card", (isDragging || isLinkDragging) && "select-none")}>
        {/* Task list sidebar */}
        <div className="w-64 flex-shrink-0 border-r bg-muted/30">
          <div className="h-14 border-b flex items-center px-4 font-semibold bg-muted/50">
            Task Name
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="h-12 border-b flex items-center gap-2 px-4 hover:bg-muted/50 cursor-pointer"
              onClick={() => onTaskClick(task)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => onToggleComplete(task)}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to mark task as {task.status === 'completed' ? 'incomplete' : 'complete'}</p>
                </TooltipContent>
              </Tooltip>
              <span className={cn(
                "text-sm truncate",
                task.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {task.name}
              </span>
            </div>
          ))}
        </div>

        {/* Gantt chart area */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: chartWidth, minWidth: '100%' }}>
            {/* Timeline header */}
            <div className="h-14 border-b flex bg-muted/50">
              {timeUnits.map((unit, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex-shrink-0 border-r flex flex-col items-center justify-center text-xs",
                    isToday(unit) && "bg-primary/10"
                  )}
                  style={{ width: unitWidth }}
                >
                  <span className="text-muted-foreground">{formatHeaderUnit(unit)}</span>
                  <span className="font-medium">{formatTimeUnit(unit)}</span>
                </div>
              ))}
            </div>

            {/* Task bars */}
            <div 
              className="relative"
              ref={(el) => {
                depContainerRef.current = el;
                chartAreaRef.current = el;
              }}
            >
              {/* Dependency drag line */}
              {isLinkDragging && linkSourcePoint && linkCurrentPoint && (
                <DependencyDragLine
                  sourcePoint={linkSourcePoint}
                  currentPoint={linkCurrentPoint}
                  isValidTarget={!!linkTargetTaskId}
                />
              )}

              {/* Dependency arrows */}
              <DependencyArrows
                tasks={tasks}
                dependencies={dependencies}
                viewMode={viewMode}
                unitWidth={unitWidth}
                chartStartDate={startDate}
                rowHeight={48}
                onUpdateDependency={onUpdateDependency}
                onDeleteDependency={onDeleteDependency}
              />

              {/* Today line */}
              {todayPosition >= 0 && todayPosition <= chartWidth && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
                  style={{ left: todayPosition }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-xs bg-destructive text-destructive-foreground px-1 rounded">
                    Today
                  </div>
                </div>
              )}

              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {timeUnits.map((unit, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex-shrink-0 border-r border-dashed border-border/50",
                      isToday(unit) && "bg-primary/5"
                    )}
                    style={{ width: unitWidth }}
                  />
                ))}
              </div>

              {/* Task rows */}
              {tasks.map((task, taskIndex) => {
                const previewPosition = getPreviewPosition(task);
                const position = previewPosition || getTaskPosition(task);
                const isBeingDragged = draggedTaskId === task.id;
                const isLinkSource = linkSourceTaskId === task.id;
                const isLinkTarget = linkTargetTaskId === task.id;
                const isValidDropTarget = isLinkDragging && !isLinkSource && linkSourceTaskId !== task.id;

                return (
                  <div 
                    key={task.id} 
                    className="h-12 relative border-b"
                    onMouseEnter={() => {
                      if (isLinkDragging && !isLinkSource) {
                        setTargetTask(task.id);
                      }
                    }}
                    onMouseLeave={() => {
                      if (isLinkDragging) {
                        setTargetTask(null);
                      }
                    }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute top-2 h-8 rounded cursor-pointer transition-shadow flex items-center group",
                            getStatusColor(task),
                            isBeingDragged ? "shadow-lg ring-2 ring-primary/50 z-20" : "hover:shadow-md",
                            (isDragging || isLinkDragging) && !isBeingDragged && !isLinkSource && !isLinkTarget && "opacity-50",
                            isLinkTarget && "ring-2 ring-primary shadow-lg z-20"
                          )}
                          style={{
                            left: position.left,
                            width: position.width,
                            transition: isBeingDragged ? 'none' : 'box-shadow 0.2s'
                          }}
                          onClick={(e) => {
                            if (!isDragging && !isLinkDragging) {
                              onTaskClick(task);
                            }
                          }}
                        >
                          {/* Left resize handle */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/20 rounded-l flex items-center justify-center"
                            onMouseDown={(e) => handleDragStart(e, task, 'resize-start')}
                          >
                            <div className="w-0.5 h-4 bg-primary-foreground/50 rounded" />
                          </div>

                          {/* Move handle (center) */}
                          <div
                            className="flex-1 h-full flex items-center justify-center cursor-grab active:cursor-grabbing px-2"
                            onMouseDown={(e) => handleDragStart(e, task, 'move')}
                          >
                            {/* Progress bar inside */}
                            {task.progress > 0 && task.progress < 100 && (
                              <div
                                className="absolute inset-0 bg-foreground/20 rounded-l pointer-events-none"
                                style={{ width: `${task.progress}%` }}
                              />
                            )}
                            <span className="text-xs text-primary-foreground font-medium truncate relative z-10 pointer-events-none">
                              {position.width > 60 ? task.name : ''}
                            </span>
                            {position.width > 40 && (
                              <GripVertical className="h-3 w-3 text-primary-foreground/50 ml-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            )}
                          </div>

                          {/* Right resize handle */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/20 rounded-r flex items-center justify-center"
                            onMouseDown={(e) => handleDragStart(e, task, 'resize-end')}
                          >
                            <div className="w-0.5 h-4 bg-primary-foreground/50 rounded" />
                          </div>

                          {/* Connection handle for creating dependencies */}
                          {onCreateDependency && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity z-30 hover:scale-110",
                                    isLinkSource && "opacity-100 scale-110"
                                  )}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (chartAreaRef.current) {
                                      const rect = chartAreaRef.current.getBoundingClientRect();
                                      const startPoint = {
                                        x: position.left + position.width,
                                        y: taskIndex * 48 + 8 + 16 // row height * index + padding + half height
                                      };
                                      handleLinkDragStart(e, task.id, startPoint);
                                    }
                                  }}
                                >
                                  <Link2 className="h-3 w-3 text-primary-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="text-xs">Drag to link tasks</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p className="font-medium">{task.name}</p>
                          <p>{format(new Date(task.start_date), 'MMM d')} - {format(new Date(task.end_date), 'MMM d')}</p>
                          <p>Progress: {task.progress}%</p>
                          <p className="text-muted-foreground">Drag to move • Drag edges to resize • Use link icon to create dependencies</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
