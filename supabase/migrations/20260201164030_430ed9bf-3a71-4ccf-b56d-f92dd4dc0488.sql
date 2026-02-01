-- Create baselines table to store baseline metadata
CREATE TABLE public.baselines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create baseline_tasks table to store task snapshots
CREATE TABLE public.baseline_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baseline_id UUID NOT NULL REFERENCES public.baselines(id) ON DELETE CASCADE,
  task_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for baselines
CREATE POLICY "Users can view baselines in their projects"
ON public.baselines
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = baselines.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create baselines in their projects"
ON public.baselines
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = baselines.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete baselines in their projects"
ON public.baselines
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = baselines.project_id
  AND projects.user_id = auth.uid()
));

-- RLS policies for baseline_tasks
CREATE POLICY "Users can view baseline tasks in their projects"
ON public.baseline_tasks
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM baselines b
  JOIN projects p ON p.id = b.project_id
  WHERE b.id = baseline_tasks.baseline_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create baseline tasks in their projects"
ON public.baseline_tasks
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM baselines b
  JOIN projects p ON p.id = b.project_id
  WHERE b.id = baseline_tasks.baseline_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete baseline tasks in their projects"
ON public.baseline_tasks
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM baselines b
  JOIN projects p ON p.id = b.project_id
  WHERE b.id = baseline_tasks.baseline_id
  AND p.user_id = auth.uid()
));