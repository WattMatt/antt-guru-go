import { Milestone } from '@/hooks/useMilestones';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MilestoneMarkerProps {
  milestone: Milestone;
  left: number;
  onClick: (milestone: Milestone) => void;
}

export function MilestoneMarker({ milestone, left, onClick }: MilestoneMarkerProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'absolute top-0 z-20 flex flex-col items-center cursor-pointer group',
            'transition-transform hover:scale-110'
          )}
          style={{ left: `${left}px`, transform: 'translateX(-50%)' }}
          onClick={() => onClick(milestone)}
        >
          {/* Diamond shape */}
          <div
            className="w-4 h-4 rotate-45 border-2 border-background shadow-lg"
            style={{ backgroundColor: milestone.color }}
          />
          {/* Vertical line */}
          <div
            className="w-0.5 h-full min-h-[200px] opacity-50"
            style={{ backgroundColor: milestone.color }}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[200px]">
        <div className="space-y-1">
          <p className="font-medium">{milestone.name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(milestone.date), 'PPP')}
          </p>
          {milestone.description && (
            <p className="text-xs text-muted-foreground">{milestone.description}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
