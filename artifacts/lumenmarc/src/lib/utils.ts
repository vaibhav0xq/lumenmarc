import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "no reading";
  return `${formatBpsBare(bps)} bps`;
}

/** "+928" / "−21" / "0": the figure alone, with a true minus sign, for places that label the unit separately. */
export function formatBpsBare(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "no reading";
  const sign = bps > 0 ? "+" : bps < 0 ? "−" : "";
  return `${sign}${Math.abs(Math.round(bps))}`;
}

export function formatUsd(amount: number | null | undefined, maximumFractionDigits: number = 2): string {
  if (amount === null || amount === undefined) return "unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(amount);
}

export function formatNumber(amount: number | null | undefined, maximumFractionDigits: number = 2): string {
  if (amount === null || amount === undefined) return "unavailable";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(amount);
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Compact "12s ago" / "3m ago" relative time; falls back to the ISO string if unparsable. */
export function formatAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "unknown";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

/**
 * Format an ISO timestamp in the US market's zone with an explicit "ET" label.
 * Never throws: invalid or missing input yields "unknown" so a malformed payload
 * cannot take a page down.
 */
export function formatEt(
  iso: string | null | undefined,
  style: "datetime" | "date" | "time" = "datetime",
): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const opts: Intl.DateTimeFormatOptions =
    style === "date"
      ? { month: "short", day: "numeric", year: "numeric" }
      : style === "time"
        ? { hour: "2-digit", minute: "2-digit", hour12: false }
        : { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false };
  return `${new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", ...opts }).format(d)} ET`;
}

/**
 * The API's own explanation of a failed read. The generated client throws
 * ApiError with the JSON body on `.data` ({ error: string }); fall back to the
 * error message, never to an invented one.
 */
export function apiErrorMessage(error: unknown, fallback = "Request failed."): string {
  if (error && typeof error === "object") {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object") {
      const msg = (data as { error?: unknown; message?: unknown }).error ?? (data as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

/** "$11.5M" / "$7.58M" / "$843K": for headline facts where the exact figure lives elsewhere. */
export function formatUsdCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: amount >= 1e7 ? 1 : 2,
  }).format(amount);
}

/**
 * Why a token has no deviation figure. Mirrors the API's rules: no supply, no
 * pool or a pool quoted in something other than a USD stablecoin.
 */
export function unpricedReason(stock: {
  status: "live" | "no-supply";
  primaryVenue: { premiumBps: number | null; quoteToken: { symbol: string } } | null;
  reference?: { state: string } | null;
}): string | null {
  if (stock.primaryVenue && stock.primaryVenue.premiumBps !== null) return null;
  if (stock.status === "no-supply") return "No supply minted";
  if (!stock.primaryVenue) return "No USD pool";
  if (stock.reference && stock.reference.state === "unavailable") return "Reference unavailable";
  return `Pool quoted in ${stock.primaryVenue.quoteToken.symbol}`;
}

/**
 * The reference price to print (null when the feed did not answer). The API
 * carries a failed feed with price 0 and state "unavailable"; that zero is a
 * sentinel, never a price.
 */
export function referencePrice(ref: { price: number; state: string } | null | undefined): number | null {
  if (!ref || ref.state === "unavailable") return null;
  return ref.price;
}

export const DEVIATION_LABEL = {
  fair: "Fair",
  elevated: "Elevated",
  dislocated: "Dislocated",
  unpriced: "Unpriced",
} as const;

export const SESSION_LABEL: Record<string, string> = {
  open: "US market open",
  premarket: "US pre-market",
  afterhours: "US after hours",
  closed: "US market closed",
  holiday: "US market closed",
};

/**
 * Session summary for the navigation chip and the console header.
 * "US market open · closes 16:00 ET" / "US market closed · Labor Day" / "US market closed · opens Tue, Sep 8, 09:30 ET".
 */
export function sessionSummary(market: {
  isOpen: boolean;
  holidayName?: string | null;
  nextOpenUtc?: string | null;
  nextCloseUtc?: string | null;
  reason: string;
}): { label: string; detail: string | null } {
  if (market.isOpen) {
    return { label: "US market open", detail: market.nextCloseUtc ? `closes ${formatEt(market.nextCloseUtc, "time")}` : null };
  }
  if (market.holidayName) return { label: "US market closed", detail: market.holidayName };
  return {
    label: "US market closed",
    detail: market.nextOpenUtc ? `opens ${formatEt(market.nextOpenUtc, "datetime")}` : market.reason,
  };
}

/** "+0.92%" / "−3.60%" from basis points; null → "no reading". */
export function formatBpsPct(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return "no reading";
  const pct = bps / 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

/** "4h 35m" / "52m" / "3d 2h" for a coverage span in milliseconds. */
export function formatSpan(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}
