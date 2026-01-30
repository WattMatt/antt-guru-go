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
    toggleTaskStatus
  };
}
