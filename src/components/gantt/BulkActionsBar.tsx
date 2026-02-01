import { TASK_COLOR_PRESETS, TaskColorKey } from '@/lib/taskColors';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Palette, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkColorChange: (color: string | null) => void;
  onBulkDelete?: () => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  onClearSelection, 
  onBulkColorChange,
  onBulkDelete 
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="bg-card border shadow-lg rounded-lg px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedCount} task{selectedCount > 1 ? 's' : ''} selected
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Keyboard shortcut hint */}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">1</kbd>–<kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">0</kbd> for colors
          </span>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Color picker */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Palette className="h-4 w-4" />
                    <span>Set Color</span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assign a color to selected tasks</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-auto p-3" align="center">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Choose a color</p>
                <div className="flex flex-wrap gap-2">
                  {/* Auto/Clear option */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onBulkColorChange(null)}
                        className="w-7 h-7 rounded-full border-2 border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center transition-all"
                        style={{ background: 'linear-gradient(135deg, #e5e7eb 50%, #9ca3af 50%)' }}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear (use status color)</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Color presets */}
                  {TASK_COLOR_PRESETS.map((preset) => (
                    <Tooltip key={preset.key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onBulkColorChange(preset.key)}
                          className="w-7 h-7 rounded-full border-2 border-transparent hover:scale-110 transition-all"
                          style={{ backgroundColor: preset.swatchColor }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{preset.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Delete button (optional) */}
          {onBulkDelete && (
            <>
              <div className="h-6 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="gap-2"
                    onClick={onBulkDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete selected tasks</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
