import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Keyboard } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'general' | 'selection' | 'colors';
}

const shortcuts: ShortcutItem[] = [
  // General
  { keys: ['Ctrl', 'Z'], description: 'Undo last action', category: 'general' },
  { keys: ['Ctrl', 'Y'], description: 'Redo last action', category: 'general' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alternative)', category: 'general' },
  { keys: ['Ctrl', 'F'], description: 'Focus search box', category: 'general' },
  { keys: ['/'], description: 'Focus search (alternative)', category: 'general' },
  { keys: ['Escape'], description: 'Clear all filters', category: 'general' },
  { keys: ['?'], description: 'Show this help modal', category: 'general' },
  
  // Selection
  { keys: ['Ctrl', 'A'], description: 'Select all visible tasks', category: 'selection' },
  
  // Colors (when tasks selected)
  { keys: ['1'], description: 'Set Blue color', category: 'colors' },
  { keys: ['2'], description: 'Set Green color', category: 'colors' },
  { keys: ['3'], description: 'Set Purple color', category: 'colors' },
  { keys: ['4'], description: 'Set Orange color', category: 'colors' },
  { keys: ['5'], description: 'Set Pink color', category: 'colors' },
  { keys: ['6'], description: 'Set Teal color', category: 'colors' },
  { keys: ['7'], description: 'Set Yellow color', category: 'colors' },
  { keys: ['8'], description: 'Set Red color', category: 'colors' },
  { keys: ['9'], description: 'Set Indigo color', category: 'colors' },
  { keys: ['0'], description: 'Clear color', category: 'colors' },
];

const categoryLabels: Record<string, string> = {
  general: 'General',
  selection: 'Selection',
  colors: 'Colors (when tasks selected)',
};

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and manage tasks faster
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {(['general', 'selection', 'colors'] as const).map((category) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {categoryLabels[category]}
                </h3>
                <div className="space-y-2">
                  {groupedShortcuts[category]?.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex}>
                            <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 text-xs font-medium">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="mx-0.5 text-muted-foreground">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
