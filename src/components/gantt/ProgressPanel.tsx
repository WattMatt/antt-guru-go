import { Task } from '@/types/gantt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, isBefore, startOfDay, addDays } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, Calendar, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProgressPanelProps {
  tasks: Task[];
}

export function ProgressPanel({ tasks }: ProgressPanelProps) {
  const today = startOfDay(new Date());
  const twoWeeksFromNow = addDays(today, 14);

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(t => 
    t.status !== 'completed' && isBefore(new Date(t.end_date), today)
  );
  const upcomingTasks = tasks.filter(t => {
    const endDate = new Date(t.end_date);
    return t.status !== 'completed' && 
           !isBefore(endDate, today) && 
           isBefore(endDate, twoWeeksFromNow);
  });
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

  const completionPercentage = tasks.length > 0 
    ? Math.round((completedTasks.length / tasks.length) * 100) 
    : 0;

  const isEmpty = tasks.length === 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Project Progress</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Track your project completion and upcoming deadlines</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription>
              {isEmpty 
                ? "Add tasks to start tracking progress"
                : `${completedTasks.length} of ${tasks.length} tasks completed`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEmpty ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                <p>No tasks yet</p>
                <p className="text-xs mt-1">Create tasks to see progress statistics</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion</span>
                    <span className="font-medium">{completionPercentage}%</span>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground">{tasks.filter(t => t.status === 'not_started').length}</p>
                    <p className="text-xs text-muted-foreground">Not Started</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-500">{inProgressTasks.length}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-500">{completedTasks.length}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-lg text-destructive">Overdue Tasks</CardTitle>
              </div>
              <CardDescription>
                {overdueTasks.length} task{overdueTasks.length !== 1 ? 's' : ''} past due date
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-destructive/5 rounded">
                  <span className="text-sm font-medium truncate">{task.name}</span>
                  <Badge variant="destructive" className="text-xs">
                    Due {format(new Date(task.end_date), 'MMM d')}
                  </Badge>
                </div>
              ))}
              {overdueTasks.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{overdueTasks.length - 5} more
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Due in 2 Weeks</CardTitle>
            </div>
            <CardDescription>
              {upcomingTasks.length} task{upcomingTasks.length !== 1 ? 's' : ''} due soon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                {isEmpty ? "Create tasks with due dates to track deadlines" : "No upcoming deadlines"}
              </p>
            ) : (
              <>
                {upcomingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium truncate">{task.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(task.end_date), 'MMM d')}
                    </Badge>
                  </div>
                ))}
                {upcomingTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{upcomingTasks.length - 5} more
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">In Progress</CardTitle>
            </div>
            <CardDescription>
              {inProgressTasks.length} task{inProgressTasks.length !== 1 ? 's' : ''} being worked on
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {inProgressTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                {isEmpty ? "Set task status to 'In Progress' to track active work" : "No tasks in progress"}
              </p>
            ) : (
              inProgressTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{task.name}</span>
                    <span className="text-xs text-muted-foreground">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-1" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Completed Tasks Summary */}
        {completedTasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">Recently Completed</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2 bg-green-500/5 rounded">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm truncate line-through text-muted-foreground">{task.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
