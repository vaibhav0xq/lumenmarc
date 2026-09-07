/**
 * US equity market session calendar (NYSE/Nasdaq), maintained by LumenMarc.
 *
 * The Chainlink "Coinbase <TICKER>" feeds publish while the US market trades and hold the
 * last value on nights, weekends, holidays and corporate-action pauses. This module tells the
 * label engine whether a frozen `updatedAt` is expected (held) or anomalous (stale).
 */

export const EXCHANGE_TZ = "America/New_York";

/** Full-day closures. Observed dates. */
const HOLIDAYS: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Presidents' Day",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day (observed)",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving Day",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year's Day",
  "2027-01-18": "Martin Luther King Jr. Day",
  "2027-02-15": "Presidents' Day",
  "2027-03-26": "Good Friday",
  "2027-05-31": "Memorial Day",
  "2027-06-18": "Juneteenth (observed)",
  "2027-07-05": "Independence Day (observed)",
  "2027-09-06": "Labor Day",
  "2027-11-25": "Thanksgiving Day",
  "2027-12-24": "Christmas Day (observed)",
  // 2028: New Year's Day falls on a Saturday and is not observed by the NYSE.
  "2028-01-17": "Martin Luther King Jr. Day",
  "2028-02-21": "Presidents' Day",
  "2028-04-14": "Good Friday",
  "2028-05-29": "Memorial Day",
  "2028-06-19": "Juneteenth",
  "2028-07-04": "Independence Day",
  "2028-09-04": "Labor Day",
  "2028-11-23": "Thanksgiving Day",
  "2028-12-25": "Christmas Day",
};

/** Years whose holidays/early closes are maintained above. Outside this range weekday sessions are assumed. */
export const CALENDAR_YEARS = [2026, 2027, 2028] as const;
const warnedYears = new Set<number>();

/** 13:00 ET closes. */
const EARLY_CLOSES: Record<string, string> = {
  "2026-11-27": "Day after Thanksgiving (early close)",
  "2026-12-24": "Christmas Eve (early close)",
  "2027-11-26": "Day after Thanksgiving (early close)",
  "2028-07-03": "Day before Independence Day (early close)",
  "2028-11-24": "Day after Thanksgiving (early close)",
};

export interface EtParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
  dateKey: string; // YYYY-MM-DD
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EXCHANGE_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function toEt(date: Date): EtParts {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "0";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour")) % 24;
  return {
    year,
    month,
    day,
    hour,
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS[get("weekday")] ?? 0,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/** UTC instant for a wall-clock time in New York (handles DST by correcting the offset). */
export function etWallTimeToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  for (let i = 0; i < 3; i++) {
    const p = toEt(guess);
    const wantMinutes = Date.UTC(year, month - 1, day, hour, minute) / 60000;
    const gotMinutes = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) / 60000;
    const diff = wantMinutes - gotMinutes;
    if (diff === 0) break;
    guess.setTime(guess.getTime() + diff * 60000);
  }
  return guess;
}

function dateKeyOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(year: number, month: number, day: number, n: number): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function isTradingDay(dateKey: string, weekday: number): boolean {
  return weekday !== 0 && weekday !== 6 && !(dateKey in HOLIDAYS);
}

export interface SessionInfo {
  state: "open" | "premarket" | "afterhours" | "closed" | "holiday";
  isOpen: boolean;
  /** True on weekdays between 04:00 and 20:00 ET (extended hours) when feeds may still publish. */
  inExtendedHours: boolean;
  reason: string;
  holidayName: string | null;
  localTime: string;
  nowUtc: string;
  /** Start of the current or most recent regular session (09:30 ET). */
  lastSessionOpenUtc: string;
  nextOpenUtc: string;
  nextCloseUtc: string | null;
  /** False when `now` is outside the maintained holiday calendar; states then ignore holidays. */
  calendarCovered: boolean;
}

