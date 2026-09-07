import { cn } from "@/lib/utils";
import { type FeedState, type DeviationState } from "@workspace/api-client-react";

export function FeedStateBadge({ state, className }: { state: FeedState, className?: string }) {
  const colors: Record<FeedState, string> = {
    live: "text-feed-live border-feed-live/30 bg-feed-live/10",
    held: "text-feed-held border-feed-held/30 bg-feed-held/10",
    stale: "text-feed-stale border-feed-stale/30 bg-feed-stale/10",
    unavailable: "text-feed-unavailable border-feed-unavailable/30 bg-feed-unavailable/10"
  };

  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border", colors[state], className)}>
      {state}
    </span>
  );
}

export function DeviationStateBadge({ state, className }: { state: DeviationState, className?: string }) {
  const colors: Record<DeviationState, string> = {
    fair: "text-dev-fair border-dev-fair/30 bg-dev-fair/10",
    elevated: "text-dev-elevated border-dev-elevated/30 bg-dev-elevated/10",
    dislocated: "text-dev-dislocated border-dev-dislocated/30 bg-dev-dislocated/10",
    unpriced: "text-dev-unpriced border-dev-unpriced/30 bg-dev-unpriced/10"
  };

  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border", colors[state], className)}>
      {state}
    </span>
  );
}

export function PremiumColorText({ bps, state, children }: { bps: number | null, state: DeviationState, children: React.ReactNode }) {
  const colors: Record<DeviationState, string> = {
    fair: "text-dev-fair",
    elevated: "text-dev-elevated",
    dislocated: "text-dev-dislocated",
    unpriced: "text-dev-unpriced"
  };

  return <span className={cn(colors[state], bps !== null && bps > 0 && state !== 'fair' && "font-semibold")}>{children}</span>;
}

export function HealthDot({ isHealthy }: { isHealthy: boolean }) {
  return (
    <span className="relative flex size-2.5">
      {isHealthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-feed-live opacity-75"></span>}
      <span className={cn("relative inline-flex rounded-full size-2.5", isHealthy ? "bg-feed-live" : "bg-feed-unavailable")}></span>
    </span>
  );
}
