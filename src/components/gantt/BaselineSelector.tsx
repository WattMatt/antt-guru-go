import { useState } from 'react';
import { Baseline, Task } from '@/types/gantt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { History, Plus, Trash2, Eye, EyeOff, ChevronDown, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BaselineSelectorProps {
  baselines: Baseline[];
  activeBaselineId: string | null;
  onBaselineChange: (baselineId: string | null) => void;
  onCreateBaseline: (name: string, description?: string) => void;
  onUpdateBaseline: (id: string, name: string, description?: string | null) => void;
  onDeleteBaseline: (id: string) => void;
  taskCount: number;
  disabled?: boolean;
}

export function BaselineSelector({
  baselines,
  activeBaselineId,
  onBaselineChange,
  onCreateBaseline,
  onUpdateBaseline,
  onDeleteBaseline,
  taskCount,
  disabled = false
}: BaselineSelectorProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBaseline, setEditingBaseline] = useState<Baseline | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const activeBaseline = baselines.find(b => b.id === activeBaselineId);

  const handleCreate = () => {
    if (name.trim()) {
      onCreateBaseline(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      setCreateDialogOpen(false);
    }
  };

  const handleEdit = (baseline: Baseline, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBaseline(baseline);
    setName(baseline.name);
    setDescription(baseline.description || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingBaseline && name.trim()) {
      onUpdateBaseline(editingBaseline.id, name.trim(), description.trim() || null);
      setEditingBaseline(null);
      setName('');
      setDescription('');
      setEditDialogOpen(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteBaseline(id);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={activeBaselineId ? "secondary" : "outline"} 
                size="sm" 
                className="gap-1.5"
                disabled={disabled}
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {activeBaseline ? activeBaseline.name : 'Baseline'}
                </span>
                {baselines.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                    {baselines.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Compare current timeline against a saved baseline</p>
          </TooltipContent>
        </Tooltip>
        
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Baselines</span>
            {activeBaselineId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onBaselineChange(null)}
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Hide
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {baselines.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              No baselines saved yet
            </div>
          ) : (
            baselines.map((baseline) => (
              <DropdownMenuItem
                key={baseline.id}
                className={cn(
                  "flex items-center justify-between cursor-pointer",
                  activeBaselineId === baseline.id && "bg-accent"
                )}
                onClick={() => onBaselineChange(baseline.id === activeBaselineId ? null : baseline.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {activeBaselineId === baseline.id && (
                      <Eye className="h-3 w-3 text-primary shrink-0" />
                    )}
                    <span className="truncate font-medium">{baseline.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(baseline.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-accent"
                    onClick={(e) => handleEdit(baseline, e)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => handleDelete(baseline.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()}
                disabled={taskCount === 0}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Save Current as Baseline
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Baseline</DialogTitle>
                <DialogDescription>
                  Save a snapshot of your current timeline to compare against future changes.
                  {taskCount > 0 && (
                    <span className="block mt-1 text-foreground">
                      {taskCount} task{taskCount !== 1 ? 's' : ''} will be saved.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="baseline-name">Name</Label>
                  <Input
                    id="baseline-name"
                    placeholder="e.g., Original Plan, Sprint 1 Baseline"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseline-description">Description (optional)</Label>
                  <Textarea
                    id="baseline-description"
                    placeholder="Add notes about this baseline..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!name.trim()}>
                  Save Baseline
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Baseline Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Baseline</DialogTitle>
            <DialogDescription>
              Update the name and description for this baseline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-baseline-name">Name</Label>
              <Input
                id="edit-baseline-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-baseline-description">Description (optional)</Label>
              <Textarea
                id="edit-baseline-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
