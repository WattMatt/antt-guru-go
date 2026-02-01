/**
 * Embeddable Gantt Chart Components
 * 
 * Export this module to use the Gantt chart in another React application.
 * 
 * Usage:
 * ```tsx
 * import { 
 *   EmbeddableGanttChart, 
 *   EmbeddableTask, 
 *   EmbeddableDependency 
 * } from '@/components/embeddable';
 * 
 * const tasks: EmbeddableTask[] = [
 *   {
 *     id: '1',
 *     name: 'Task 1',
 *     start_date: '2024-01-01',
 *     end_date: '2024-01-15',
 *     status: 'in_progress',
 *     progress: 50,
 *     sort_order: 0
 *   }
 * ];
 * 
 * <EmbeddableGanttChart 
 *   tasks={tasks} 
 *   config={{ viewMode: 'week' }}
 *   callbacks={{ onTaskClick: (task) => console.log(task) }}
 * />
 * ```
 */

// Main component
export { EmbeddableGanttChart, default } from './EmbeddableGanttChart';

// Types
export type {
  EmbeddableTask,
  EmbeddableTaskStatus,
  EmbeddableDependency,
  EmbeddableDependencyType,
  EmbeddableMilestone,
  EmbeddableBaselineTask,
  EmbeddableViewMode,
  EmbeddableGroupByMode,
  EmbeddableColorPreset,
  EmbeddableGanttConfig,
  EmbeddableGanttCallbacks,
  EmbeddableGanttChartProps
} from './types';
