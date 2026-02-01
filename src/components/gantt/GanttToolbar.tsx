import { useState } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ViewMode, DependencyType } from '@/types/gantt';
import { TASK_COLOR_PRESETS, TaskColorKey } from '@/lib/taskColors';
import { FilterPreset } from '@/hooks/useFilterPresets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, FileSpreadsheet, FileText, File, Undo2, Redo2, Info, Trash2, Palette, X, Search, Bookmark, BookmarkPlus, CalendarIcon } from 'lucide-react';
import { ColorLegend } from './ColorLegend';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
  colorFilter: string[];
  onColorFilterChange: (colors: string[]) => void;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
  onClearFilters?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
  // Filter presets
  filterPresets?: FilterPreset[];
  onSavePreset?: (name: string) => void;
  onApplyPreset?: (preset: FilterPreset) => void;
  onDeletePreset?: (presetId: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
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
  dateRangeStart,
  dateRangeEnd,
  onDateRangeChange,
  onClearFilters,
  searchQuery,
  onSearchChange,
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
  redoDescription,
  filterPresets = [],
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  searchInputRef
}: GanttToolbarProps) {
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const hasActiveFilters = searchQuery.trim() || statusFilter !== 'all' || ownerFilter !== 'all' || colorFilter.length > 0 || dateRangeStart || dateRangeEnd;

  const handleSavePreset = () => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim());
      setPresetName('');
      setSavePresetDialogOpen(false);
    }
  };

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
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 w-[180px] h-9"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters label with active count badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filters:</span>
            {hasActiveFilters && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 cursor-pointer transition-colors">
                    {[searchQuery.trim(), statusFilter !== 'all', ownerFilter !== 'all', colorFilter.length > 0, dateRangeStart || dateRangeEnd].filter(Boolean).length}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Active Filters</p>
                    <div className="space-y-1.5">
                      {searchQuery.trim() && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Search:</span>
                          <span className="font-medium truncate max-w-[120px]">"{searchQuery.trim()}"</span>
                        </div>
                      )}
                      {statusFilter !== 'all' && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium capitalize">{statusFilter.replace('_', ' ')}</span>
                        </div>
                      )}
                      {ownerFilter !== 'all' && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Owner:</span>
                          <span className="font-medium truncate max-w-[120px]">{ownerFilter}</span>
                        </div>
                      )}
                      {colorFilter.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Colors:</span>
                          <div className="flex items-center gap-1">
                            {colorFilter.slice(0, 4).map((colorKey) => {
                              const preset = TASK_COLOR_PRESETS.find(p => p.key === colorKey);
                              return preset ? (
                                <div
                                  key={colorKey}
                                  className="w-3 h-3 rounded-full border border-border"
                                  style={{ backgroundColor: preset.swatchColor }}
                                  title={preset.label}
                                />
                              ) : colorKey === 'none' ? (
                                <div
                                  key="none"
                                  className="w-3 h-3 rounded-full border border-border bg-muted"
                                  title="No color"
                                />
                              ) : null;
                            })}
                            {colorFilter.length > 4 && (
                              <span className="text-xs text-muted-foreground">+{colorFilter.length - 4}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {(dateRangeStart || dateRangeEnd) && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Date range:</span>
                          <span className="font-medium">
                            {dateRangeStart && dateRangeEnd ? (
                              `${format(dateRangeStart, 'MMM d')} - ${format(dateRangeEnd, 'MMM d')}`
                            ) : dateRangeStart ? (
                              `From ${format(dateRangeStart, 'MMM d')}`
                            ) : dateRangeEnd ? (
                              `Until ${format(dateRangeEnd, 'MMM d')}`
                            ) : null}
                          </span>
                        </div>
                      )}
                    </div>
                    {onClearFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearFilters}
                        className="w-full mt-2"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {colorFilter.length === 0 ? (
                          <span>All Colors</span>
                        ) : colorFilter.length === 1 ? (
                          <>
                            {colorFilter[0] === 'none' ? (
                              <div 
                                className="w-3 h-3 rounded-full border border-muted-foreground/30 flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #e5e7eb 50%, #9ca3af 50%)' }}
                              />
                            ) : (
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ 
                                  backgroundColor: TASK_COLOR_PRESETS.find(p => p.key === colorFilter[0])?.swatchColor 
                                }}
                              />
                            )}
                            <span className="truncate">
                              {colorFilter[0] === 'none' 
                                ? 'No Color' 
                                : TASK_COLOR_PRESETS.find(p => p.key === colorFilter[0])?.label}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex -space-x-1">
                              {colorFilter.slice(0, 3).map((c, i) => (
                                c === 'none' ? (
                                  <div 
                                    key={c}
                                    className="w-3 h-3 rounded-full border border-muted-foreground/30 ring-1 ring-background"
                                    style={{ background: 'linear-gradient(135deg, #e5e7eb 50%, #9ca3af 50%)', zIndex: 3 - i }}
                                  />
                                ) : (
                                  <div 
                                    key={c}
                                    className="w-3 h-3 rounded-full ring-1 ring-background"
                                    style={{ 
                                      backgroundColor: TASK_COLOR_PRESETS.find(p => p.key === c)?.swatchColor,
                                      zIndex: 3 - i
                                    }}
                                  />
                                )
                              ))}
                            </div>
                            <span>{colorFilter.length} colors</span>
                          </>
                        )}
                      </div>
                      <Palette className="h-4 w-4 flex-shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      {/* No Color option */}
                      <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
                        <input
                          type="checkbox"
                          checked={colorFilter.includes('none')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onColorFilterChange([...colorFilter, 'none']);
                            } else {
                              onColorFilterChange(colorFilter.filter(c => c !== 'none'));
                            }
                          }}
                          className="h-4 w-4 rounded border-input"
                        />
                        <div 
                          className="w-3 h-3 rounded-full border border-muted-foreground/30"
                          style={{ background: 'linear-gradient(135deg, #e5e7eb 50%, #9ca3af 50%)' }}
                        />
                        <span className="text-sm">No Color (Status)</span>
                      </label>
                      
                      <Separator className="my-1" />
                      
                      {/* Color presets */}
                      {TASK_COLOR_PRESETS.map((preset) => (
                        <label 
                          key={preset.key} 
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={colorFilter.includes(preset.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onColorFilterChange([...colorFilter, preset.key]);
                              } else {
                                onColorFilterChange(colorFilter.filter(c => c !== preset.key));
                              }
                            }}
                            className="h-4 w-4 rounded border-input"
                          />
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: preset.swatchColor }}
                          />
                          <span className="text-sm">{preset.label}</span>
                        </label>
                      ))}
                      
                      {colorFilter.length > 0 && (
                        <>
                          <Separator className="my-1" />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-muted-foreground"
                            onClick={() => onColorFilterChange([])}
                          >
                            <X className="h-3 w-3 mr-2" />
                            Clear color filter
                          </Button>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter tasks by assigned color (multi-select)</p>
            </TooltipContent>
          </Tooltip>

          {/* Date Range Filter */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={cn(
                        "min-w-[160px] justify-start text-left font-normal",
                        (dateRangeStart || dateRangeEnd) && "border-primary"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {dateRangeStart && dateRangeEnd ? (
                        <span className="truncate">
                          {format(dateRangeStart, 'MMM d')} - {format(dateRangeEnd, 'MMM d')}
                        </span>
                      ) : dateRangeStart ? (
                        <span className="truncate">From {format(dateRangeStart, 'MMM d')}</span>
                      ) : dateRangeEnd ? (
                        <span className="truncate">Until {format(dateRangeEnd, 'MMM d')}</span>
                      ) : (
                        <span className="text-muted-foreground">Date range</span>
                      )}
                      {(dateRangeStart || dateRangeEnd) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDateRangeChange(null, null);
                          }}
                          className="ml-auto hover:bg-muted rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-4">
                      {/* Quick Presets */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Quick Select</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const now = new Date();
                              onDateRangeChange(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }));
                            }}
                          >
                            This Week
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const now = new Date();
                              onDateRangeChange(now, endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }));
                            }}
                          >
                            Next 2 Weeks
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const now = new Date();
                              onDateRangeChange(startOfMonth(now), endOfMonth(now));
                            }}
                          >
                            This Month
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const now = new Date();
                              const nextMonth = addMonths(now, 1);
                              onDateRangeChange(startOfMonth(nextMonth), endOfMonth(nextMonth));
                            }}
                          >
                            Next Month
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Start Date</Label>
                        <Calendar
                          mode="single"
                          selected={dateRangeStart ?? undefined}
                          onSelect={(date) => onDateRangeChange(date ?? null, dateRangeEnd)}
                          className={cn("p-3 pointer-events-auto rounded-md border")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">End Date</Label>
                        <Calendar
                          mode="single"
                          selected={dateRangeEnd ?? undefined}
                          onSelect={(date) => onDateRangeChange(dateRangeStart, date ?? null)}
                          disabled={(date) => dateRangeStart ? date < dateRangeStart : false}
                          className={cn("p-3 pointer-events-auto rounded-md border")}
                        />
                      </div>
                      {(dateRangeStart || dateRangeEnd) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => onDateRangeChange(null, null)}
                        >
                          <X className="h-3 w-3 mr-2" />
                          Clear date range
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter tasks by date range</p>
            </TooltipContent>
          </Tooltip>

          {/* Clear Filters button - only show when filters are active */}
          {hasActiveFilters && onClearFilters && (
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

          {/* Filter Presets */}
          {(onSavePreset || onApplyPreset) && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Bookmark className="h-4 w-4 mr-1" />
                      Presets
                      {filterPresets.length > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-muted-foreground text-xs">
                          {filterPresets.length}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save and load filter presets</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-56">
                {hasActiveFilters && onSavePreset && (
                  <>
                    <DropdownMenuItem onClick={() => setSavePresetDialogOpen(true)}>
                      <BookmarkPlus className="h-4 w-4 mr-2" />
                      Save current filters...
                    </DropdownMenuItem>
                    {filterPresets.length > 0 && <DropdownMenuSeparator />}
                  </>
                )}
                {filterPresets.length === 0 && !hasActiveFilters && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    Apply filters and save them as presets for quick access
                  </div>
                )}
                {filterPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    className="flex items-center justify-between group"
                    onClick={() => onApplyPreset?.(preset)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Bookmark className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{preset.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePreset?.(preset.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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

      {/* Save Preset Dialog */}
      <Dialog open={savePresetDialogOpen} onOpenChange={setSavePresetDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., My Team's Tasks"
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Current filters:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {searchQuery.trim() && <li>Search: "{searchQuery}"</li>}
                {statusFilter !== 'all' && <li>Status: {statusFilter.replace('_', ' ')}</li>}
                {ownerFilter !== 'all' && <li>Owner: {ownerFilter}</li>}
                {colorFilter.length > 0 && <li>{colorFilter.length} color(s) selected</li>}
                {(dateRangeStart || dateRangeEnd) && (
                  <li>
                    Date: {dateRangeStart && dateRangeEnd 
                      ? `${format(dateRangeStart, 'MMM d')} - ${format(dateRangeEnd, 'MMM d')}`
                      : dateRangeStart 
                        ? `From ${format(dateRangeStart, 'MMM d')}`
                        : `Until ${format(dateRangeEnd!, 'MMM d')}`}
                  </li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSavePresetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
