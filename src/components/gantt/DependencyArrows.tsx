import { useMemo } from 'react';
import { Task, TaskDependency, ViewMode } from '@/types/gantt';
import { differenceInDays, startOfDay } from 'date-fns';

interface DependencyArrowsProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  viewMode: ViewMode;
  unitWidth: number;
  chartStartDate: Date;
  rowHeight: number;
}

interface ArrowPath {
  id: string;
  path: string;
  predecessorId: string;
  successorId: string;
}

export function DependencyArrows({
  tasks,
  dependencies,
  viewMode,
  unitWidth,
  chartStartDate,
  rowHeight
}: DependencyArrowsProps) {
  const taskMap = useMemo(() => {
    return new Map(tasks.map((task, index) => [task.id, { task, index }]));
  }, [tasks]);

  const getTaskPosition = (task: Task) => {
    const taskStart = startOfDay(new Date(task.start_date));
    const taskEnd = startOfDay(new Date(task.end_date));
    
    const daysFromStart = differenceInDays(taskStart, chartStartDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    
    let left: number;
    let width: number;

    switch (viewMode) {
      case 'day':
        left = daysFromStart * unitWidth;
        width = duration * unitWidth;
        break;
      case 'week':
        left = (daysFromStart / 7) * unitWidth;
        width = (duration / 7) * unitWidth;
        break;
      case 'month':
        left = (daysFromStart / 30) * unitWidth;
        width = (duration / 30) * unitWidth;
        break;
      default:
        left = daysFromStart * unitWidth;
        width = duration * unitWidth;
    }

    return { left: Math.max(0, left), width: Math.max(unitWidth / 2, width) };
  };

  const arrows = useMemo<ArrowPath[]>(() => {
    return dependencies
      .map(dep => {
        const predecessorData = taskMap.get(dep.predecessor_id);
        const successorData = taskMap.get(dep.successor_id);

        if (!predecessorData || !successorData) return null;

        const predPos = getTaskPosition(predecessorData.task);
        const succPos = getTaskPosition(successorData.task);

        const predRowIndex = predecessorData.index;
        const succRowIndex = successorData.index;

        // Calculate vertical centers of task bars (row has 8px top padding, bar is 32px tall)
        const predY = predRowIndex * rowHeight + 8 + 16; // center of bar
        const succY = succRowIndex * rowHeight + 8 + 16;

        let startX: number;
        let endX: number;

        // Calculate start/end X based on dependency type
        switch (dep.dependency_type) {
          case 'finish_to_start':
            startX = predPos.left + predPos.width;
            endX = succPos.left;
            break;
          case 'start_to_start':
            startX = predPos.left;
            endX = succPos.left;
            break;
          case 'finish_to_finish':
            startX = predPos.left + predPos.width;
            endX = succPos.left + succPos.width;
            break;
          case 'start_to_finish':
            startX = predPos.left;
            endX = succPos.left + succPos.width;
            break;
          default:
            startX = predPos.left + predPos.width;
            endX = succPos.left;
        }

        // Create path with curves
        const path = createArrowPath(startX, predY, endX, succY, dep.dependency_type);

        return {
          id: dep.id,
          path,
          predecessorId: dep.predecessor_id,
          successorId: dep.successor_id
        };
      })
      .filter((arrow): arrow is ArrowPath => arrow !== null);
  }, [dependencies, taskMap, viewMode, unitWidth, chartStartDate, rowHeight]);

  if (arrows.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 5 }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            className="fill-primary"
          />
        </marker>
        <marker
          id="arrowhead-muted"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            className="fill-muted-foreground/60"
          />
        </marker>
      </defs>
      {arrows.map(arrow => (
        <path
          key={arrow.id}
          d={arrow.path}
          className="stroke-muted-foreground/60 hover:stroke-primary transition-colors"
          fill="none"
          strokeWidth={1.5}
          markerEnd="url(#arrowhead-muted)"
        />
      ))}
    </svg>
  );
}

function createArrowPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  dependencyType: string
): string {
  const horizontalGap = 12; // Gap from task bar
  const cornerRadius = 6;
  const verticalOffset = endY > startY ? cornerRadius : -cornerRadius;

  // For finish_to_start (most common), create an L-shaped or S-shaped path
  if (dependencyType === 'finish_to_start') {
    if (endX > startX + horizontalGap * 2) {
      // Direct path with slight curve
      const midX = startX + horizontalGap;
      
      if (Math.abs(endY - startY) < 4) {
        // Same row - straight horizontal line
        return `M ${startX} ${startY} L ${endX - 4} ${endY}`;
      }
      
      // Different rows - L-shaped path
      return `
        M ${startX} ${startY}
        L ${midX} ${startY}
        Q ${midX + cornerRadius} ${startY} ${midX + cornerRadius} ${startY + verticalOffset}
        L ${midX + cornerRadius} ${endY - verticalOffset}
        Q ${midX + cornerRadius} ${endY} ${midX + cornerRadius * 2} ${endY}
        L ${endX - 4} ${endY}
      `.replace(/\s+/g, ' ').trim();
    } else {
      // Successor starts before predecessor ends - S-shaped path
      const offsetX = 20;
      const midY = (startY + endY) / 2;
      
      return `
        M ${startX} ${startY}
        L ${startX + horizontalGap} ${startY}
        Q ${startX + horizontalGap + cornerRadius} ${startY} ${startX + horizontalGap + cornerRadius} ${startY + verticalOffset}
        L ${startX + horizontalGap + cornerRadius} ${midY - verticalOffset}
        Q ${startX + horizontalGap + cornerRadius} ${midY} ${startX + horizontalGap} ${midY}
        L ${endX - offsetX} ${midY}
        Q ${endX - offsetX - cornerRadius} ${midY} ${endX - offsetX - cornerRadius} ${midY + verticalOffset}
        L ${endX - offsetX - cornerRadius} ${endY - verticalOffset}
        Q ${endX - offsetX - cornerRadius} ${endY} ${endX - offsetX} ${endY}
        L ${endX - 4} ${endY}
      `.replace(/\s+/g, ' ').trim();
    }
  }

  // For start_to_start
  if (dependencyType === 'start_to_start') {
    const offsetX = -horizontalGap;
    
    if (Math.abs(endY - startY) < 4) {
      return `M ${startX} ${startY} L ${endX - 4} ${endY}`;
    }
    
    return `
      M ${startX} ${startY}
      L ${startX + offsetX} ${startY}
      Q ${startX + offsetX - cornerRadius} ${startY} ${startX + offsetX - cornerRadius} ${startY + verticalOffset}
      L ${startX + offsetX - cornerRadius} ${endY - verticalOffset}
      Q ${startX + offsetX - cornerRadius} ${endY} ${startX + offsetX} ${endY}
      L ${endX - 4} ${endY}
    `.replace(/\s+/g, ' ').trim();
  }

  // For finish_to_finish
  if (dependencyType === 'finish_to_finish') {
    if (Math.abs(endY - startY) < 4) {
      return `M ${startX} ${startY} L ${endX + 4} ${endY}`;
    }
    
    const maxX = Math.max(startX, endX) + horizontalGap;
    
    return `
      M ${startX} ${startY}
      L ${maxX} ${startY}
      Q ${maxX + cornerRadius} ${startY} ${maxX + cornerRadius} ${startY + verticalOffset}
      L ${maxX + cornerRadius} ${endY - verticalOffset}
      Q ${maxX + cornerRadius} ${endY} ${maxX} ${endY}
      L ${endX + 4} ${endY}
    `.replace(/\s+/g, ' ').trim();
  }

  // For start_to_finish
  if (dependencyType === 'start_to_finish') {
    const offsetX = -horizontalGap;
    
    if (Math.abs(endY - startY) < 4) {
      return `M ${startX} ${startY} L ${endX + 4} ${endY}`;
    }
    
    return `
      M ${startX} ${startY}
      L ${startX + offsetX} ${startY}
      Q ${startX + offsetX - cornerRadius} ${startY} ${startX + offsetX - cornerRadius} ${startY + verticalOffset}
      L ${startX + offsetX - cornerRadius} ${endY - verticalOffset}
      Q ${startX + offsetX - cornerRadius} ${endY} ${startX + offsetX} ${endY}
      L ${endX + 4} ${endY}
    `.replace(/\s+/g, ' ').trim();
  }

  // Fallback - simple line
  return `M ${startX} ${startY} L ${endX - 4} ${endY}`;
}
