import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { parseConstructionProgram, isExcelFile, ParsedProgramTask } from '@/lib/programImport';
import { format, parseISO } from 'date-fns';

interface ImportProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (tasks: ParsedProgramTask[]) => Promise<void>;
}

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'success' | 'error';

export function ImportProgramDialog({ open, onOpenChange, onImport }: ImportProgramDialogProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [parsedTasks, setParsedTasks] = useState<ParsedProgramTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [includeSections, setIncludeSections] = useState(false);

  const reset = useCallback(() => {
    setState('idle');
    setParsedTasks([]);
    setSelectedTasks(new Set());
    setErrors([]);
    setImportProgress(0);
    setDragOver(false);
    setIncludeSections(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!isExcelFile(file)) {
      setErrors(['Please select a valid Excel file (.xlsx, .xls)']);
      setState('error');
      return;
    }

    setState('parsing');
    setErrors([]);

    try {
      const result = await parseConstructionProgram(file);
      
      if (result.errors.length > 0) {
        setErrors(result.errors);
        if (result.tasks.length === 0) {
          setState('error');
          return;
        }
      }

      setParsedTasks(result.tasks);
      // Select all non-section tasks by default
      const defaultSelected = new Set<number>();
      result.tasks.forEach((task, index) => {
        if (!task.isSection) {
          defaultSelected.add(index);
        }
      });
      setSelectedTasks(defaultSelected);
      setState('preview');
    } catch (error) {
      setErrors([`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setState('error');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleToggleTask = useCallback((index: number) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const toSelect = parsedTasks.filter(t => includeSections || !t.isSection);
    if (selectedTasks.size === toSelect.length) {
      setSelectedTasks(new Set());
    } else {
      const all = new Set<number>();
      parsedTasks.forEach((task, index) => {
        if (includeSections || !task.isSection) {
          all.add(index);
        }
      });
      setSelectedTasks(all);
    }
  }, [parsedTasks, selectedTasks.size, includeSections]);

  const handleImport = useCallback(async () => {
    const tasksToImport = parsedTasks.filter((_, i) => selectedTasks.has(i));
    if (tasksToImport.length === 0) return;

    setState('importing');
    setImportProgress(0);

    try {
      await onImport(tasksToImport);
      setState('success');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      setErrors([`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setState('error');
    }
  }, [parsedTasks, selectedTasks, onImport, handleClose]);

  const filteredTasks = includeSections 
    ? parsedTasks 
    : parsedTasks.filter(t => !t.isSection);

  const selectedCount = Array.from(selectedTasks).filter(i => 
    includeSections || !parsedTasks[i]?.isSection
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "sm:max-w-2xl",
        state === 'preview' && "sm:max-w-4xl"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Construction Program
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file with your construction schedule to import tasks.
          </DialogDescription>
        </DialogHeader>

        {/* Idle / File Upload State */}
        {state === 'idle' && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.xlsm"
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className={cn(
              "h-12 w-12 mx-auto mb-4",
              dragOver ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="text-lg font-medium mb-1">
              {dragOver ? 'Drop file here' : 'Drop your Excel file here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse • .xlsx, .xls supported
            </p>
          </div>
        )}

        {/* Parsing State */}
        {state === 'parsing' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-lg font-medium">Parsing file...</p>
            <p className="text-sm text-muted-foreground">Extracting tasks and dates</p>
          </div>
        )}

        {/* Preview State */}
        {state === 'preview' && (
          <div className="space-y-4">
            {errors.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    {errors.map((err, i) => <p key={i}>{err}</p>)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Found <span className="font-medium text-foreground">{parsedTasks.length}</span> items
                  {parsedTasks.filter(t => t.isSection).length > 0 && (
                    <> ({parsedTasks.filter(t => t.isSection).length} sections)</>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-sections"
                    checked={includeSections}
                    onCheckedChange={(checked) => setIncludeSections(checked === true)}
                  />
                  <label htmlFor="include-sections" className="text-sm cursor-pointer">
                    Include section headers
                  </label>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedCount === filteredTasks.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="h-[350px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead className="w-24">Duration</TableHead>
                    <TableHead className="w-28">Start</TableHead>
                    <TableHead className="w-28">End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTasks.map((task, index) => {
                    if (!includeSections && task.isSection) return null;
                    const isSelected = selectedTasks.has(index);
                    return (
                      <TableRow 
                        key={index}
                        className={cn(
                          "cursor-pointer",
                          task.isSection && "bg-muted/50 font-semibold",
                          !isSelected && "opacity-50"
                        )}
                        onClick={() => handleToggleTask(index)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleTask(index)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {task.rowNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {task.isSection && (
                              <Badge variant="outline" className="text-xs">Section</Badge>
                            )}
                            <span className="truncate max-w-[280px]">{task.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.duration ? `${task.duration}d` : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(task.startDate), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(task.endDate), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Importing State */}
        {state === 'importing' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-lg font-medium mb-2">Importing tasks...</p>
            <Progress value={importProgress} className="w-64 mx-auto" />
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">Import complete!</p>
            <p className="text-sm text-muted-foreground">
              {selectedCount} tasks have been added to your project
            </p>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="py-8">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Import failed</p>
                  <div className="text-sm text-muted-foreground mt-1 space-y-1">
                    {errors.map((err, i) => <p key={i}>{err}</p>)}
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={reset} className="mt-4 w-full">
              Try Again
            </Button>
          </div>
        )}

        {/* Footer */}
        {state === 'preview' && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={reset}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={selectedCount === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import {selectedCount} Task{selectedCount !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
