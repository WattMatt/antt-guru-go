import { Task, TaskDependency } from '@/types/gantt';
import { differenceInDays } from 'date-fns';

interface TaskNode {
  task: Task;
  duration: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  predecessors: string[];
  successors: string[];
}

/**
 * Task slack information
 */
export interface TaskSlackInfo {
  taskId: string;
  /** Total float/slack in days - how much the task can be delayed without affecting project end */
  totalSlack: number;
  /** Free float in days - how much the task can be delayed without affecting any successor */
  freeSlack: number;
  /** Earliest possible start (days from project start) */
  earliestStart: number;
  /** Latest possible start without delaying project (days from project start) */
  latestStart: number;
  /** Whether this task is on the critical path */
  isCritical: boolean;
}

/**
 * Result of critical path analysis
 */
export interface CriticalPathResult {
  /** Set of task IDs on the critical path */
  criticalTaskIds: Set<string>;
  /** Slack information for each task */
  taskSlack: Map<string, TaskSlackInfo>;
}

/**
 * Calculate the critical path and slack for a set of tasks and dependencies.
 * The critical path is the longest sequence of dependent tasks that determines
 * the minimum project duration. Tasks on the critical path have zero slack.
 * 
 * @param tasks - Array of tasks
 * @param dependencies - Array of task dependencies
 * @returns Critical path task IDs and slack information
 */
