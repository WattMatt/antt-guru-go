import { Button } from '@/components/ui/button';
import { BarChart3, Calendar, CheckCircle, ListTodo, Plus, TrendingUp } from 'lucide-react';

interface GettingStartedGuideProps {
  onAddTask: () => void;
}

export function GettingStartedGuide({ onAddTask }: GettingStartedGuideProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <BarChart3 className="h-8 w-8 text-primary" />
      </div>
      
      <h2 className="text-xl font-semibold mb-2">Welcome to Your Gantt Chart</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        A Gantt chart helps you visualize project timelines, track progress, and manage tasks effectively. 
        Start by adding your first task!
      </p>

      <Button 
        onClick={onAddTask} 
        size="lg" 
        className="mb-8 animate-pulse"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add Your First Task
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl w-full">
        <FeatureCard
          icon={ListTodo}
          title="Create Tasks"
          description="Add tasks with names, dates, and owners"
        />
        <FeatureCard
          icon={Calendar}
          title="Timeline View"
          description="See tasks on a visual timeline"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Track Progress"
          description="Monitor completion percentage"
        />
        <FeatureCard
          icon={CheckCircle}
          title="Mark Complete"
          description="Check off finished tasks"
        />
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card/50 text-left">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
