import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Baseline, BaselineTask, Task } from '@/types/gantt';

export function useBaselines(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const baselinesQuery = useQuery({
    queryKey: ['baselines', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('baselines')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Baseline[];
    },
    enabled: !!projectId
  });

  const baselineTasksQuery = useQuery({
    queryKey: ['baseline_tasks', projectId],
    queryFn: async () => {
      if (!baselinesQuery.data?.length) return [];
      
      const baselineIds = baselinesQuery.data.map(b => b.id);
      const { data, error } = await supabase
        .from('baseline_tasks')
        .select('*')
        .in('baseline_id', baselineIds);

      if (error) throw error;
      return data as BaselineTask[];
    },
    enabled: !!projectId && !!baselinesQuery.data
  });

  const createBaseline = useMutation({
    mutationFn: async ({ name, description, tasks }: { 
      name: string; 
      description?: string; 
      tasks: Task[] 
    }) => {
      // Create baseline
      const { data: baseline, error: baselineError } = await supabase
        .from('baselines')
        .insert({
          project_id: projectId!,
          name,
          description: description || null
        })
        .select()
        .single();

      if (baselineError) throw baselineError;

      // Create baseline tasks snapshot
      if (tasks.length > 0) {
        const baselineTasks = tasks.map(task => ({
          baseline_id: baseline.id,
          task_id: task.id,
          name: task.name,
          start_date: task.start_date,
          end_date: task.end_date
        }));

        const { error: tasksError } = await supabase
          .from('baseline_tasks')
          .insert(baselineTasks);

        if (tasksError) throw tasksError;
      }

      return baseline as Baseline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines', projectId] });
      queryClient.invalidateQueries({ queryKey: ['baseline_tasks', projectId] });
    }
  });

  const deleteBaseline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('baselines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines', projectId] });
      queryClient.invalidateQueries({ queryKey: ['baseline_tasks', projectId] });
    }
  });

  // Get tasks for a specific baseline
  const getBaselineTasks = (baselineId: string): BaselineTask[] => {
    return baselineTasksQuery.data?.filter(t => t.baseline_id === baselineId) ?? [];
  };

  return {
    baselines: baselinesQuery.data ?? [],
    baselineTasks: baselineTasksQuery.data ?? [],
    isLoading: baselinesQuery.isLoading,
    createBaseline,
    deleteBaseline,
    getBaselineTasks
  };
}
