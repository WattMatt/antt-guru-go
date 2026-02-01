import { useMemo, useCallback, useRef } from 'react';
import { Task, TaskDependency, ViewMode, DependencyType, GroupByMode, Milestone, BaselineTask } from '@/types/gantt';
import { getTaskColorPreset } from '@/lib/taskColors';
import { format, differenceInDays, addDays, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isToday, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GettingStartedGuide } from './GettingStartedGuide';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { useDependencyDrag } from '@/hooks/useDependencyDrag';
import { useTaskReorder } from '@/hooks/useTaskReorder';
import { GripVertical, Link2, Lightbulb, User, CheckCircle2, Circle, Clock, Diamond } from 'lucide-react';
import { DependencyArrows } from './DependencyArrows';
import { DependencyDragLine } from './DependencyDragLine';
import { MilestoneMarker } from './MilestoneMarker';

interface GanttChartProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  milestones?: Milestone[];
  viewMode: ViewMode;
  groupBy?: GroupByMode;
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onAddTask?: () => void;
  onTaskDateChange?: (taskId: string, startDate: Date, endDate: Date) => void;
  onCreateDependency?: (predecessorId: string, successorId: string, dependencyType: DependencyType) => void;
  onUpdateDependency?: (dependencyId: string, dependencyType: DependencyType) => void;
  onDeleteDependency?: (dependencyId: string) => void;
  onMilestoneClick?: (milestone: Milestone) => void;
  selectedTaskIds?: Set<string>;
  onTaskSelect?: (taskId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onReorderTask?: (taskId: string, newIndex: number) => void;
  searchQuery?: string;
  criticalPathTaskIds?: Set<string>;
  baselineTasks?: BaselineTask[];
}

interface TaskGroup {
  key: string;
  label: string;
  icon?: React.ReactNode;
  tasks: Task[];
}