function closeMinutesFor(dateKey: string): number {
  return dateKey in EARLY_CLOSES ? 13 * 60 : 16 * 60;
}

function nextSessionOpen(from: EtParts, includeToday: boolean): Date {
  let { year, month, day } = from;
  const nowMinutes = from.hour * 60 + from.minute;
  for (let i = 0; i < 20; i++) {
    const key = dateKeyOf(year, month, day);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const isToday = i === 0;
    if (isTradingDay(key, weekday) && (!isToday || (includeToday && nowMinutes < 9 * 60 + 30))) {
      return etWallTimeToUtc(year, month, day, 9, 30);
    }
    ({ year, month, day } = addDays(year, month, day, 1));
  }
  throw new Error("No trading day found within 20 days");
}

function lastSessionOpen(from: EtParts): Date {
  let { year, month, day } = from;
  const nowMinutes = from.hour * 60 + from.minute;
  for (let i = 0; i < 20; i++) {
    const key = dateKeyOf(year, month, day);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const isToday = i === 0;
    if (isTradingDay(key, weekday) && (!isToday || nowMinutes >= 9 * 60 + 30)) {
      return etWallTimeToUtc(year, month, day, 9, 30);
    }
    ({ year, month, day } = addDays(year, month, day, -1));
  }
  throw new Error("No trading day found within 20 days");
}

export function getSession(now: Date = new Date()): SessionInfo {
  const et = toEt(now);
  const calendarCovered = (CALENDAR_YEARS as readonly number[]).includes(et.year);
  if (!calendarCovered && !warnedYears.has(et.year)) {
    warnedYears.add(et.year);
    console.warn(`[market/hours] No NYSE holiday calendar maintained for ${et.year}; holidays and early closes will be missed.`);
  }
  const minutes = et.hour * 60 + et.minute;
  const localTime = `${et.dateKey} ${String(et.hour).padStart(2, "0")}:${String(et.minute).padStart(2, "0")} ET`;
  const weekend = et.weekday === 0 || et.weekday === 6;
  const holidayName = HOLIDAYS[et.dateKey] ?? null;
  const trading = isTradingDay(et.dateKey, et.weekday);
  const closeMinutes = closeMinutesFor(et.dateKey);
  const inExtendedHours = trading && minutes >= 4 * 60 && minutes < 20 * 60;

  let state: SessionInfo["state"];
  let reason: string;
  let nextCloseUtc: string | null = null;
  if (holidayName) {
    state = "holiday";
    reason = `${holidayName} — US market closed`;
  } else if (weekend) {
    state = "closed";
    reason = "Weekend — US market closed";
  } else if (minutes < 4 * 60) {
    state = "closed";
    reason = "Overnight — US market closed";
  } else if (minutes < 9 * 60 + 30) {
    state = "premarket";
    reason = "Pre-market — regular session opens 09:30 ET";
  } else if (minutes < closeMinutes) {
    state = "open";
    reason = et.dateKey in EARLY_CLOSES ? `Regular session (early close 13:00 ET — ${EARLY_CLOSES[et.dateKey]})` : "Regular session";
    nextCloseUtc = etWallTimeToUtc(et.year, et.month, et.day, Math.floor(closeMinutes / 60), closeMinutes % 60).toISOString();
  } else if (minutes < 20 * 60) {
    state = "afterhours";
    reason = "After-hours — regular session closed at " + (closeMinutes === 13 * 60 ? "13:00" : "16:00") + " ET";
  } else {
    state = "closed";
    reason = "Evening — US market closed";
  }
  if (!calendarCovered) reason += ` (holiday calendar not maintained for ${et.year})`;

  return {
    state,
    isOpen: state === "open",
    inExtendedHours,
    reason,
    holidayName,
    localTime,
    nowUtc: now.toISOString(),
    lastSessionOpenUtc: lastSessionOpen(et).toISOString(),
    nextOpenUtc: nextSessionOpen(et, true).toISOString(),
    nextCloseUtc,
    calendarCovered,
  };
}