export function calculateCriticalPathWithSlack(
  tasks: Task[],
  dependencies: TaskDependency[]
): CriticalPathResult {
  const result: CriticalPathResult = {
    criticalTaskIds: new Set(),
    taskSlack: new Map()
  };
  if (tasks.length === 0) {
    return result;
  }

  // Build task node map
  const nodes = new Map<string, TaskNode>();
  
  for (const task of tasks) {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    const duration = differenceInDays(endDate, startDate) + 1;
    
    nodes.set(task.id, {
      task,
      duration,
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: Infinity,
      latestFinish: Infinity,
      slack: Infinity,
      predecessors: [],
      successors: []
    });
  }

  // Build dependency graph
  for (const dep of dependencies) {
    const predecessor = nodes.get(dep.predecessor_id);
    const successor = nodes.get(dep.successor_id);
    
    if (predecessor && successor) {
      predecessor.successors.push(dep.successor_id);
      successor.predecessors.push(dep.predecessor_id);
    }
  }

  // Get tasks sorted by start date for initial ordering
  const sortedTaskIds = Array.from(nodes.keys()).sort((a, b) => {
    const nodeA = nodes.get(a)!;
    const nodeB = nodes.get(b)!;
    return new Date(nodeA.task.start_date).getTime() - new Date(nodeB.task.start_date).getTime();
  });

  // Topological sort for forward pass
  const visited = new Set<string>();
  const sorted: string[] = [];
  
  function topologicalSort(taskId: string) {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    
    const node = nodes.get(taskId);
    if (node) {
      for (const predId of node.predecessors) {
        topologicalSort(predId);
      }
      sorted.push(taskId);
    }
  }
  
  for (const taskId of sortedTaskIds) {
    topologicalSort(taskId);
  }

  // Forward pass: Calculate earliest start/finish times
  // Use the task's actual start date as the base for scheduling
  const projectStartDate = Math.min(...tasks.map(t => new Date(t.start_date).getTime()));
  
  for (const taskId of sorted) {
    const node = nodes.get(taskId)!;
    const taskStartTime = new Date(node.task.start_date).getTime();
    const daysFromProjectStart = Math.floor((taskStartTime - projectStartDate) / (1000 * 60 * 60 * 24));
    
    // Earliest start is the maximum of:
    // 1. The task's actual position from project start
    // 2. The earliest finish of all predecessors
    let earliestStart = daysFromProjectStart;
    
    for (const predId of node.predecessors) {
      const predNode = nodes.get(predId);
      if (predNode) {
        earliestStart = Math.max(earliestStart, predNode.earliestFinish);
      }
    }
    
    node.earliestStart = earliestStart;
    node.earliestFinish = earliestStart + node.duration;
  }

  // Find project end time
  let projectEndTime = 0;
  for (const node of nodes.values()) {
    projectEndTime = Math.max(projectEndTime, node.earliestFinish);
  }

  // Backward pass: Calculate latest start/finish times
  for (let i = sorted.length - 1; i >= 0; i--) {
    const taskId = sorted[i];
    const node = nodes.get(taskId)!;
    
    // If no successors, latest finish is project end
    if (node.successors.length === 0) {
      node.latestFinish = projectEndTime;
    } else {
      // Latest finish is the minimum of all successors' latest starts
      let latestFinish = Infinity;
      for (const succId of node.successors) {
        const succNode = nodes.get(succId);
        if (succNode) {
          latestFinish = Math.min(latestFinish, succNode.latestStart);
        }
      }
      node.latestFinish = latestFinish;
    }
    
    node.latestStart = node.latestFinish - node.duration;
    node.slack = node.latestStart - node.earliestStart;
  }

  // Calculate free slack (how much a task can be delayed without affecting successors)
  for (const [taskId, node] of nodes) {
    let freeSlack = Infinity;
    
    if (node.successors.length === 0) {
      // No successors - free slack equals total slack
      freeSlack = Math.max(0, node.slack);
    } else {
      // Free slack = min(successor earliest start) - this task's earliest finish
      for (const succId of node.successors) {
        const succNode = nodes.get(succId);
        if (succNode) {
          const gap = succNode.earliestStart - node.earliestFinish;
          freeSlack = Math.min(freeSlack, Math.max(0, gap));
        }
      }
    }
    
    const isCritical = node.slack <= 0;
    
    result.taskSlack.set(taskId, {
      taskId,
      totalSlack: Math.max(0, node.slack),
      freeSlack: freeSlack === Infinity ? Math.max(0, node.slack) : freeSlack,
      earliestStart: node.earliestStart,
      latestStart: node.latestStart,
      isCritical
    });
    
    if (isCritical) {
      result.criticalTaskIds.add(taskId);
    }
  }

  // If no tasks have zero slack (disconnected tasks), find the longest path
  if (result.criticalTaskIds.size === 0 && tasks.length > 0) {
    // Find tasks that form the longest duration chain
    const endTasks = Array.from(nodes.values())
      .filter(n => n.successors.length === 0)
      .sort((a, b) => b.earliestFinish - a.earliestFinish);
    
    if (endTasks.length > 0) {
      // Trace back from the task with the latest finish time
      const tracePath = (taskId: string) => {
        result.criticalTaskIds.add(taskId);
        const slackInfo = result.taskSlack.get(taskId);
        if (slackInfo) {
          slackInfo.isCritical = true;
        }
        
        const node = nodes.get(taskId);
        if (node && node.predecessors.length > 0) {
          // Find the predecessor with the latest earliest finish (critical predecessor)
          let criticalPred: string | null = null;
          let maxFinish = -1;
          
          for (const predId of node.predecessors) {
            const predNode = nodes.get(predId);
            if (predNode && predNode.earliestFinish > maxFinish) {
              maxFinish = predNode.earliestFinish;
              criticalPred = predId;
            }
          }
          
          if (criticalPred) {
            tracePath(criticalPred);
          }
        }
      };
      
      tracePath(endTasks[0].task.id);
    }
  }

  return result;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateCriticalPathWithSlack instead
 */
export function calculateCriticalPath(
  tasks: Task[],
  dependencies: TaskDependency[]
): Set<string> {
  const result = calculateCriticalPathWithSlack(tasks, dependencies);
  return result.criticalTaskIds;
}

/**
 * Get critical path statistics
 */
export function getCriticalPathStats(
  tasks: Task[],
  criticalPathTaskIds: Set<string>
): {
  totalTasks: number;
  criticalTasks: number;
  projectDuration: number;
  criticalPathDuration: number;
} {
  const criticalTasks = tasks.filter(t => criticalPathTaskIds.has(t.id));
  
  let projectDuration = 0;
  let criticalPathDuration = 0;
  
  if (tasks.length > 0) {
    const startDates = tasks.map(t => new Date(t.start_date).getTime());
    const endDates = tasks.map(t => new Date(t.end_date).getTime());
    const projectStart = Math.min(...startDates);
    const projectEnd = Math.max(...endDates);
    projectDuration = Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24)) + 1;
  }
  
  if (criticalTasks.length > 0) {
    const startDates = criticalTasks.map(t => new Date(t.start_date).getTime());
    const endDates = criticalTasks.map(t => new Date(t.end_date).getTime());
    const criticalStart = Math.min(...startDates);
    const criticalEnd = Math.max(...endDates);
    criticalPathDuration = Math.ceil((criticalEnd - criticalStart) / (1000 * 60 * 60 * 24)) + 1;
  }
  
  return {
    totalTasks: tasks.length,
    criticalTasks: criticalPathTaskIds.size,
    projectDuration,
    criticalPathDuration
  };
}
