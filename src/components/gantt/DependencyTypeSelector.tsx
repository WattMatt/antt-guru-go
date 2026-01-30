import { DependencyType } from '@/types/gantt';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DependencyTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType: DependencyType;
  onTypeSelect: (type: DependencyType) => void;
  onDelete?: () => void;
  trigger?: React.ReactNode;
  position?: { x: number; y: number };
}

const DEPENDENCY_TYPES: { type: DependencyType; label: string; short: string; description: string }[] = [
  { type: 'finish_to_start', label: 'Finish to Start', short: 'FS', description: 'Successor starts after predecessor finishes' },
  { type: 'start_to_start', label: 'Start to Start', short: 'SS', description: 'Both tasks start together' },
  { type: 'finish_to_finish', label: 'Finish to Finish', short: 'FF', description: 'Both tasks finish together' },
  { type: 'start_to_finish', label: 'Start to Finish', short: 'SF', description: 'Successor finishes when predecessor starts' },
];

export function DependencyTypeSelector({
  open,
  onOpenChange,
  selectedType,
  onTypeSelect,
  onDelete,
  trigger,
  position
}: DependencyTypeSelectorProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
      <PopoverContent 
        className="w-64 p-2 bg-popover border shadow-lg z-50" 
        align="center"
        side="top"
        sideOffset={8}
        style={position ? { 
          position: 'fixed', 
          left: position.x, 
          top: position.y,
          transform: 'translate(-50%, -100%)'
        } : undefined}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Dependency Type</p>
          {DEPENDENCY_TYPES.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                onTypeSelect(item.type);
                onOpenChange(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                selectedType === item.type && "bg-accent text-accent-foreground"
              )}
            >
              <span className={cn(
                "flex-shrink-0 w-8 h-6 rounded text-xs font-bold flex items-center justify-center",
                selectedType === item.type 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {item.short}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
            </button>
          ))}
          
          {onDelete && (
            <>
              <div className="border-t my-2" />
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                }}
              >
                Remove Dependency
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function getDependencyTypeLabel(type: DependencyType): string {
  const item = DEPENDENCY_TYPES.find(t => t.type === type);
  return item?.short ?? 'FS';
}
