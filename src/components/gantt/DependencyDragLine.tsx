interface DependencyDragLineProps {
  sourcePoint: { x: number; y: number };
  currentPoint: { x: number; y: number };
  isValidTarget: boolean;
}

export function DependencyDragLine({ sourcePoint, currentPoint, isValidTarget }: DependencyDragLineProps) {
  const midX = (sourcePoint.x + currentPoint.x) / 2;
  
  // Create a curved path
  const path = `
    M ${sourcePoint.x} ${sourcePoint.y}
    C ${midX} ${sourcePoint.y}, ${midX} ${currentPoint.y}, ${currentPoint.x} ${currentPoint.y}
  `.trim();

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 100 }}
    >
      <defs>
        <marker
          id="drag-arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            className={isValidTarget ? "fill-primary" : "fill-muted-foreground"}
          />
        </marker>
      </defs>
      
      {/* Shadow/glow effect */}
      <path
        d={path}
        fill="none"
        className={isValidTarget ? "stroke-primary/30" : "stroke-muted-foreground/30"}
        strokeWidth={6}
        strokeLinecap="round"
      />
      
      {/* Main line */}
      <path
        d={path}
        fill="none"
        className={isValidTarget ? "stroke-primary" : "stroke-muted-foreground"}
        strokeWidth={2}
        strokeDasharray={isValidTarget ? "none" : "5,5"}
        strokeLinecap="round"
        markerEnd="url(#drag-arrowhead)"
      />
      
      {/* Source circle */}
      <circle
        cx={sourcePoint.x}
        cy={sourcePoint.y}
        r={6}
        className={isValidTarget ? "fill-primary" : "fill-muted-foreground"}
      />
    </svg>
  );
}
