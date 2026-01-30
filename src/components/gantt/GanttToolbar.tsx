import { ViewMode, DependencyType } from '@/types/gantt';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, FileSpreadsheet, FileText, File, Undo2, Redo2, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface DependencyBreakdown {
  finish_to_start: number;
  start_to_start: number;
  finish_to_finish: number;
  start_to_finish: number;
}

interface GanttToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddTask: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onExportWord: () => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (owner: string) => void;
  owners: string[];
  isEmpty?: boolean;
  dependencyCount?: number;
  dependencyBreakdown?: DependencyBreakdown;
  // Undo/Redo
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  undoDescription?: string | null;
  redoDescription?: string | null;
}

export function GanttToolbar({
  viewMode,
  onViewModeChange,
  onAddTask,
  onExportPdf,
  onExportExcel,
  onExportWord,
  statusFilter,
  onStatusFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  owners,
  isEmpty = false,
  dependencyCount = 0,
  dependencyBreakdown,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  undoDescription,
  redoDescription
}: GanttToolbarProps) {
  // Build breakdown tooltip text
  const getBreakdownText = () => {
    if (!dependencyBreakdown) return `${dependencyCount} dependencies`;
    const parts: string[] = [];
    if (dependencyBreakdown.finish_to_start > 0) parts.push(`${dependencyBreakdown.finish_to_start} FS`);
    if (dependencyBreakdown.start_to_start > 0) parts.push(`${dependencyBreakdown.start_to_start} SS`);
    if (dependencyBreakdown.finish_to_finish > 0) parts.push(`${dependencyBreakdown.finish_to_finish} FF`);
    if (dependencyBreakdown.start_to_finish > 0) parts.push(`${dependencyBreakdown.start_to_finish} SF`);
    return parts.length > 0 ? parts.join(', ') : `${dependencyCount} dependencies`;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card border rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={onAddTask}
                className={cn(isEmpty && "animate-pulse")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start by adding tasks with names and dates</p>
            </TooltipContent>
          </Tooltip>

          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="h-9 w-9"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{undoDescription ? `Undo: ${undoDescription}` : 'Nothing to undo'}</p>
                <p className="text-xs text-muted-foreground">Ctrl+Z</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="h-9 w-9"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{redoDescription ? `Redo: ${redoDescription}` : 'Nothing to redo'}</p>
                <p className="text-xs text-muted-foreground">Ctrl+Y</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Dependency Legend - only show when dependencies exist */}
          {dependencyCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                      <Info className="h-4 w-4" />
                      <span className="hidden md:inline">Dependencies</span>
                      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {dependencyCount}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="start">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Dependency Types</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-7 h-5 rounded bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">FS</span>
                          <div>
                            <p className="font-medium">Finish to Start</p>
                            <p className="text-muted-foreground text-xs">Successor starts after predecessor finishes</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-7 h-5 rounded bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">SS</span>
                          <div>
                            <p className="font-medium">Start to Start</p>
                            <p className="text-muted-foreground text-xs">Both tasks start together</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-7 h-5 rounded bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">FF</span>
                          <div>
                            <p className="font-medium">Finish to Finish</p>
                            <p className="text-muted-foreground text-xs">Both tasks finish together</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-7 h-5 rounded bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">SF</span>
                          <div>
                            <p className="font-medium">Start to Finish</p>
                            <p className="text-muted-foreground text-xs">Successor finishes when predecessor starts</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getBreakdownText()}</p>
            </TooltipContent>
          </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">View:</span>
                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && onViewModeChange(value as ViewMode)}>
                  <ToggleGroupItem value="day" aria-label="Day view">
                    Day
                  </ToggleGroupItem>
                  <ToggleGroupItem value="week" aria-label="Week view">
                    Week
                  </ToggleGroupItem>
                  <ToggleGroupItem value="month" aria-label="Month view">
                    Month
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch views to see your timeline at different scales</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter tasks by their current status</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select value={ownerFilter} onValueChange={onOwnerFilterChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Owners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    {owners.length === 0 ? (
                      <SelectItem value="none" disabled className="text-muted-foreground">
                        Add owners to tasks first
                      </SelectItem>
                    ) : (
                      owners.map((owner) => (
                        <SelectItem key={owner} value={owner}>
                          {owner}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter tasks by assigned team member</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onExportPdf}>
                      <File className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onExportExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onExportWord}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as Word
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Generate professional reports in PDF, Excel, or Word</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
