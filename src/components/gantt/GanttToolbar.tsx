import { ViewMode, DependencyType } from '@/types/gantt';
import { TASK_COLOR_PRESETS, TaskColorKey } from '@/lib/taskColors';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, FileSpreadsheet, FileText, File, Undo2, Redo2, Info, Trash2, Palette, X } from 'lucide-react';
import { ColorLegend } from './ColorLegend';
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
  colorFilter: string;
  onColorFilterChange: (color: string) => void;
  onClearFilters?: () => void;
  owners: string[];
  isEmpty?: boolean;
  dependencyCount?: number;
  dependencyBreakdown?: DependencyBreakdown;
  onClearAllDependencies?: () => void;
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
  colorFilter,
  onColorFilterChange,
  onClearFilters,
  owners,
  isEmpty = false,
  dependencyCount = 0,
  dependencyBreakdown,
  onClearAllDependencies,
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
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Dependency Types</h4>
                      <div className="space-y-1 text-sm">
                        <div className={cn(
                          "flex items-start gap-3 p-2 rounded-md transition-colors",
                          dependencyBreakdown && dependencyBreakdown.finish_to_start > 0 
                            ? "bg-primary/5 border border-primary/20" 
                            : "opacity-60"
                        )}>
                          <span className={cn(
                            "flex-shrink-0 w-7 h-5 rounded text-[10px] font-bold flex items-center justify-center",
                            dependencyBreakdown && dependencyBreakdown.finish_to_start > 0
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>FS</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Finish to Start</p>
                              {dependencyBreakdown && dependencyBreakdown.finish_to_start > 0 && (
                                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                  {dependencyBreakdown.finish_to_start}
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs">Successor starts after predecessor finishes</p>
                          </div>
                        </div>
                        <div className={cn(
                          "flex items-start gap-3 p-2 rounded-md transition-colors",
                          dependencyBreakdown && dependencyBreakdown.start_to_start > 0 
                            ? "bg-primary/5 border border-primary/20" 
                            : "opacity-60"
                        )}>
                          <span className={cn(
                            "flex-shrink-0 w-7 h-5 rounded text-[10px] font-bold flex items-center justify-center",
                            dependencyBreakdown && dependencyBreakdown.start_to_start > 0
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>SS</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Start to Start</p>
                              {dependencyBreakdown && dependencyBreakdown.start_to_start > 0 && (
                                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                  {dependencyBreakdown.start_to_start}
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs">Both tasks start together</p>
                          </div>
                        </div>
                        <div className={cn(
                          "flex items-start gap-3 p-2 rounded-md transition-colors",
                          dependencyBreakdown && dependencyBreakdown.finish_to_finish > 0 
                            ? "bg-primary/5 border border-primary/20" 
                            : "opacity-60"
                        )}>
                          <span className={cn(
                            "flex-shrink-0 w-7 h-5 rounded text-[10px] font-bold flex items-center justify-center",
                            dependencyBreakdown && dependencyBreakdown.finish_to_finish > 0
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>FF</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Finish to Finish</p>
                              {dependencyBreakdown && dependencyBreakdown.finish_to_finish > 0 && (
                                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                  {dependencyBreakdown.finish_to_finish}
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs">Both tasks finish together</p>
                          </div>
                        </div>
                        <div className={cn(
                          "flex items-start gap-3 p-2 rounded-md transition-colors",
                          dependencyBreakdown && dependencyBreakdown.start_to_finish > 0 
                            ? "bg-primary/5 border border-primary/20" 
                            : "opacity-60"
                        )}>
                          <span className={cn(
                            "flex-shrink-0 w-7 h-5 rounded text-[10px] font-bold flex items-center justify-center",
                            dependencyBreakdown && dependencyBreakdown.start_to_finish > 0
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>SF</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Start to Finish</p>
                              {dependencyBreakdown && dependencyBreakdown.start_to_finish > 0 && (
                                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                  {dependencyBreakdown.start_to_finish}
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs">Successor finishes when predecessor starts</p>
                          </div>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Tip:</span> Drag from the circle handle on a task bar to another task to create a dependency link.
                        </p>
                      </div>
                      {onClearAllDependencies && dependencyCount > 0 && (
                        <>
                          <Separator className="my-3" />
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full"
                            onClick={onClearAllDependencies}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear All Dependencies
                          </Button>
                        </>
                      )}
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

          <ColorLegend />

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
                <Select value={colorFilter} onValueChange={onColorFilterChange}>
                  <SelectTrigger className="w-[140px]">
                    <div className="flex items-center gap-2">
                      {colorFilter !== 'all' && colorFilter !== 'none' && (
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ 
                            backgroundColor: TASK_COLOR_PRESETS.find(p => p.key === colorFilter)?.swatchColor 
                          }}
                        />
                      )}
                      <SelectValue placeholder="All Colors" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colors</SelectItem>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full border border-muted-foreground/30"
                          style={{ background: 'linear-gradient(135deg, #e5e7eb 50%, #9ca3af 50%)' }}
                        />
                        <span>No Color (Status)</span>
                      </div>
                    </SelectItem>
                    {TASK_COLOR_PRESETS.map((preset) => (
                      <SelectItem key={preset.key} value={preset.key}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: preset.swatchColor }}
                          />
                          <span>{preset.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter tasks by assigned color</p>
            </TooltipContent>
          </Tooltip>

          {/* Clear Filters button - only show when filters are active */}
          {(statusFilter !== 'all' || ownerFilter !== 'all' || colorFilter !== 'all') && onClearFilters && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset all filters</p>
              </TooltipContent>
            </Tooltip>
          )}

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
