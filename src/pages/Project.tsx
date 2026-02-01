import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useMilestones, Milestone } from '@/hooks/useMilestones';
import { useBaselines } from '@/hooks/useBaselines';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useUndoRedo, UndoableAction } from '@/hooks/useUndoRedo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFilterPresets, FilterPreset } from '@/hooks/useFilterPresets';
import { useChartExport } from '@/hooks/useChartExport';
import { TASK_COLOR_PRESETS } from '@/lib/taskColors';
import { calculateCriticalPathWithSlack, TaskSlackInfo } from '@/lib/criticalPath';
import { Task, ViewMode, DependencyType, GroupByMode, ChartViewType, BaselineTask } from '@/types/gantt';
import { GanttChart } from '@/components/gantt/GanttChart';
import { ResourceWorkloadView } from '@/components/gantt/ResourceWorkloadView';
import { GanttToolbar, DependencyBreakdown } from '@/components/gantt/GanttToolbar';
import { TaskForm } from '@/components/gantt/TaskForm';
import { MilestoneForm } from '@/components/gantt/MilestoneForm';
import { ProgressPanel } from '@/components/gantt/ProgressPanel';
import { OnboardingChecklist } from '@/components/gantt/OnboardingChecklist';
import { BulkActionsBar } from '@/components/gantt/BulkActionsBar';
import { KeyboardShortcutsModal } from '@/components/gantt/KeyboardShortcutsModal';
import { Confetti } from '@/components/ui/confetti';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, BarChart3, Settings, Keyboard } from 'lucide-react';

