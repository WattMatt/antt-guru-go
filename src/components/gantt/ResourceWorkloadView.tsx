import { useMemo } from 'react';
import { Task, ViewMode } from '@/types/gantt';
import { getTaskColorPreset } from '@/lib/taskColors';
import { format, differenceInDays, addDays, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isToday, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ResourceWorkloadViewProps {
  tasks: Task[];
  viewMode: ViewMode;
  onTaskClick: (task: Task) => void;
}

interface OwnerWorkload {
  owner: string;
  tasks: Task[];
  totalDays: number;
  overlappingDays: number;
  isOverloaded: boolean;
}

export function ResourceWorkloadView({
  tasks,
  viewMode,
  onTaskClick
}: ResourceWorkloadViewProps) {
  // Group tasks by owner and calculate workload
  const ownerWorkloads = useMemo((): OwnerWorkload[] => {
    const grouped = new Map<string, Task[]>();
    
    tasks.forEach(task => {
      const owner = task.owner || 'Unassigned';
      if (!grouped.has(owner)) {
        grouped.set(owner, []);
      }
      grouped.get(owner)!.push(task);
    });

    return Array.from(grouped.entries())
      .map(([owner, ownerTasks]) => {
        // Calculate total days across all tasks
        const totalDays = ownerTasks.reduce((sum, task) => {
          const start = new Date(task.start_date);
          const end = new Date(task.end_date);
          return sum + differenceInDays(end, start) + 1;
        }, 0);

        // Calculate overlapping days (days with multiple tasks)
        const dayMap = new Map<string, number>();
        ownerTasks.forEach(task => {
          const start = startOfDay(new Date(task.start_date));
          const end = startOfDay(new Date(task.end_date));
          const days = eachDayOfInterval({ start, end });
          days.forEach(day => {
            const key = format(day, 'yyyy-MM-dd');
            dayMap.set(key, (dayMap.get(key) || 0) + 1);
          });
        });

        const overlappingDays = Array.from(dayMap.values()).filter(count => count > 1).length;
        const isOverloaded = overlappingDays > 0;

        return {
          owner,
          tasks: ownerTasks.sort((a, b) => 
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          ),
          totalDays,
          overlappingDays,
          isOverloaded
        };
      })
      .sort((a, b) => {
        if (a.owner === 'Unassigned') return 1;
        if (b.owner === 'Unassigned') return -1;
        return b.tasks.length - a.tasks.length; // Sort by task count descending
      });
  }, [tasks]);

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

  const getTaskPosition = (task: Task) => {
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
  };

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

  if (tasks.length === 0) {
    return (
      <div className="border rounded-lg bg-card p-8 text-center">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Tasks Yet</h3>
        <p className="text-muted-foreground">
          Add tasks with owners to see resource workload distribution.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Summary header */}
        <div className="p-4 border-b bg-muted/30 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{ownerWorkloads.length} Resources</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{tasks.length} Total Tasks</span>
          </div>
          {ownerWorkloads.some(w => w.isOverloaded) && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {ownerWorkloads.filter(w => w.isOverloaded).length} Overloaded
            </Badge>
          )}
        </div>

        <div className="flex">
          {/* Resource sidebar */}
          <div className="w-56 flex-shrink-0 border-r bg-muted/30">
            <div className="h-14 border-b flex items-center px-4 font-semibold bg-muted/50">
              <span>Resource</span>
            </div>
            {ownerWorkloads.map((workload) => (
              <div
                key={workload.owner}
                className="border-b bg-card"
                style={{ height: Math.max(48, workload.tasks.length * 28 + 20) }}
              >
                <div className="p-3 h-full flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                      workload.owner === 'Unassigned' 
                        ? "bg-muted text-muted-foreground" 
                        : "bg-primary/10 text-primary"
                    )}>
                      {workload.owner === 'Unassigned' ? '?' : workload.owner.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate">
                          {workload.owner}
                        </span>
                        {workload.isOverloaded && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{workload.overlappingDays} days with overlapping tasks</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {workload.tasks.length} task{workload.tasks.length !== 1 ? 's' : ''} • {workload.totalDays} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline area */}
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

              {/* Resource rows with tasks */}
              <div className="relative">
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

                {/* Owner rows */}
                {ownerWorkloads.map((workload) => {
                  const rowHeight = Math.max(48, workload.tasks.length * 28 + 20);
                  
                  return (
                    <div
                      key={workload.owner}
                      className="relative border-b"
                      style={{ height: rowHeight }}
                    >
                      {/* Task bars stacked */}
                      {workload.tasks.map((task, taskIndex) => {
                        const position = getTaskPosition(task);
                        
                        return (
                          <Tooltip key={task.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute h-6 rounded cursor-pointer transition-shadow hover:shadow-md flex items-center px-2",
                                  getStatusColor(task)
                                )}
                                style={{
                                  left: position.left,
                                  width: position.width,
                                  top: 10 + taskIndex * 28
                                }}
                                onClick={() => onTaskClick(task)}
                              >
                                <span className="text-xs text-primary-foreground font-medium truncate">
                                  {position.width > 60 ? task.name : ''}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-medium">{task.name}</p>
                                <p>{format(new Date(task.start_date), 'MMM d')} - {format(new Date(task.end_date), 'MMM d')}</p>
                                <p>Progress: {task.progress}%</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
