import { cn } from "@/lib/utils";

export function ReferenceLineInline({ 
  premiumBps, 
  deviationState, 
  size = "md",
  scaleBps = 400,
  className
}: { 
  premiumBps: number | null, 
  deviationState: string,
  size?: "sm" | "md",
  scaleBps?: number,
  className?: string
}) {
  const isUnpriced = premiumBps === null;
  const isAbove = !isUnpriced && premiumBps >= 0;
  
  // Calculate percentage from center
  const clampedBps = isUnpriced ? 0 : Math.max(-scaleBps, Math.min(scaleBps, premiumBps));
  const topPercentage = 50 - (clampedBps / scaleBps) * 50;
  
  const dotColor = isUnpriced ? 'border border-dev-unpriced bg-background' :
                   deviationState === 'fair' ? 'bg-dev-fair shadow-[0_0_4px_var(--color-dev-fair)]' : 
                   deviationState === 'elevated' ? 'bg-dev-elevated shadow-[0_0_4px_var(--color-dev-elevated)]' : 'bg-dev-dislocated shadow-[0_0_4px_var(--color-dev-dislocated)]';

  const w = size === "sm" ? "w-8" : "w-12";
  const h = size === "sm" ? "h-6" : "h-10";
  const dotSize = size === "sm" ? "size-1.5" : "size-2";
  
  return (
    <div className={cn("relative flex items-center justify-center shrink-0", w, h, className)}>
      {/* Reference Line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-border/80" />
      
      {/* Fair band */}
      <div className="absolute left-0 right-0 bg-dev-fair/5" style={{ top: `${50 - (50/scaleBps)*50}%`, height: `${(100/scaleBps)*50}%` }} />

      {/* Stem */}
      {!isUnpriced && clampedBps !== 0 && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-px bg-border/60"
          style={{ 
            top: isAbove ? `${topPercentage}%` : '50%',
            bottom: isAbove ? '50%' : `${100 - topPercentage}%` 
          }}
        />
      )}

      {/* Mark */}
      <div 
        className={cn("absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full", dotSize, dotColor)}
        style={{ top: `${topPercentage}%` }}
      />
    </div>
  );
}