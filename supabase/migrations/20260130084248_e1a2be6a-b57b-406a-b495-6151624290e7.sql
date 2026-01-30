-- Add UPDATE policy for task_dependencies (currently missing)
CREATE POLICY "Users can update dependencies in their projects"
ON public.task_dependencies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_dependencies.predecessor_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_dependencies.predecessor_id
    AND p.user_id = auth.uid()
  )
);