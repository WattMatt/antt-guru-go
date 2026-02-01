-- Add UPDATE policy for baselines table
CREATE POLICY "Users can update baselines in their projects" 
ON public.baselines 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = baselines.project_id) AND (projects.user_id = auth.uid()))))
WITH CHECK (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = baselines.project_id) AND (projects.user_id = auth.uid()))));