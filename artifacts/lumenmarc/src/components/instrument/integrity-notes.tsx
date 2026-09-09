import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import type { IntegrityAlert } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Arrow, Tick } from "@/components/motion";

/* Integrity notes raised by the current snapshot: lookalikes, pauses, session state. */

export function IntegrityNotes({ alerts, className }: { alerts: IntegrityAlert[] | undefined; className?: string }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className={className} data-testid="integrity-notes">
      <h3 className="font-display text-[26px] text-foreground">Integrity notes</h3>
      <p className="mt-2 font-mono text-[11px] text-foreground/60">
        <Tick text={String(alerts.length)} /> {alerts.length === 1 ? "note" : "notes"} raised by the current snapshot.
      </p>
      <ul className="mt-6 flex flex-col border-t border-foreground/15">
        {alerts.map((a, i) => (
          <AlertRow key={`${a.ticker ?? "all"}-${a.title}-${i}`} alert={a} />
        ))}
      </ul>
    </div>
  );
}

function AlertRow({ alert }: { alert: IntegrityAlert }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const detailRef = useRef<HTMLParagraphElement | null>(null);
  const addressParam = alert.address || alert.pairAddress;

  // Only offer "Read more" when the two-line clamp actually hides text.
  useEffect(() => {
    const el = detailRef.current;
    if (!el) return;
    const measure = () => {
      if (expanded) return;
      setClamped(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, alert.detail]);

  const tone = alert.severity === "danger" ? "text-dev-dislocated" : alert.severity === "caution" ? "text-dev-elevated" : "text-primary";

  return (
    <li className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-foreground/15 py-5 transition-colors duration-300 hover:bg-foreground/[0.04] sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]">
      <div className="flex items-baseline gap-3 font-mono text-[11.5px]">
        <span className={tone}>{alert.severity}</span>
        {alert.ticker && <span className="text-foreground/70">{alert.ticker}</span>}
      </div>
      <div className="min-w-0">
        <p className="font-sans text-[14.5px] leading-tight text-foreground/90">{alert.title}</p>
        <p ref={detailRef} className={cn("mt-2 whitespace-pre-wrap font-sans text-[14px] leading-[1.6] text-foreground/70", !expanded && "line-clamp-2")}>
          {alert.detail}
        </p>
        {(clamped || expanded) && (
          <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 font-mono text-[11px] text-foreground/70 transition-[color] duration-300 hover:text-foreground">
            {expanded ? "Show less" : "Read more"} <span className="opacity-50">→</span>
          </button>
        )}
      </div>
      {addressParam && (
        <Link href={`/check?q=${addressParam}`} className="group self-start font-mono text-[11.5px] text-foreground/70 transition-[color] duration-300 hover:text-foreground">
          Inspect <Arrow />
        </Link>
      )}
    </li>
  );
}

