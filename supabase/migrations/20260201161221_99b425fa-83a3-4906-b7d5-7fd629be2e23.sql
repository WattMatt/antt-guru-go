-- Create milestones table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Create policies for user access (through project ownership)
CREATE POLICY "Users can view milestones in their projects"
ON public.milestones
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = milestones.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create milestones in their projects"
ON public.milestones
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = milestones.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update milestones in their projects"
ON public.milestones
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = milestones.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete milestones in their projects"
ON public.milestones
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = milestones.project_id
  AND projects.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();