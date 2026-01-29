import { OnboardingStep } from '@/hooks/useOnboardingProgress';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, ChevronDown, ChevronUp, Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  progressPercentage: number;
  onDismiss: () => void;
}

export function OnboardingChecklist({
  steps,
  completedCount,
  totalSteps,
  progressPercentage,
  onDismiss
}: OnboardingChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-card border rounded-lg overflow-hidden animate-fade-in">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Getting Started Guide</h3>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {totalSteps} steps completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <Progress value={progressPercentage} className="w-24 h-2" />
              <span className="text-xs font-medium text-muted-foreground">{progressPercentage}%</span>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="p-4 pt-0">
            <div className="grid gap-2 mt-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md transition-colors",
                    step.completed ? "bg-green-500/5" : "bg-muted/30",
                    step.action && !step.completed && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => step.action && !step.completed && step.action()}
                >
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    step.completed 
                      ? "bg-green-500 text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {step.completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </div>
                  <span className={cn(
                    "text-sm",
                    step.completed && "text-muted-foreground line-through"
                  )}>
                    {step.label}
                  </span>
                  {step.id === 'dependencies' && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Coming soon
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
