import { useMemo } from 'react';
import { Task, TaskDependency, ViewMode } from '@/types/gantt';
import { format, differenceInDays, addDays, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isToday, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface GanttChartProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  viewMode: ViewMode;
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

export function GanttChart({ tasks, dependencies, viewMode, onTaskClick, onToggleComplete }: GanttChartProps) {
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
    const today = startOfDay(new Date());
    const endDate = startOfDay(new Date(task.end_date));
    const isOverdue = isBefore(endDate, today) && task.status !== 'completed';

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

  return (
    <div className="flex border rounded-lg overflow-hidden bg-card">
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
            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange={() => onToggleComplete(task)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className={cn(
              "text-sm truncate",
              task.status === 'completed' && "line-through text-muted-foreground"
            )}>
              {task.name}
            </span>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="h-12 flex items-center justify-center text-sm text-muted-foreground">
            No tasks yet
          </div>
        )}
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
            {tasks.map((task) => {
              const position = getTaskPosition(task);
              return (
                <div key={task.id} className="h-12 relative border-b">
                  <div
                    className={cn(
                      "absolute top-2 h-8 rounded cursor-pointer transition-all hover:shadow-md flex items-center px-2",
                      getStatusColor(task)
                    )}
                    style={{
                      left: position.left,
                      width: position.width
                    }}
                    onClick={() => onTaskClick(task)}
                  >
                    {/* Progress bar inside */}
                    {task.progress > 0 && task.progress < 100 && (
                      <div
                        className="absolute inset-0 bg-foreground/20 rounded-l"
                        style={{ width: `${task.progress}%` }}
                      />
                    )}
                    <span className="text-xs text-primary-foreground font-medium truncate relative z-10">
                      {position.width > 60 ? task.name : ''}
                    </span>
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 && (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                Add tasks to see them on the timeline
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
