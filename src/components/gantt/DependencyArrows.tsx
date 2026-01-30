import { useMemo, useState, useRef, useEffect } from 'react';
import { Task, TaskDependency, ViewMode, DependencyType } from '@/types/gantt';
import { differenceInDays, startOfDay } from 'date-fns';
import { DependencyTypeSelector, getDependencyTypeLabel } from './DependencyTypeSelector';

interface DependencyArrowsProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  viewMode: ViewMode;
  unitWidth: number;
  chartStartDate: Date;
  rowHeight: number;
  onDeleteDependency?: (dependencyId: string) => void;
  onUpdateDependency?: (dependencyId: string, type: DependencyType) => void;
}

interface ArrowPath {
  id: string;
  path: string;
  predecessorId: string;
  successorId: string;
  predecessorName: string;
  successorName: string;
  midPoint: { x: number; y: number };
  dependencyType: DependencyType;
}

export function DependencyArrows({
  tasks,
  dependencies,
  viewMode,
  unitWidth,
  chartStartDate,
  rowHeight,
  onDeleteDependency,
  onUpdateDependency
}: DependencyArrowsProps) {
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [hoveredArrowId, setHoveredArrowId] = useState<string | null>(null);
  const [newArrowIds, setNewArrowIds] = useState<Set<string>>(new Set());
  const prevDependencyIdsRef = useRef<Set<string>>(new Set());
  
  const taskMap = useMemo(() => {
    return new Map(tasks.map((task, index) => [task.id, { task, index }]));
  }, [tasks]);

  // Track new dependencies for animation
  useEffect(() => {
    const currentIds = new Set(dependencies.map(d => d.id));
    const prevIds = prevDependencyIdsRef.current;
    
    // Find newly added dependencies
    const newIds = new Set<string>();
    currentIds.forEach(id => {
      if (!prevIds.has(id)) {
        newIds.add(id);
      }
    });
    
    if (newIds.size > 0) {
      setNewArrowIds(newIds);
      // Clear animation class after animation completes
      const timer = setTimeout(() => {
        setNewArrowIds(new Set());
      }, 500);
      return () => clearTimeout(timer);
    }
    
    prevDependencyIdsRef.current = currentIds;
  }, [dependencies]);

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
        
        // Calculate midpoint for delete button
        const midPoint = {
          x: (startX + endX) / 2,
          y: (predY + succY) / 2
        };

        return {
          id: dep.id,
          path,
          predecessorId: dep.predecessor_id,
          successorId: dep.successor_id,
          predecessorName: predecessorData.task.name,
          successorName: successorData.task.name,
          midPoint,
          dependencyType: dep.dependency_type
        };
      })
      .filter((arrow): arrow is ArrowPath => arrow !== null);
  }, [dependencies, taskMap, viewMode, unitWidth, chartStartDate, rowHeight]);

  if (arrows.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 overflow-visible"
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
        <marker
          id="arrowhead-hover"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            className="fill-destructive"
          />
        </marker>
        {/* Animation styles */}
        <style>
          {`
            @keyframes drawLine {
              from {
                stroke-dashoffset: 1000;
                opacity: 0;
              }
              to {
                stroke-dashoffset: 0;
                opacity: 1;
              }
            }
            @keyframes fadeInScale {
              from {
                opacity: 0;
                transform: scale(0.5);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            .animate-draw-line {
              animation: drawLine 0.4s ease-out forwards;
              stroke-dasharray: 1000;
            }
            .animate-label-in {
              animation: fadeInScale 0.3s ease-out 0.2s forwards;
              opacity: 0;
            }
          `}
        </style>
      </defs>
      {arrows.map(arrow => {
        const isHovered = hoveredArrowId === arrow.id;
        const isSelected = selectedArrowId === arrow.id;
        const isNew = newArrowIds.has(arrow.id);
        
        return (
          <g key={arrow.id}>
            {/* Invisible wider path for easier clicking */}
            <path
              d={arrow.path}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredArrowId(arrow.id)}
              onMouseLeave={() => setHoveredArrowId(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedArrowId(arrow.id);
              }}
            />
            {/* Visible path */}
            <path
              d={arrow.path}
              className={`${(isHovered || isSelected) ? "stroke-primary" : "stroke-muted-foreground/60"} ${isNew ? "animate-draw-line" : ""}`}
              fill="none"
              strokeWidth={(isHovered || isSelected) ? 2.5 : 1.5}
              markerEnd={(isHovered || isSelected) ? "url(#arrowhead)" : "url(#arrowhead-muted)"}
              style={{ 
                transition: isNew ? undefined : 'stroke 0.15s, stroke-width 0.15s',
              }}
              pointerEvents="none"
            />
            {/* Type label - always visible */}
            <g 
              transform={`translate(${arrow.midPoint.x}, ${arrow.midPoint.y})`}
              className={isNew ? "animate-label-in" : ""}
              style={{ transformOrigin: `${arrow.midPoint.x}px ${arrow.midPoint.y}px` }}
            >
              <rect
                x={-12}
                y={-10}
                width={24}
                height={20}
                rx={4}
                className={(isHovered || isSelected) ? "fill-primary" : "fill-muted"}
                style={{ transition: 'fill 0.15s' }}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                className={(isHovered || isSelected) ? "fill-primary-foreground text-[10px] font-bold" : "fill-muted-foreground text-[10px] font-medium"}
                style={{ pointerEvents: 'none', transition: 'fill 0.15s' }}
              >
                {getDependencyTypeLabel(arrow.dependencyType)}
              </text>
            </g>
          </g>
        );
      })}
      
      
      {/* Dependency type selector popover */}
      {selectedArrowId && (() => {
        const selectedArrow = arrows.find(a => a.id === selectedArrowId);
        if (!selectedArrow) return null;
        
        return (
          <foreignObject
            x={selectedArrow.midPoint.x - 130}
            y={selectedArrow.midPoint.y - 200}
            width={260}
            height={250}
            style={{ overflow: 'visible' }}
          >
            <DependencyTypeSelector
              open={true}
              onOpenChange={(open) => {
                if (!open) setSelectedArrowId(null);
              }}
              selectedType={selectedArrow.dependencyType}
              onTypeSelect={(type) => {
                onUpdateDependency?.(selectedArrowId, type);
                setSelectedArrowId(null);
              }}
              onDelete={() => {
                onDeleteDependency?.(selectedArrowId);
                setSelectedArrowId(null);
              }}
            />
          </foreignObject>
        );
      })()}
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
