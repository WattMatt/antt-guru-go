export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: TaskStatus;
  owner: string | null;
  progress: number;
  sort_order: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: DependencyType;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ViewMode = 'day' | 'week' | 'month';

export type GroupByMode = 'none' | 'owner' | 'status';

export interface GanttChartConfig {
  viewMode: ViewMode;
  showDependencies: boolean;
  showProgress: boolean;
  showTodayLine: boolean;
}
