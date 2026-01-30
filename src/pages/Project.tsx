import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useUndoRedo, UndoableAction } from '@/hooks/useUndoRedo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Task, ViewMode, DependencyType } from '@/types/gantt';
import { GanttChart } from '@/components/gantt/GanttChart';
import { GanttToolbar } from '@/components/gantt/GanttToolbar';
import { TaskForm } from '@/components/gantt/TaskForm';
import { ProgressPanel } from '@/components/gantt/ProgressPanel';
import { OnboardingChecklist } from '@/components/gantt/OnboardingChecklist';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, BarChart3, Settings } from 'lucide-react';

export default function Project() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();
  const { tasks, dependencies, createTask, updateTask, deleteTask, toggleTaskStatus, createDependency, updateDependency, deleteDependency } = useTasks(projectId);
  
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

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showProgress, setShowProgress] = useState(true);

  const project = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const owners = useMemo(() => {
    const uniqueOwners = new Set(tasks.map(t => t.owner).filter(Boolean) as string[]);
    return Array.from(uniqueOwners);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (ownerFilter !== 'all' && task.owner !== ownerFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, ownerFilter]);

  const handleAddTask = () => {
    setSelectedTask(undefined);
    setIsTaskFormOpen(true);
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

  const handleExportPdf = () => {
    toast.info('PDF export coming soon!');
  };

  const handleExportExcel = () => {
    toast.info('Excel export coming soon!');
  };

  const handleExportWord = () => {
    toast.info('Word export coming soon!');
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

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'z', ctrlKey: true, handler: handleUndo, description: 'Undo' },
      { key: 'y', ctrlKey: true, handler: handleRedo, description: 'Redo' },
      { key: 'z', ctrlKey: true, shiftKey: true, handler: handleRedo, description: 'Redo (alternative)' }
    ]
  });

  // Onboarding progress
  const onboarding = useOnboardingProgress({
    tasks,
    projectId: projectId ?? '',
    onAddTask: handleAddTask,
    onExport: handleExportPdf
  });

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
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Onboarding Checklist */}
        {onboarding.shouldShow && (
          <div className="mb-6">
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
            <GanttToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onAddTask={handleAddTask}
              onExportPdf={handleExportPdf}
              onExportExcel={handleExportExcel}
              onExportWord={handleExportWord}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              ownerFilter={ownerFilter}
              onOwnerFilterChange={setOwnerFilter}
              owners={owners}
              isEmpty={tasks.length === 0}
              dependencyCount={dependencies.length}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              undoDescription={lastUndoDescription}
              redoDescription={lastRedoDescription}
            />

            <div className="mt-4">
              <GanttChart
                tasks={filteredTasks}
                dependencies={dependencies}
                viewMode={viewMode}
                onTaskClick={handleTaskClick}
                onToggleComplete={handleToggleComplete}
                onAddTask={handleAddTask}
                onTaskDateChange={handleTaskDateChange}
                onCreateDependency={handleCreateDependency}
                onUpdateDependency={handleUpdateDependency}
                onDeleteDependency={handleDeleteDependency}
              />
            </div>
          </div>

          {/* Progress Panel */}
          {showProgress && (
            <div className="w-80 flex-shrink-0 hidden md:block">
              <ProgressPanel tasks={tasks} />
            </div>
          )}
        </div>
      </main>

      {/* Task Form Dialog */}
      <TaskForm
        open={isTaskFormOpen}
        onOpenChange={setIsTaskFormOpen}
        onSubmit={handleTaskSubmit}
        projectId={projectId!}
        task={selectedTask}
        isLoading={createTask.isPending || updateTask.isPending}
      />
    </div>
  );
}
