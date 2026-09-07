import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "—";
  const sign = bps > 0 ? "+" : bps < 0 ? "−" : ""; // Using proper minus sign
  return `${sign}${Math.abs(bps)} bps`;
}

export function formatUsd(amount: number | null | undefined, maximumFractionDigits: number = 2): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(amount);
}

export function formatNumber(amount: number | null | undefined, maximumFractionDigits: number = 2): string {
  if (amount === null || amount === undefined) return "—";
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
  if (!iso) return "—";
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
 * Never throws: invalid or missing input yields "—" so a malformed payload
 * cannot take a page down.
 */
export function formatEt(
  iso: string | null | undefined,
  style: "datetime" | "date" | "time" = "datetime",
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
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
