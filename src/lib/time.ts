import { addDays, format, parseISO } from "date-fns";

export function todayInTimeZone(tz: string): string {
  // en-CA gives YYYY-MM-DD reliably
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftDateString(date: string, deltaDays: number): string {
  // Use a UTC noon anchor to avoid DST edge issues.
  const base = new Date(`${date}T12:00:00Z`);
  const next = addDays(base, deltaDays);
  return format(next, "yyyy-MM-dd");
}

export function formatTime(iso: string, tz: string): string {
  const dt = parseISO(iso);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

export function formatDateTime(iso: string, tz: string): string {
  const dt = parseISO(iso);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

