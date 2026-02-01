import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Milestone } from '@/hooks/useMilestones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { CalendarIcon, Diamond, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MILESTONE_COLORS = [
  { key: 'purple', color: '#8B5CF6', label: 'Purple' },
  { key: 'blue', color: '#3B82F6', label: 'Blue' },
  { key: 'green', color: '#22C55E', label: 'Green' },
  { key: 'orange', color: '#F97316', label: 'Orange' },
  { key: 'red', color: '#EF4444', label: 'Red' },
  { key: 'pink', color: '#EC4899', label: 'Pink' },
];

const milestoneSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.date({ required_error: 'Date is required' }),
  description: z.string().optional(),
  color: z.string().default('#8B5CF6'),
});

type MilestoneFormData = z.infer<typeof milestoneSchema>;

interface MilestoneFormProps {
  projectId: string;
  milestone?: Milestone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>) => void;
  onDelete?: (id: string) => void;
}

export function MilestoneForm({
  projectId,
  milestone,
  open,
  onOpenChange,
  onSubmit,
  onDelete,
}: MilestoneFormProps) {
  const form = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      name: '',
      date: new Date(),
      description: '',
      color: '#8B5CF6',
    },
  });

  useEffect(() => {
    if (milestone) {
      form.reset({
        name: milestone.name,
        date: new Date(milestone.date),
        description: milestone.description ?? '',
        color: milestone.color,
      });
    } else {
      form.reset({
        name: '',
        date: new Date(),
        description: '',
        color: '#8B5CF6',
      });
    }
  }, [milestone, form]);

  const handleSubmit = (data: MilestoneFormData) => {
    onSubmit({
      project_id: projectId,
      name: data.name,
      date: format(data.date, 'yyyy-MM-dd'),
      description: data.description || null,
      color: data.color,
    });
    onOpenChange(false);
    form.reset();
  };

  const handleDelete = () => {
    if (milestone && onDelete) {
      onDelete(milestone.id);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Diamond className="h-5 w-5 text-primary" />
            {milestone ? 'Edit Milestone' : 'Add Milestone'}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Project Launch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this milestone..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {MILESTONE_COLORS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => field.onChange(c.color)}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all',
                            field.value === c.color
                              ? 'border-foreground scale-110'
                              : 'border-transparent hover:scale-105'
                          )}
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="flex gap-2 pt-4">
              {milestone && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {milestone ? 'Save Changes' : 'Add Milestone'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
