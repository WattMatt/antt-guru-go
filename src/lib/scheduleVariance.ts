import { Task, BaselineTask } from '@/types/gantt';
import { differenceInDays } from 'date-fns';

export interface TaskVariance {
  taskId: string;
  /** Variance in days for start date (negative = ahead, positive = behind) */
  startVariance: number;
  /** Variance in days for end date (negative = ahead, positive = behind) */
  endVariance: number;
  /** Overall schedule status */
  status: 'ahead' | 'on_track' | 'behind';
  /** Whether the baseline task exists for comparison */
  hasBaseline: boolean;
}

/**
 * Calculate schedule variance for tasks compared to baseline
 * @param tasks Current tasks
 * @param baselineTasks Baseline task snapshots
 * @returns Map of task ID to variance info
 */
export function calculateScheduleVariance(
  tasks: Task[],
  baselineTasks: BaselineTask[]
): Map<string, TaskVariance> {
  const varianceMap = new Map<string, TaskVariance>();
  
  // Create a lookup for baseline tasks by task_id
  const baselineByTaskId = new Map<string, BaselineTask>();
  for (const bt of baselineTasks) {
    baselineByTaskId.set(bt.task_id, bt);
  }
  
  for (const task of tasks) {
    const baseline = baselineByTaskId.get(task.id);
    
    if (!baseline) {
      // No baseline for this task (new task added after baseline)
      varianceMap.set(task.id, {
        taskId: task.id,
        startVariance: 0,
        endVariance: 0,
        status: 'on_track',
        hasBaseline: false
      });
      continue;
    }
    
    const currentStart = new Date(task.start_date);
    const currentEnd = new Date(task.end_date);
    const baselineStart = new Date(baseline.start_date);
    const baselineEnd = new Date(baseline.end_date);
    
    // Positive = behind schedule, Negative = ahead of schedule
    const startVariance = differenceInDays(currentStart, baselineStart);
    const endVariance = differenceInDays(currentEnd, baselineEnd);
    
    // Determine overall status based on end date variance (most important for project timeline)
    let status: 'ahead' | 'on_track' | 'behind';
    if (endVariance > 0) {
      status = 'behind';
    } else if (endVariance < 0) {
      status = 'ahead';
    } else {
      status = 'on_track';
    }
    
    varianceMap.set(task.id, {
      taskId: task.id,
      startVariance,
      endVariance,
      status,
      hasBaseline: true
    });
  }
  
  return varianceMap;
}

/**
 * Format variance for display
 * @param days Number of days (positive = behind, negative = ahead)
 * @returns Formatted string like "+3d" or "-2d"
 */
export function formatVariance(days: number): string {
  if (days === 0) return '0d';
  const sign = days > 0 ? '+' : '';
  return `${sign}${days}d`;
}