// Highlight matching text in a string
function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) {
    return <>{text}</>;
  }
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-accent text-accent-foreground px-0.5 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function GanttChart({ 
  tasks, 
  dependencies, 
  milestones = [],
  viewMode, 
  groupBy = 'none',
  onTaskClick, 
  onToggleComplete, 
  onAddTask, 
  onTaskDateChange, 
  onCreateDependency, 
  onUpdateDependency, 
  onDeleteDependency,
  onMilestoneClick,
  selectedTaskIds = new Set(),
  onTaskSelect,
  onSelectAll,
  onReorderTask,
  searchQuery,
  criticalPathTaskIds = new Set(),
  baselineTasks = []
}: GanttChartProps) {
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

  // Task reorder drag hook
  const handleReorder = useCallback((taskId: string, newIndex: number) => {
    if (onReorderTask) {
      onReorderTask(taskId, newIndex);
    }
  }, [onReorderTask]);

  const {
    draggedTaskId: reorderDraggedTaskId,
    dropTargetIndex,
    isDragging: isReorderDragging,
    getDropPosition,
    handleDragStart: handleReorderDragStart,
    handleDragEnd: handleReorderDragEnd,
    handleDragOver: handleReorderDragOver,
    handleDragLeave: handleReorderDragLeave,
    handleDrop: handleReorderDrop
  } = useTaskReorder({
    tasks,
    onReorder: handleReorder
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

  const getMilestonePosition = useCallback((milestoneDate: string) => {
    const date = startOfDay(new Date(milestoneDate));
    const daysFromStart = differenceInDays(date, startDate);
    
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
  }, [startDate, viewMode, unitWidth]);

  const getStatusColor = (task: Task) => {
    // If task has a custom color, use it
    const customColor = getTaskColorPreset(task.color);
    if (customColor) {
      return customColor.bgClass;
    }

    // Otherwise fall back to status-based coloring
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

  // Group tasks based on groupBy mode
  const taskGroups = useMemo((): TaskGroup[] => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', tasks, icon: null }];
    }

    if (groupBy === 'owner') {
      const grouped = new Map<string, Task[]>();
      tasks.forEach(task => {
        const owner = task.owner || 'Unassigned';
        if (!grouped.has(owner)) {
          grouped.set(owner, []);
        }
        grouped.get(owner)!.push(task);
      });
      
      return Array.from(grouped.entries())
        .sort(([a], [b]) => {
          if (a === 'Unassigned') return 1;
          if (b === 'Unassigned') return -1;
          return a.localeCompare(b);
        })
        .map(([owner, groupTasks]) => ({
          key: owner,
          label: owner,
          icon: <User className="h-3.5 w-3.5" />,
          tasks: groupTasks
        }));
    }

    if (groupBy === 'status') {
      const statusOrder = ['in_progress', 'not_started', 'completed'];
      const statusLabels: Record<string, string> = {
        not_started: 'Not Started',
        in_progress: 'In Progress',
        completed: 'Completed'
      };
      const statusIcons: Record<string, React.ReactNode> = {
        not_started: <Circle className="h-3.5 w-3.5" />,
        in_progress: <Clock className="h-3.5 w-3.5" />,
        completed: <CheckCircle2 className="h-3.5 w-3.5" />
      };

      const grouped = new Map<string, Task[]>();
      statusOrder.forEach(status => grouped.set(status, []));
      
      tasks.forEach(task => {
        grouped.get(task.status)!.push(task);
      });

      return statusOrder
        .filter(status => grouped.get(status)!.length > 0)
        .map(status => ({
          key: status,
          label: statusLabels[status],
          icon: statusIcons[status],
          tasks: grouped.get(status)!
        }));
    }

    return [{ key: 'all', label: '', tasks, icon: null }];
  }, [tasks, groupBy]);

  // Flatten tasks for index calculation in dependency arrows
  const flattenedTasks = useMemo(() => {
    return taskGroups.flatMap(group => group.tasks);
  }, [taskGroups]);

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
        <div className="w-72 flex-shrink-0 border-r bg-muted/30">
          <div className="h-14 border-b flex items-center gap-2 px-4 font-semibold bg-muted/50">
            {onTaskSelect && onSelectAll && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Checkbox
                      checked={tasks.length > 0 && selectedTaskIds.size === tasks.length}
                      ref={(el) => {
                        if (el) {
                          const isIndeterminate = selectedTaskIds.size > 0 && selectedTaskIds.size < tasks.length;
                          (el as HTMLButtonElement).dataset.state = isIndeterminate ? 'indeterminate' : 
                            (selectedTaskIds.size === tasks.length && tasks.length > 0) ? 'checked' : 'unchecked';
                        }
                      }}
                      onCheckedChange={(checked) => onSelectAll(!!checked)}
                      className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{selectedTaskIds.size === tasks.length && tasks.length > 0 ? 'Deselect all' : `Select all ${tasks.length} visible tasks`}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <span>Task Name</span>
            {tasks.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                {selectedTaskIds.size > 0 ? `${selectedTaskIds.size}/${tasks.length}` : `${tasks.length}`}
              </span>
            )}
          </div>
          {taskGroups.map((group) => (
            <div key={group.key}>
              {/* Group header - only show when grouping is active */}
              {groupBy !== 'none' && (
                <div className="h-8 border-b flex items-center gap-2 px-4 bg-muted/70 sticky top-0">
                  {group.icon}
                  <span className="text-xs font-medium">{group.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              )}
              {/* Tasks in group */}
              {group.tasks.map((task, index) => {
                const globalIndex = flattenedTasks.findIndex(t => t.id === task.id);
                const isSelected = selectedTaskIds.has(task.id);
                const isBeingReordered = reorderDraggedTaskId === task.id;
                const isDropTarget = dropTargetIndex === globalIndex && !isBeingReordered;
                const dropPosition = getDropPosition(globalIndex);
                
                return (
                  <div
                    key={task.id}
                    draggable={!!onReorderTask && groupBy === 'none'}
                    onDragStart={(e) => groupBy === 'none' && handleReorderDragStart(e, task.id)}
                    onDragEnd={handleReorderDragEnd}
                    onDragOver={(e) => groupBy === 'none' && handleReorderDragOver(e, globalIndex, task.id)}
                    onDragLeave={handleReorderDragLeave}
                    onDrop={(e) => groupBy === 'none' && handleReorderDrop(e, globalIndex)}
                    className={cn(
                      "h-12 border-b flex items-center gap-2 px-2 cursor-pointer group/row transition-all relative",
                      // Normal hover state (only when not dragging)
                      !isReorderDragging && "hover:bg-muted/50",
                      // Selection state
                      isSelected && !isBeingReordered && "bg-primary/10",
                      // Being dragged state
                      isBeingReordered && "opacity-40 bg-muted scale-[0.98] shadow-inner",
                      // Other items during drag (slightly dimmed)
                      isReorderDragging && !isBeingReordered && !isDropTarget && "opacity-70",
                      // Drop target highlighting
                      isDropTarget && "bg-primary/20 shadow-sm"
                    )}
                    onClick={() => onTaskClick(task)}
                  >
                    {/* Drop indicator line - shows where task will be inserted */}
                    {isDropTarget && dropPosition === 'above' && (
                      <div className="absolute -top-0.5 left-0 right-0 h-1 bg-primary rounded-full shadow-lg z-10" />
                    )}
                    {isDropTarget && dropPosition === 'below' && (
                      <div className="absolute -bottom-0.5 left-0 right-0 h-1 bg-primary rounded-full shadow-lg z-10" />
                    )}
                    
                    {/* Drag handle - only show when not grouping */}
                    {onReorderTask && groupBy === 'none' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "cursor-grab active:cursor-grabbing transition-all",
                              isBeingReordered 
                                ? "opacity-100 text-primary" 
                                : "opacity-40 group-hover/row:opacity-100 text-muted-foreground"
                            )}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Drag to reorder</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {onTaskSelect && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => onTaskSelect(task.id, !!checked)}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isSelected ? 'Deselect task' : 'Select task'}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
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
                    {/* Color indicator dot */}
                    <div 
                      className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0",
                        getStatusColor(task)
                      )}
                    />
                    <span className={cn(
                      "text-sm truncate flex-1",
                      task.status === 'completed' && "line-through text-muted-foreground"
                    )}>
                      <HighlightedText text={task.name} query={searchQuery} />
                    </span>
                  </div>
                );
              })}
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

              {/* Milestone markers */}
              {milestones.map((milestone) => {
                const position = getMilestonePosition(milestone.date);
                if (position < 0 || position > chartWidth) return null;
                return (
                  <MilestoneMarker
                    key={milestone.id}
                    milestone={milestone}
                    left={position}
                    onClick={(m) => onMilestoneClick?.(m)}
                  />
                );
              })}

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

              {/* Task rows with group headers */}
              {taskGroups.map((group) => (
                <div key={group.key}>
                  {/* Group header spacer - matches sidebar */}
                  {groupBy !== 'none' && (
                    <div className="h-8 border-b bg-muted/30" />
                  )}
                  {/* Task bars in group */}
                  {group.tasks.map((task) => {
                    const globalIndex = flattenedTasks.findIndex(t => t.id === task.id);
                    const previewPosition = getPreviewPosition(task);
                    const position = previewPosition || getTaskPosition(task);
                    const isBeingDragged = draggedTaskId === task.id;
                    const isLinkSource = linkSourceTaskId === task.id;
                    const isLinkTarget = linkTargetTaskId === task.id;
                    const isValidDropTarget = isLinkDragging && !isLinkSource && linkSourceTaskId !== task.id;
                    const isOnCriticalPath = criticalPathTaskIds.has(task.id);

                    // Find baseline for this task
                    const baselineTask = baselineTasks.find(bt => bt.task_id === task.id);
                    const getBaselinePosition = () => {
                      if (!baselineTask) return null;
                      const taskStart = startOfDay(new Date(baselineTask.start_date));
                      const taskEnd = startOfDay(new Date(baselineTask.end_date));
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
                    };
                    const baselinePosition = getBaselinePosition();

                    // Calculate row position for dependency link handle
                    let rowOffset = 0;
                    for (const g of taskGroups) {
                      if (g.key === group.key) break;
                      rowOffset += g.tasks.length;
                      if (groupBy !== 'none') rowOffset++; // Account for group header
                    }
                    const taskRowIndex = rowOffset + group.tasks.findIndex(t => t.id === task.id);
                    if (groupBy !== 'none') rowOffset++; // Account for current group header

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
                        {/* Baseline bar (shows original planned dates) */}
                        {baselinePosition && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute top-3 h-2 rounded-sm bg-muted-foreground/30 border border-dashed border-muted-foreground/50 z-0"
                                style={{
                                  left: baselinePosition.left,
                                  width: baselinePosition.width
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <p className="font-medium">Baseline: {baselineTask?.name}</p>
                                <p>{format(new Date(baselineTask!.start_date), 'MMM d')} - {format(new Date(baselineTask!.end_date), 'MMM d')}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-2 h-8 rounded cursor-pointer transition-shadow flex items-center group",
                                getStatusColor(task),
                                isBeingDragged ? "shadow-lg ring-2 ring-primary/50 z-20" : "hover:shadow-md",
                                (isDragging || isLinkDragging) && !isBeingDragged && !isLinkSource && !isLinkTarget && "opacity-50",
                                isLinkTarget && "ring-2 ring-primary shadow-lg z-20",
                                isOnCriticalPath && "ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
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
                                            y: globalIndex * 48 + 8 + 16 // row height * index + padding + half height
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
                              {isOnCriticalPath && (
                                <p className="text-orange-400 font-medium">⚡ On Critical Path</p>
                              )}
                              <p className="text-muted-foreground">Drag to move • Drag edges to resize • Use link icon to create dependencies</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Dependency creation hint when no dependencies exist */}
              {tasks.length >= 2 && dependencies.length === 0 && onCreateDependency && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-muted/80 to-transparent pt-6 pb-3 px-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span>
                      <strong>Tip:</strong> Hover over a task and drag the{' '}
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary mx-0.5 align-middle">
                        <Link2 className="h-3 w-3 text-primary-foreground" />
                      </span>{' '}
                      icon to link tasks together
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
