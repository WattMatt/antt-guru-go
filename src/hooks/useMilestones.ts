import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  date: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export function useMilestones(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const milestonesQuery = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!projectId,
  });

  const createMilestone = useMutation({
    mutationFn: async (milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('milestones')
        .insert(milestone)
        .select()
        .single();
      
      if (error) throw error;
      return data as Milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
    },
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Milestone> & { id: string }) => {
      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
    },
  });

  return {
    milestones: milestonesQuery.data ?? [],
    isLoading: milestonesQuery.isLoading,
    createMilestone,
    updateMilestone,
    deleteMilestone,
  };
}
