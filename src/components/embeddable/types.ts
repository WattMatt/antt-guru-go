/**
 * Embeddable Gantt Chart Types
 * 
 * These types are standalone and don't depend on Supabase or any backend.
 * Use these when integrating the EmbeddableGanttChart into another application.
 */

export type EmbeddableTaskStatus = 'not_started' | 'in_progress' | 'completed';

export type EmbeddableDependencyType = 
  | 'finish_to_start' 
  | 'start_to_start' 
  | 'finish_to_finish' 
  | 'start_to_finish';

export type EmbeddableViewMode = 'day' | 'week' | 'month';

export type EmbeddableGroupByMode = 'none' | 'owner' | 'status';

/**
 * Task data structure for the Gantt chart
 */
export interface EmbeddableTask {
  /** Unique identifier for the task */
  id: string;
  /** Display name of the task */
  name: string;
  /** Optional description */
  description?: string | null;
  /** Start date in ISO format (YYYY-MM-DD) */
  start_date: string;
  /** End date in ISO format (YYYY-MM-DD) */
  end_date: string;
  /** Current status of the task */
  status: EmbeddableTaskStatus;
  /** Person responsible for the task */
  owner?: string | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Sort order for display */
  sort_order: number;
  /** Color key (blue, green, purple, orange, pink, teal, yellow, red, indigo, gray) */
  color?: string | null;
}

/**
 * Dependency between two tasks
 */
export interface EmbeddableDependency {
  /** Unique identifier for the dependency */
  id: string;
  /** ID of the task that must complete first (for FS dependency) */
  predecessor_id: string;
  /** ID of the task that depends on the predecessor */
  successor_id: string;
  /** Type of dependency relationship */
  dependency_type: EmbeddableDependencyType;
}

/**
 * Milestone marker on the timeline
 */
export interface EmbeddableMilestone {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Optional description */
  description?: string | null;
  /** Hex color for the marker (e.g., '#8B5CF6') */
  color: string;
}

/**
 * Baseline task snapshot for comparison
 */
export interface EmbeddableBaselineTask {
  /** Unique identifier */
  id: string;
  /** ID of the corresponding current task */
  task_id: string;
  /** Task name at time of baseline */
  name: string;
  /** Original start date */
  start_date: string;
  /** Original end date */
  end_date: string;
}

/**
 * Color preset configuration
 */
export interface EmbeddableColorPreset {
  key: string;
  label: string;
  bgClass: string;
  textClass: string;
  swatchColor: string;
}

/**
 * Configuration options for the chart
 */
export interface EmbeddableGanttConfig {
  /** Initial view mode */
  viewMode?: EmbeddableViewMode;
  /** How to group tasks */
  groupBy?: EmbeddableGroupByMode;
  /** Show dependency arrows */
  showDependencies?: boolean;
  /** Show today marker line */
  showTodayLine?: boolean;
  /** Show milestone markers */
  showMilestones?: boolean;
  /** Show baseline comparison bars */
  showBaseline?: boolean;
  /** Highlight tasks on critical path */
  showCriticalPath?: boolean;
  /** Custom color presets (overrides defaults) */
  colorPresets?: EmbeddableColorPreset[];
  /** Custom class name for the container */
  className?: string;
}

/**
 * Event callbacks for interactive features
 */
export interface EmbeddableGanttCallbacks {
  /** Called when a task is clicked */
  onTaskClick?: (task: EmbeddableTask) => void;
  /** Called when a milestone is clicked */
  onMilestoneClick?: (milestone: EmbeddableMilestone) => void;
  /** Called when view mode changes */
  onViewModeChange?: (mode: EmbeddableViewMode) => void;
  /** Called when group by changes */
  onGroupByChange?: (groupBy: EmbeddableGroupByMode) => void;
}

/**
 * Props for the EmbeddableGanttChart component
 */
export interface EmbeddableGanttChartProps {
  /** Array of tasks to display */
  tasks: EmbeddableTask[];
  /** Array of dependencies between tasks */
  dependencies?: EmbeddableDependency[];
  /** Array of milestones to display */
  milestones?: EmbeddableMilestone[];
  /** Baseline tasks for comparison */
  baselineTasks?: EmbeddableBaselineTask[];
  /** Set of task IDs on the critical path */
  criticalPathTaskIds?: Set<string>;
  /** Chart configuration options */
  config?: EmbeddableGanttConfig;
  /** Event callbacks */
  callbacks?: EmbeddableGanttCallbacks;
}