export default function Project() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();
  const { tasks, dependencies, createTask, updateTask, deleteTask, toggleTaskStatus, createDependency, updateDependency, deleteDependency, bulkUpdateTasks, bulkDeleteTasks, reorderTasks, duplicateTask } = useTasks(projectId);
  
  // Milestones
  const { milestones, createMilestone, updateMilestone, deleteMilestone } = useMilestones(projectId);
  
  // Baselines
  const { baselines, baselineTasks, createBaseline, deleteBaseline, getBaselineTasks } = useBaselines(projectId);
  
  // Undo/Redo functionality
  const {
    canUndo,
    canRedo,
    pushAction,
    popUndo,
    popRedo,
    lastUndoDescription,
    lastRedoDescription
  } = useUndoRedo();

  // Filter presets
  const { presets: filterPresets, savePreset, deletePreset } = useFilterPresets({ 
    projectId: projectId ?? '' 
  });

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [chartViewType, setChartViewType] = useState<ChartViewType>('gantt');
  const [groupBy, setGroupBy] = useState<GroupByMode>('none');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isMilestoneFormOpen, setIsMilestoneFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | undefined>();
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [showProgress, setShowProgress] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [activeBaselineId, setActiveBaselineId] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const project = projects.find(p => p.id === projectId);

  // Chart export functionality
  const { exportAsPng, exportAsJpeg, exportAsPdf } = useChartExport({
    chartRef,
    projectName: project?.name ?? 'gantt-chart'
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const owners = useMemo(() => {
    const uniqueOwners = new Set(tasks.map(t => t.owner).filter(Boolean) as string[]);
    return Array.from(uniqueOwners);
  }, [tasks]);

  // Calculate dependency type breakdown for toolbar tooltip
  const dependencyBreakdown = useMemo((): DependencyBreakdown => {
    return dependencies.reduce(
      (acc, dep) => {
        acc[dep.dependency_type]++;
        return acc;
      },
      {
        finish_to_start: 0,
        start_to_start: 0,
        finish_to_finish: 0,
        start_to_finish: 0
      } as DependencyBreakdown
    );
  }, [dependencies]);

  // Calculate critical path and slack
  const { criticalPathTaskIds, taskSlackMap } = useMemo(() => {
    if (dependencies.length === 0) {
      return { criticalPathTaskIds: new Set<string>(), taskSlackMap: new Map<string, TaskSlackInfo>() };
    }
    const result = calculateCriticalPathWithSlack(tasks, dependencies);
    return { 
      criticalPathTaskIds: showCriticalPath ? result.criticalTaskIds : new Set<string>(),
      taskSlackMap: result.taskSlack
    };
  }, [tasks, dependencies, showCriticalPath]);

  // Get active baseline tasks for comparison
  const activeBaselineTasks = useMemo((): BaselineTask[] => {
    if (!activeBaselineId) return [];
    return getBaselineTasks(activeBaselineId);
  }, [activeBaselineId, getBaselineTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (searchQuery.trim() && !task.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (ownerFilter !== 'all' && task.owner !== ownerFilter) return false;
      if (colorFilter.length > 0) {
        // Check if task matches any of the selected colors
        const taskColorKey = task.color ?? 'none';
        if (!colorFilter.includes(taskColorKey)) return false;
      }
      // Date range filter - task overlaps with date range
      if (dateRangeStart || dateRangeEnd) {
        const taskStart = new Date(task.start_date);
        const taskEnd = new Date(task.end_date);
        if (dateRangeStart && taskEnd < dateRangeStart) return false;
        if (dateRangeEnd && taskStart > dateRangeEnd) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, statusFilter, ownerFilter, colorFilter, dateRangeStart, dateRangeEnd]);

  const handleAddTask = () => {
    setSelectedTask(undefined);
    setIsTaskFormOpen(true);
  };

  const handleAddMilestone = () => {
    setSelectedMilestone(undefined);
    setIsMilestoneFormOpen(true);
  };

  const handleMilestoneClick = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setIsMilestoneFormOpen(true);
  };

  const handleMilestoneSubmit = async (milestoneData: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (selectedMilestone) {
        await updateMilestone.mutateAsync({ id: selectedMilestone.id, ...milestoneData });
        toast.success('Milestone updated successfully');
      } else {
        await createMilestone.mutateAsync(milestoneData);
        toast.success('Milestone created successfully');
      }
      setIsMilestoneFormOpen(false);
      setSelectedMilestone(undefined);
    } catch (error) {
      toast.error('Failed to save milestone');
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    try {
      await deleteMilestone.mutateAsync(id);
      toast.success('Milestone deleted');
      setIsMilestoneFormOpen(false);
      setSelectedMilestone(undefined);
    } catch (error) {
      toast.error('Failed to delete milestone');
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskFormOpen(true);
  };

  const handleTaskSubmit = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (selectedTask) {
        // Track update action for undo
        pushAction({
          type: 'task_update',
          taskId: selectedTask.id,
          previousTask: { ...selectedTask },
          newTask: { ...taskData }
        });
        await updateTask.mutateAsync({ id: selectedTask.id, ...taskData });
        toast.success('Task updated successfully');
      } else {
        const newTask = await createTask.mutateAsync({ ...taskData, sort_order: tasks.length });
        // Track create action for undo
        pushAction({
          type: 'task_create',
          taskId: newTask.id,
          newTask: { ...newTask }
        });
        // Show milestone toast for first task
        if (tasks.length === 0) {
          toast.success('🎉 Great start! Your first task is on the timeline.');
        } else if (tasks.length === 2) {
          toast.success('👏 Nice progress! You now have 3 tasks.');
        } else {
          toast.success('Task created successfully');
        }
      }
      setIsTaskFormOpen(false);
      setSelectedTask(undefined);
    } catch (error) {
      toast.error('Failed to save task');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      // Track toggle action for undo
      pushAction({
        type: 'task_toggle_status',
        taskId: task.id,
        previousTask: { ...task },
        newTask: { 
          ...task, 
          status: task.status === 'completed' ? 'not_started' : 'completed',
          progress: task.status === 'completed' ? 0 : 100
        }
      });
      await toggleTaskStatus.mutateAsync({ id: task.id, status: task.status });
      if (task.status !== 'completed') {
        // Trigger celebration animation
        setShowConfetti(true);
        toast.success('✅ Task completed! Great work!');
      } else {
        toast.success('Task marked as incomplete');
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleTaskDateChange = async (taskId: string, startDate: Date, endDate: Date) => {
    const task = tasks.find(t => t.id === taskId);
    try {
      if (task) {
        // Track date change for undo
        pushAction({
          type: 'task_update',
          taskId,
          previousTask: { start_date: task.start_date, end_date: task.end_date },
          newTask: { 
            start_date: startDate.toISOString().split('T')[0], 
            end_date: endDate.toISOString().split('T')[0] 
          }
        });
      }
      await updateTask.mutateAsync({
        id: taskId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
      toast.success('Task dates updated');
    } catch (error) {
      toast.error('Failed to update task dates');
    }
  };


  const handleExportExcel = () => {
    if (tasks.length === 0) {
      toast.error('No tasks to export');
      return;
    }
    import('@/lib/reportExport').then(({ exportToExcel }) => {
      exportToExcel(tasks, project?.name ?? 'project');
      toast.success('Excel file downloaded!');
    });
  };

  const handleExportWord = () => {
    if (tasks.length === 0 && milestones.length === 0) {
      toast.error('No tasks or milestones to export');
      return;
    }
    import('@/lib/reportExport').then(({ exportToWord }) => {
      exportToWord(tasks, milestones, project?.name ?? 'project');
      toast.success('Word document downloaded!');
    });
  };

  const handleExportCalendar = () => {
    try {
      if (tasks.length === 0 && milestones.length === 0) {
        toast.error('No tasks or milestones to export');
        return;
      }
      
      import('@/lib/calendarExport').then(({ exportToCalendar }) => {
        exportToCalendar(tasks, milestones, project?.name ?? 'project');
        toast.success('Calendar file downloaded!');
      });
    } catch (error) {
      toast.error('Failed to export calendar');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCreateDependency = async (predecessorId: string, successorId: string, dependencyType: DependencyType) => {
    try {
      const newDep = await createDependency.mutateAsync({
        predecessor_id: predecessorId,
        successor_id: successorId,
        dependency_type: dependencyType
      });
      // Track dependency creation for undo
      pushAction({
        type: 'dependency_create',
        dependencyId: newDep.id,
        dependency: { ...newDep }
      });
      toast.success('Dependency created');
    } catch (error) {
      toast.error('Failed to create dependency');
    }
  };

  const handleUpdateDependency = async (dependencyId: string, dependencyType: DependencyType) => {
    const dep = dependencies.find(d => d.id === dependencyId);
    try {
      if (dep) {
        // Track dependency update for undo
        pushAction({
          type: 'dependency_update',
          dependencyId,
          previousDependency: { ...dep },
          newDependency: { ...dep, dependency_type: dependencyType }
        });
      }
      await updateDependency.mutateAsync({ id: dependencyId, dependency_type: dependencyType });
      toast.success('Dependency type updated');
    } catch (error) {
      toast.error('Failed to update dependency');
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    const dep = dependencies.find(d => d.id === dependencyId);
    try {
      if (dep) {
        // Track dependency deletion for undo
        pushAction({
          type: 'dependency_delete',
          dependencyId,
          dependency: { ...dep }
        });
      }
      await deleteDependency.mutateAsync(dependencyId);
      toast.success('Dependency removed');
    } catch (error) {
      toast.error('Failed to remove dependency');
    }
  };

  // Clear all dependencies handler
  const handleClearAllDependencies = useCallback(async () => {
    if (dependencies.length === 0) return;
    
    try {
      // Delete all dependencies one by one
      for (const dep of dependencies) {
        await deleteDependency.mutateAsync(dep.id);
      }
      toast.success(`Cleared ${dependencies.length} dependencies`);
    } catch (error) {
      toast.error('Failed to clear dependencies');
    }
  }, [dependencies, deleteDependency]);

  // Task selection handlers
  const handleTaskSelect = useCallback((taskId: string, selected: boolean) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    } else {
      setSelectedTaskIds(new Set());
    }
  }, [filteredTasks]);

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const handleClearFilters = useCallback(() => {
    const hasActiveFilters = searchQuery.trim() || statusFilter !== 'all' || ownerFilter !== 'all' || colorFilter.length > 0 || dateRangeStart || dateRangeEnd;
    setSearchQuery('');
    setStatusFilter('all');
    setOwnerFilter('all');
    setColorFilter([]);
    setDateRangeStart(null);
    setDateRangeEnd(null);
    if (hasActiveFilters) {
      toast.success('Filters cleared');
    }
  }, [searchQuery, statusFilter, ownerFilter, colorFilter, dateRangeStart, dateRangeEnd]);

  // Date range change handler
  const handleDateRangeChange = useCallback((start: Date | null, end: Date | null) => {
    setDateRangeStart(start);
    setDateRangeEnd(end);
  }, []);

  // Filter preset handlers
  const handleSavePreset = useCallback((name: string) => {
    savePreset(name, { 
      searchQuery, 
      statusFilter, 
      ownerFilter, 
      colorFilter,
      dateRangeStart: dateRangeStart?.toISOString().split('T')[0] ?? null,
      dateRangeEnd: dateRangeEnd?.toISOString().split('T')[0] ?? null
    });
    toast.success(`Saved preset "${name}"`);
  }, [savePreset, searchQuery, statusFilter, ownerFilter, colorFilter, dateRangeStart, dateRangeEnd]);

  const handleApplyPreset = useCallback((preset: FilterPreset) => {
    setSearchQuery(preset.searchQuery);
    setStatusFilter(preset.statusFilter);
    setOwnerFilter(preset.ownerFilter);
    setColorFilter(preset.colorFilter);
    setDateRangeStart(preset.dateRangeStart ? new Date(preset.dateRangeStart) : null);
    setDateRangeEnd(preset.dateRangeEnd ? new Date(preset.dateRangeEnd) : null);
    toast.success(`Applied preset "${preset.name}"`);
  }, []);

  const handleDeletePreset = useCallback((presetId: string) => {
    deletePreset(presetId);
    toast.success('Preset deleted');
  }, [deletePreset]);

  const handleBulkColorChange = useCallback(async (color: string | null) => {
    if (selectedTaskIds.size === 0) return;
    
    try {
      await bulkUpdateTasks.mutateAsync({
        ids: Array.from(selectedTaskIds),
        updates: { color }
      });
      toast.success(`Updated color for ${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? 's' : ''}`);
      setSelectedTaskIds(new Set());
    } catch (error) {
      toast.error('Failed to update task colors');
    }
  }, [selectedTaskIds, bulkUpdateTasks]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTaskIds.size === 0) return;
    
    try {
      await bulkDeleteTasks.mutateAsync(Array.from(selectedTaskIds));
      toast.success(`Deleted ${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? 's' : ''}`);
      setSelectedTaskIds(new Set());
    } catch (error) {
      toast.error('Failed to delete tasks');
    }
  }, [selectedTaskIds, bulkDeleteTasks]);

  // Reorder handler
  const handleReorderTask = useCallback(async (taskId: string, newIndex: number) => {
    try {
      await reorderTasks.mutateAsync({ taskId, newIndex, tasks });
      toast.success('Task order updated');
    } catch (error) {
      toast.error('Failed to reorder task');
    }
  }, [reorderTasks, tasks]);

  // Duplicate task handler
  const handleDuplicateTask = useCallback(async (task: Task) => {
    try {
      await duplicateTask.mutateAsync(task);
      toast.success(`Duplicated "${task.name}"`);
    } catch (error) {
      toast.error('Failed to duplicate task');
    }
  }, [duplicateTask]);

  // Undo handler
  const handleUndo = useCallback(async () => {
    const action = popUndo();
    if (!action) return;

    try {
      switch (action.type) {
        case 'task_create':
          // Undo create = delete the task
          if (action.taskId) {
            await deleteTask.mutateAsync(action.taskId);
            toast.success('Undone: Task creation');
          }
          break;
        case 'task_update':
        case 'task_toggle_status':
          // Undo update = restore previous state
          if (action.taskId && action.previousTask) {
            await updateTask.mutateAsync({ id: action.taskId, ...action.previousTask });
            toast.success('Undone: Task changes');
          }
          break;
        case 'task_delete':
          // Undo delete = recreate the task
          if (action.previousTask) {
            const { id, created_at, updated_at, ...taskData } = action.previousTask as Task;
            await createTask.mutateAsync(taskData as any);
            toast.success('Undone: Task deletion');
          }
          break;
        case 'dependency_create':
          // Undo create = delete the dependency
          if (action.dependencyId) {
            await deleteDependency.mutateAsync(action.dependencyId);
            toast.success('Undone: Dependency creation');
          }
          break;
        case 'dependency_update':
          // Undo update = restore previous state
          if (action.dependencyId && action.previousDependency) {
            await updateDependency.mutateAsync({ id: action.dependencyId, ...action.previousDependency });
            toast.success('Undone: Dependency type change');
          }
          break;
        case 'dependency_delete':
          // Undo delete = recreate the dependency
          if (action.dependency) {
            const { id, created_at, ...depData } = action.dependency as any;
            await createDependency.mutateAsync(depData);
            toast.success('Undone: Dependency deletion');
          }
          break;
      }
    } catch (error) {
      toast.error('Failed to undo action');
    }
  }, [popUndo, deleteTask, updateTask, createTask, deleteDependency, createDependency, updateDependency]);

  // Redo handler
  const handleRedo = useCallback(async () => {
    const action = popRedo();
    if (!action) return;

    try {
      switch (action.type) {
        case 'task_create':
          // Redo create = create the task again
          if (action.newTask) {
            const { id, created_at, updated_at, ...taskData } = action.newTask as Task;
            await createTask.mutateAsync(taskData as any);
            toast.success('Redone: Task creation');
          }
          break;
        case 'task_update':
        case 'task_toggle_status':
          // Redo update = apply the new state
          if (action.taskId && action.newTask) {
            await updateTask.mutateAsync({ id: action.taskId, ...action.newTask });
            toast.success('Redone: Task changes');
          }
          break;
        case 'task_delete':
          // Redo delete = delete the task again
          if (action.taskId) {
            await deleteTask.mutateAsync(action.taskId);
            toast.success('Redone: Task deletion');
          }
          break;
        case 'dependency_create':
          // Redo create = create the dependency again
          if (action.dependency) {
            const { id, created_at, ...depData } = action.dependency as any;
            await createDependency.mutateAsync(depData);
            toast.success('Redone: Dependency creation');
          }
          break;
        case 'dependency_update':
          // Redo update = apply the new state
          if (action.dependencyId && action.newDependency) {
            await updateDependency.mutateAsync({ id: action.dependencyId, ...action.newDependency });
            toast.success('Redone: Dependency type change');
          }
          break;
        case 'dependency_delete':
          // Redo delete = delete the dependency again
          if (action.dependencyId) {
            await deleteDependency.mutateAsync(action.dependencyId);
            toast.success('Redone: Dependency deletion');
          }
          break;
      }
    } catch (error) {
      toast.error('Failed to redo action');
    }
  }, [popRedo, deleteTask, updateTask, createTask, deleteDependency, createDependency, updateDependency]);

  // Color keyboard shortcuts (1-9 for colors, 0 to clear)
  const colorShortcuts = useMemo(() => {
    const shortcuts = [
      // Clear color with 0 key
      { 
        key: '0', 
        handler: () => selectedTaskIds.size > 0 && handleBulkColorChange(null), 
        description: 'Clear color' 
      },
      // 1-9 for first 9 color presets
      ...TASK_COLOR_PRESETS.slice(0, 9).map((preset, index) => ({
        key: String(index + 1),
        handler: () => selectedTaskIds.size > 0 && handleBulkColorChange(preset.key),
        description: `Set ${preset.label} color`
      }))
    ];
    return shortcuts;
  }, [selectedTaskIds.size, handleBulkColorChange]);

  // Focus search handler
  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  // Select all visible tasks handler
  const handleSelectAllVisible = useCallback(() => {
    if (filteredTasks.length === 0) return;
    
    const allFilteredIds = new Set(filteredTasks.map(t => t.id));
    const allSelected = filteredTasks.every(t => selectedTaskIds.has(t.id));
    
    if (allSelected) {
      // Deselect all if all are already selected
      setSelectedTaskIds(new Set());
      toast.success('Deselected all tasks');
    } else {
      // Select all visible tasks
      setSelectedTaskIds(allFilteredIds);
      toast.success(`Selected ${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''}`);
    }
  }, [filteredTasks, selectedTaskIds]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'z', ctrlKey: true, handler: handleUndo, description: 'Undo' },
      { key: 'y', ctrlKey: true, handler: handleRedo, description: 'Redo' },
      { key: 'z', ctrlKey: true, shiftKey: true, handler: handleRedo, description: 'Redo (alternative)' },
      { key: 'Escape', handler: handleClearFilters, description: 'Clear all filters' },
      { key: 'f', ctrlKey: true, handler: handleFocusSearch, description: 'Focus search' },
      { key: '/', handler: handleFocusSearch, description: 'Focus search (alternative)' },
      { key: 'a', ctrlKey: true, handler: handleSelectAllVisible, description: 'Select all visible tasks' },
      { key: '?', handler: () => setShowShortcutsModal(true), description: 'Show keyboard shortcuts' },
      // Color shortcuts only active when tasks are selected
      ...colorShortcuts
    ]
  });

  // Onboarding progress
  const onboarding = useOnboardingProgress({
    tasks,
    projectId: projectId ?? '',
    onAddTask: handleAddTask,
    onExport: exportAsPdf
  });

  // Baseline handlers
  const handleCreateBaseline = async (name: string, description?: string) => {
    try {
      await createBaseline.mutateAsync({ name, description, tasks });
      toast.success(`Baseline "${name}" saved with ${tasks.length} tasks`);
    } catch (error) {
      toast.error('Failed to save baseline');
    }
  };

  const handleDeleteBaseline = async (id: string) => {
    try {
      await deleteBaseline.mutateAsync(id);
      if (activeBaselineId === id) {
        setActiveBaselineId(null);
      }
      toast.success('Baseline deleted');
    } catch (error) {
      toast.error('Failed to delete baseline');
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Celebration confetti animation - hide during print */}
      <div className="print-hidden">
        <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      </div>
      
      {/* Keyboard shortcuts modal - hide during print */}
      <div className="print-hidden">
        <KeyboardShortcutsModal open={showShortcutsModal} onOpenChange={setShowShortcutsModal} />
      </div>
      
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">{project.name}</h1>
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowShortcutsModal(true)}
              className="hidden md:flex"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProgress(!showProgress)}
              className="hidden md:flex"
            >
              <Settings className="h-4 w-4 mr-2" />
              {showProgress ? 'Hide' : 'Show'} Progress
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Onboarding Checklist - hide during print */}
        {onboarding.shouldShow && (
          <div className="mb-6 print-hidden">
            <OnboardingChecklist
              steps={onboarding.steps}
              completedCount={onboarding.completedCount}
              totalSteps={onboarding.totalSteps}
              progressPercentage={onboarding.progressPercentage}
              onDismiss={onboarding.dismiss}
            />
          </div>
        )}

        <div className="flex gap-6">
          {/* Gantt Chart Area */}
          <div className={showProgress ? 'flex-1' : 'w-full'}>
            <div className="print-hidden">
              <GanttToolbar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                chartViewType={chartViewType}
                onChartViewTypeChange={setChartViewType}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                onAddTask={handleAddTask}
                onAddMilestone={handleAddMilestone}
                milestoneCount={milestones.length}
                onExportPdf={exportAsPdf}
                onExportPng={exportAsPng}
                onExportJpeg={exportAsJpeg}
                onExportExcel={handleExportExcel}
                onExportWord={handleExportWord}
                onExportCalendar={handleExportCalendar}
                onPrint={handlePrint}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                ownerFilter={ownerFilter}
                onOwnerFilterChange={setOwnerFilter}
                colorFilter={colorFilter}
                onColorFilterChange={setColorFilter}
                dateRangeStart={dateRangeStart}
                dateRangeEnd={dateRangeEnd}
                onDateRangeChange={handleDateRangeChange}
                onClearFilters={handleClearFilters}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                owners={owners}
                isEmpty={tasks.length === 0}
                dependencyCount={dependencies.length}
                dependencyBreakdown={dependencyBreakdown}
                onClearAllDependencies={handleClearAllDependencies}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                undoDescription={lastUndoDescription}
                redoDescription={lastRedoDescription}
                filterPresets={filterPresets}
                onSavePreset={handleSavePreset}
                onApplyPreset={handleApplyPreset}
                onDeletePreset={handleDeletePreset}
                searchInputRef={searchInputRef}
                showCriticalPath={showCriticalPath}
                onShowCriticalPathChange={setShowCriticalPath}
                criticalPathCount={criticalPathTaskIds.size}
                baselines={baselines}
                activeBaselineId={activeBaselineId}
                onBaselineChange={setActiveBaselineId}
                onCreateBaseline={handleCreateBaseline}
                onDeleteBaseline={handleDeleteBaseline}
                taskCount={tasks.length}
              />
            </div>

            <div className="mt-4 print-container" ref={chartRef}>
              {chartViewType === 'gantt' ? (
                <GanttChart
                  tasks={filteredTasks}
                  dependencies={dependencies}
                  milestones={milestones}
                  viewMode={viewMode}
                  groupBy={groupBy}
                  onTaskClick={handleTaskClick}
                  onToggleComplete={handleToggleComplete}
                  onAddTask={handleAddTask}
                  onTaskDateChange={handleTaskDateChange}
                  onCreateDependency={handleCreateDependency}
                  onUpdateDependency={handleUpdateDependency}
                  onDeleteDependency={handleDeleteDependency}
                  onMilestoneClick={handleMilestoneClick}
                  selectedTaskIds={selectedTaskIds}
                  onTaskSelect={handleTaskSelect}
                  onSelectAll={handleSelectAll}
                  onReorderTask={handleReorderTask}
                  searchQuery={searchQuery}
                  criticalPathTaskIds={criticalPathTaskIds}
                  baselineTasks={activeBaselineTasks}
                  taskSlackMap={taskSlackMap}
                />
              ) : (
                <ResourceWorkloadView
                  tasks={filteredTasks}
                  viewMode={viewMode}
                  onTaskClick={handleTaskClick}
                />
              )}
            </div>
          </div>

          {/* Progress Panel - hide during print */}
          {showProgress && (
            <div className="w-80 flex-shrink-0 hidden md:block print-hidden">
              <ProgressPanel tasks={tasks} />
            </div>
          )}
        </div>
      </main>

      {/* Bulk Actions Bar - hide during print */}
      <div className="print-hidden">
        <BulkActionsBar
          selectedCount={selectedTaskIds.size}
          onClearSelection={handleClearSelection}
          onBulkColorChange={handleBulkColorChange}
          onBulkDelete={handleBulkDelete}
        />
      </div>

      {/* Task Form Dialog - hide during print */}
      <div className="print-hidden">
        <TaskForm
          open={isTaskFormOpen}
          onOpenChange={setIsTaskFormOpen}
          onSubmit={handleTaskSubmit}
          onDuplicate={handleDuplicateTask}
          projectId={projectId!}
          task={selectedTask}
          isLoading={createTask.isPending || updateTask.isPending}
        />
      </div>

      {/* Milestone Form Dialog - hide during print */}
      <div className="print-hidden">
        <MilestoneForm
          projectId={projectId!}
          milestone={selectedMilestone}
          open={isMilestoneFormOpen}
          onOpenChange={setIsMilestoneFormOpen}
          onSubmit={handleMilestoneSubmit}
          onDelete={handleDeleteMilestone}
        />
      </div>
    </div>
  );
}
