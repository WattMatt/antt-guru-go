import { useState } from 'react';
import { Task, TaskStatus } from '@/types/gantt';
import { TASK_COLOR_PRESETS, TaskColorKey } from '@/lib/taskColors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { CalendarIcon, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  projectId: string;
  task?: Task;
  isLoading?: boolean;
}

export function TaskForm({ open, onOpenChange, onSubmit, projectId, task, isLoading }: TaskFormProps) {
  const [name, setName] = useState(task?.name ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    task?.start_date ? new Date(task.start_date) : new Date()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    task?.end_date ? new Date(task.end_date) : new Date()
  );
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'not_started');
  const [owner, setOwner] = useState(task?.owner ?? '');
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [color, setColor] = useState<string | null>(task?.color ?? null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !startDate || !endDate) {
      return;
    }

    onSubmit({
      project_id: projectId,
      name: name.trim(),
      description: description.trim() || null,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      status,
      owner: owner.trim() || null,
      progress,
      sort_order: task?.sort_order ?? 0,
      color
    });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setStartDate(new Date());
    setEndDate(new Date());
    setStatus('not_started');
    setOwner('');
    setProgress(0);
    setColor(null);
  };

  return (
    <TooltipProvider delayDuration={300}>
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen && !task) resetForm();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{task ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            <DialogDescription>
              {task ? 'Update the task details below.' : 'Fill in the details to create a new task.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Task Name *</Label>
              <Input
                id="task-name"
                placeholder="Enter task name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Give your task a clear, descriptive name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Task description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Tasks appear on the timeline based on these dates
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value: TaskStatus) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Track progress from 'Not Started' to 'Completed'
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-owner">Owner</Label>
                <Input
                  id="task-owner"
                  placeholder="Assign to..."
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Assign responsibility to team members
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-progress">Progress: {progress}%</Label>
              <Input
                id="task-progress"
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Update as work progresses (0-100%)
              </p>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {/* Default/Auto option */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setColor(null)}
                      className={cn(
                        "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                        color === null 
                          ? "border-primary ring-2 ring-primary/30" 
                          : "border-muted-foreground/30 hover:border-muted-foreground/50"
                      )}
                      style={{ background: 'linear-gradient(135deg, #e5e7eb 50%, #9ca3af 50%)' }}
                    >
                      {color === null && <X className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Auto (uses status color)</p>
                  </TooltipContent>
                </Tooltip>

                {/* Color presets */}
                {TASK_COLOR_PRESETS.map((preset) => (
                  <Tooltip key={preset.key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setColor(preset.key)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                          color === preset.key 
                            ? "border-primary ring-2 ring-primary/30" 
                            : "border-transparent hover:scale-110"
                        )}
                        style={{ backgroundColor: preset.swatchColor }}
                      >
                        {color === preset.key && (
                          <Check className={cn("h-3.5 w-3.5", preset.textClass)} />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{preset.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Assign a color to visually categorize this task
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
