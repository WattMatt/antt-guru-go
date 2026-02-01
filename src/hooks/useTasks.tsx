import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskDependency, TaskStatus } from '@/types/gantt';

export function useTasks(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId
  });

  const dependenciesQuery = useQuery({
    queryKey: ['dependencies', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select('*')
        .in('predecessor_id', tasksQuery.data?.map(t => t.id) ?? []);

      if (error) throw error;
      return data as TaskDependency[];
    },
    enabled: !!projectId && !!tasksQuery.data
  });

  const createTask = useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
    }
  });

  const createDependency = useMutation({
    mutationFn: async (dependency: Omit<TaskDependency, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .insert(dependency)
        .select()
        .single();

      if (error) throw error;
      return data as TaskDependency;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
    }
  });

  const updateDependency = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaskDependency> & { id: string }) => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TaskDependency;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
    }
  });

  const deleteDependency = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
    }
  });

  const toggleTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const newStatus: TaskStatus = status === 'completed' ? 'not_started' : 'completed';
      const newProgress = newStatus === 'completed' ? 100 : 0;
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: newStatus, progress: newProgress })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  const bulkUpdateTasks = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Task> }) => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return data as Task;
        })
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  const bulkDeleteTasks = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map(async (id) => {
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

          if (error) throw error;
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
    }
  });

  const reorderTasks = useMutation({
    mutationFn: async ({ taskId, newIndex, tasks: currentTasks }: { taskId: string; newIndex: number; tasks: Task[] }) => {
      const currentIndex = currentTasks.findIndex(t => t.id === taskId);
      if (currentIndex === -1 || currentIndex === newIndex) return;

      // Create new order array
      const reorderedTasks = [...currentTasks];
      const [movedTask] = reorderedTasks.splice(currentIndex, 1);
      reorderedTasks.splice(newIndex, 0, movedTask);

      // Update sort_order for all affected tasks
      const updates = reorderedTasks.map((task, index) => ({
        id: task.id,
        sort_order: index
      }));

      // Batch update all sort_orders
      await Promise.all(
        updates.map(async ({ id, sort_order }) => {
          const { error } = await supabase
            .from('tasks')
            .update({ sort_order })
            .eq('id', id);

          if (error) throw error;
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  const duplicateTask = useMutation({
    mutationFn: async (task: Task) => {
      // Get the current max sort_order for proper positioning
      const { data: tasks } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('project_id', task.project_id)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxSortOrder = tasks?.[0]?.sort_order ?? 0;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: task.project_id,
          name: `${task.name} (Copy)`,
          description: task.description,
          start_date: task.start_date,
          end_date: task.end_date,
          status: 'not_started',
          owner: task.owner,
          progress: 0,
          sort_order: maxSortOrder + 1,
          color: task.color
        })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  return {
    tasks: tasksQuery.data ?? [],
    dependencies: dependenciesQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    createTask,
    updateTask,
    deleteTask,
    createDependency,
    updateDependency,
    deleteDependency,
    toggleTaskStatus,
    bulkUpdateTasks,
    bulkDeleteTasks,
    reorderTasks,
    duplicateTask
  };
}
