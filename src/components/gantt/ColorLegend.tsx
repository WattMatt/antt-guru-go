import { TASK_COLOR_PRESETS } from '@/lib/taskColors';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';

export function ColorLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Legend</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="font-medium text-sm">Color Legend</div>
          
          {/* Status-based colors */}
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground font-medium">Status Colors (Default)</div>
            <div className="grid gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted-foreground/40" />
                <span className="text-xs">Not Started</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-xs">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-xs">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive" />
                <span className="text-xs">Overdue</span>
              </div>
            </div>
          </div>

          {/* Custom color presets */}
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground font-medium">Custom Colors</div>
            <div className="grid grid-cols-2 gap-1.5">
              {TASK_COLOR_PRESETS.map((preset) => (
                <div key={preset.key} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: preset.swatchColor }}
                  />
                  <span className="text-xs">{preset.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
