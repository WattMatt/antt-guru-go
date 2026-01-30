import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { Task, ViewMode } from '@/types/gantt';
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
  const { tasks, dependencies, createTask, updateTask, deleteTask, toggleTaskStatus } = useTasks(projectId);

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
        await updateTask.mutateAsync({ id: selectedTask.id, ...taskData });
        toast.success('Task updated successfully');
      } else {
        await createTask.mutateAsync({ ...taskData, sort_order: tasks.length });
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
    try {
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
