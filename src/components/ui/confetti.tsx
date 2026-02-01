import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
  className?: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#10b981', // green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // purple
];

export function Confetti({ active, onComplete, className }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (active) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = [];
      for (let i = 0; i < 50; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * 100,
          y: -10 - Math.random() * 20,
          rotation: Math.random() * 360,
          scale: 0.5 + Math.random() * 0.5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 0.3,
        });
      }
      setPieces(newPieces);
      setIsVisible(true);

      // Clean up after animation
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setPieces([]);
        onComplete?.();
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [active, onComplete]);

  if (!isVisible || pieces.length === 0) return null;

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-[100] overflow-hidden', className)}>
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
            animationDelay: `${piece.delay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

// Lightweight sparkle effect for individual items
interface SparkleProps {
  active: boolean;
  className?: string;
}

export function Sparkle({ active, className }: SparkleProps) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (active) {
      const newSparkles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 60,
        y: 50 + (Math.random() - 0.5) * 60,
        delay: Math.random() * 0.2,
      }));
      setSparkles(newSparkles);

      const timeout = setTimeout(() => setSparkles([]), 600);
      return () => clearTimeout(timeout);
    }
  }, [active]);

  if (sparkles.length === 0) return null;

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-visible', className)}>
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute w-1.5 h-1.5 bg-primary rounded-full animate-sparkle"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDelay: `${sparkle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
