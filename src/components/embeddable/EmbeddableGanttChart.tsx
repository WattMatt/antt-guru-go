/**
 * EmbeddableGanttChart
 * 
 * A standalone, embeddable Gantt chart visualization component.
 * This component has NO backend dependencies and receives all data via props.
 * 
 * Usage:
 * ```tsx
 * import { EmbeddableGanttChart } from '@/components/embeddable';
 * 
 * <EmbeddableGanttChart
 *   tasks={myTasks}
 *   dependencies={myDependencies}
 *   config={{ viewMode: 'week', showDependencies: true }}
 *   callbacks={{ onTaskClick: (task) => console.log(task) }}
 * />
 * ```
 */

import { useMemo, useState, useCallback, useRef } from 'react';
import { 
  format, 
  differenceInDays, 
  addDays, 
  startOfDay, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  eachMonthOfInterval, 
  isToday, 
  isBefore 
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GripVertical, User, CheckCircle2, Circle, Clock } from 'lucide-react';
import {
  EmbeddableGanttChartProps,
  EmbeddableTask,
  EmbeddableDependency,
  EmbeddableMilestone,
  EmbeddableBaselineTask,
  EmbeddableViewMode,
  EmbeddableGroupByMode,
  EmbeddableColorPreset
} from './types';

// Default color presets
const DEFAULT_COLOR_PRESETS: EmbeddableColorPreset[] = [
  { key: 'blue', label: 'Blue', bgClass: 'bg-blue-500', textClass: 'text-white', swatchColor: '#3b82f6' },
  { key: 'green', label: 'Green', bgClass: 'bg-green-500', textClass: 'text-white', swatchColor: '#22c55e' },
  { key: 'purple', label: 'Purple', bgClass: 'bg-purple-500', textClass: 'text-white', swatchColor: '#a855f7' },
  { key: 'orange', label: 'Orange', bgClass: 'bg-orange-500', textClass: 'text-white', swatchColor: '#f97316' },
  { key: 'pink', label: 'Pink', bgClass: 'bg-pink-500', textClass: 'text-white', swatchColor: '#ec4899' },
  { key: 'teal', label: 'Teal', bgClass: 'bg-teal-500', textClass: 'text-white', swatchColor: '#14b8a6' },
  { key: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-500', textClass: 'text-black', swatchColor: '#eab308' },
  { key: 'red', label: 'Red', bgClass: 'bg-red-500', textClass: 'text-white', swatchColor: '#ef4444' },
  { key: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-500', textClass: 'text-white', swatchColor: '#6366f1' },
  { key: 'gray', label: 'Gray', bgClass: 'bg-gray-500', textClass: 'text-white', swatchColor: '#6b7280' },
];

interface TaskGroup {
  key: string;
  label: string;
  icon?: React.ReactNode;
  tasks: EmbeddableTask[];
}

export function EmbeddableGanttChart({
  tasks,
  dependencies = [],
  milestones = [],
  baselineTasks = [],
  criticalPathTaskIds = new Set(),
  config = {},
  callbacks = {}
}: EmbeddableGanttChartProps) {
  // Destructure config with defaults
  const {
    viewMode: initialViewMode = 'week',
    groupBy: initialGroupBy = 'none',
    showDependencies = true,
    showTodayLine = true,
    showMilestones = true,
    showBaseline = true,
    showCriticalPath = true,
    colorPresets = DEFAULT_COLOR_PRESETS,
    className
  } = config;

  const { onTaskClick, onMilestoneClick, onViewModeChange, onGroupByChange } = callbacks;

  // Internal state for view controls
  const [viewMode, setViewMode] = useState<EmbeddableViewMode>(initialViewMode);
  const [groupBy, setGroupBy] = useState<EmbeddableGroupByMode>(initialGroupBy);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: EmbeddableViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  // Handle group by change
  const handleGroupByChange = useCallback((group: EmbeddableGroupByMode) => {
    setGroupBy(group);
    onGroupByChange?.(group);
  }, [onGroupByChange]);

  // Get color preset for a task
  const getTaskColorPreset = useCallback((key: string | null | undefined) => {
    if (!key) return null;
    return colorPresets.find(preset => preset.key === key) ?? null;
  }, [colorPresets]);

  // Calculate timeline bounds
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

  // Get task position on timeline
  const getTaskPosition = useCallback((task: EmbeddableTask) => {
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

  // Get today line position
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

  // Get milestone position
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

  // Get task status color
  const getStatusColor = (task: EmbeddableTask) => {
    const customColor = getTaskColorPreset(task.color);
    if (customColor) {
      return customColor.bgClass;
    }

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

  // Format time unit labels
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

  // Group tasks
  const taskGroups = useMemo((): TaskGroup[] => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', tasks, icon: undefined }];
    }

    if (groupBy === 'owner') {
      const grouped = new Map<string, EmbeddableTask[]>();
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

      const grouped = new Map<string, EmbeddableTask[]>();
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

    return [{ key: 'all', label: '', tasks, icon: undefined }];
  }, [tasks, groupBy]);

  const flattenedTasks = useMemo(() => {
    return taskGroups.flatMap(group => group.tasks);
  }, [taskGroups]);

  const chartWidth = timeUnits.length * unitWidth;
  const todayPosition = getTodayPosition();

  // Get baseline position for a task
  const getBaselinePosition = useCallback((baselineTask: EmbeddableBaselineTask) => {
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
  }, [startDate, viewMode, unitWidth]);

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className={cn("border rounded-lg overflow-hidden bg-card p-8 text-center", className)}>
        <p className="text-muted-foreground">No tasks to display</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex flex-col border rounded-lg overflow-hidden bg-card", className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as EmbeddableViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                  viewMode === mode 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex gap-1">
            {(['none', 'owner', 'status'] as EmbeddableGroupByMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleGroupByChange(mode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                  groupBy === mode 
                    ? "bg-secondary text-secondary-foreground" 
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {mode === 'none' ? 'No Grouping' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="flex flex-1">
          {/* Task list sidebar */}
          <div className="w-72 flex-shrink-0 border-r bg-muted/30">
            <div className="h-14 border-b flex items-center gap-2 px-4 font-semibold bg-muted/50">
              <span>Task Name</span>
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                {tasks.length}
              </span>
            </div>
            {taskGroups.map((group) => (
              <div key={group.key}>
                {groupBy !== 'none' && (
                  <div className="h-8 border-b flex items-center gap-2 px-4 bg-muted/70 sticky top-0">
                    {group.icon}
                    <span className="text-xs font-medium">{group.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                )}
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "h-12 border-b flex items-center gap-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    )}
                    onClick={() => onTaskClick?.(task)}
                  >
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
                      {task.name}
                    </span>
                  </div>
                ))}
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
              <div className="relative" ref={chartAreaRef}>
                {/* Milestone markers */}
                {showMilestones && milestones.map((milestone) => {
                  const position = getMilestonePosition(milestone.date);
                  if (position < 0 || position > chartWidth) return null;
                  return (
                    <Tooltip key={milestone.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="absolute top-0 z-20 flex flex-col items-center cursor-pointer transition-transform hover:scale-110"
                          style={{ left: `${position}px`, transform: 'translateX(-50%)' }}
                          onClick={() => onMilestoneClick?.(milestone)}
                        >
                          <div
                            className="w-4 h-4 rotate-45 border-2 border-background shadow-lg"
                            style={{ backgroundColor: milestone.color }}
                          />
                          <div
                            className="w-0.5 h-full min-h-[200px] opacity-50"
                            style={{ backgroundColor: milestone.color }}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px]">
                        <div className="space-y-1">
                          <p className="font-medium">{milestone.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(milestone.date), 'PPP')}
                          </p>
                          {milestone.description && (
                            <p className="text-xs text-muted-foreground">{milestone.description}</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}

                {/* Today line */}
                {showTodayLine && todayPosition >= 0 && todayPosition <= chartWidth && (
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
                <div className="absolute inset-0 flex pointer-events-none">
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

                {/* Dependency arrows */}
                {showDependencies && dependencies.length > 0 && (
                  <svg
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{ width: chartWidth, height: flattenedTasks.length * 48 + (taskGroups.length - 1) * 32 }}
                  >
                    {dependencies.map((dep) => {
                      const predecessorIndex = flattenedTasks.findIndex(t => t.id === dep.predecessor_id);
                      const successorIndex = flattenedTasks.findIndex(t => t.id === dep.successor_id);
                      
                      if (predecessorIndex === -1 || successorIndex === -1) return null;
                      
                      const predecessor = flattenedTasks[predecessorIndex];
                      const successor = flattenedTasks[successorIndex];
                      
                      const predPos = getTaskPosition(predecessor);
                      const succPos = getTaskPosition(successor);
                      
                      const startX = predPos.left + predPos.width;
                      const startY = predecessorIndex * 48 + 24;
                      const endX = succPos.left;
                      const endY = successorIndex * 48 + 24;
                      
                      const midX = startX + (endX - startX) / 2;
                      
                      const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
                      
                      return (
                        <g key={dep.id}>
                          <path
                            d={path}
                            fill="none"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth="1.5"
                            strokeOpacity="0.5"
                            markerEnd="url(#arrowhead)"
                          />
                        </g>
                      );
                    })}
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill="hsl(var(--muted-foreground))"
                          fillOpacity="0.5"
                        />
                      </marker>
                    </defs>
                  </svg>
                )}

                {/* Task rows with group headers */}
                {taskGroups.map((group) => (
                  <div key={group.key}>
                    {groupBy !== 'none' && (
                      <div className="h-8 border-b bg-muted/30" />
                    )}
                    {group.tasks.map((task) => {
                      const position = getTaskPosition(task);
                      const isOnCriticalPath = showCriticalPath && criticalPathTaskIds.has(task.id);
                      const baselineTask = showBaseline ? baselineTasks.find(bt => bt.task_id === task.id) : null;
                      const baselinePosition = baselineTask ? getBaselinePosition(baselineTask) : null;

                      return (
                        <div key={task.id} className="h-12 relative border-b">
                          {/* Baseline bar */}
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

                          {/* Task bar */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute top-2 h-8 rounded cursor-pointer transition-shadow hover:shadow-md flex items-center",
                                  getStatusColor(task),
                                  isOnCriticalPath && "ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                                )}
                                style={{
                                  left: position.left,
                                  width: position.width
                                }}
                                onClick={() => onTaskClick?.(task)}
                              >
                                {/* Progress bar inside */}
                                {task.progress > 0 && task.progress < 100 && (
                                  <div
                                    className="absolute inset-0 bg-foreground/20 rounded-l pointer-events-none"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                )}
                                <span className="text-xs text-primary-foreground font-medium truncate px-2 relative z-10">
                                  {position.width > 60 ? task.name : ''}
                                </span>
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
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default EmbeddableGanttChart;
