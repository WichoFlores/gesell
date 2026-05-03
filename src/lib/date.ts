import {
  format,
  isThisWeek,
  isToday,
  isYesterday,
  startOfWeek,
} from "date-fns";

export function todayDdMmYyyy(): string {
  return format(new Date(), "dd/MM/yyyy");
}

export type SessionGroupKey = "today" | "yesterday" | "thisWeek" | "earlier";

export function groupKey(timestamp: number): SessionGroupKey {
  const d = new Date(timestamp);
  if (isToday(d)) return "today";
  if (isYesterday(d)) return "yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "thisWeek";
  return "earlier";
}

export function groupLabel(key: SessionGroupKey): string {
  switch (key) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "thisWeek":
      return "This week";
    case "earlier":
      return "Earlier";
  }
}

export function timeLabel(timestamp: number): string {
  const d = new Date(timestamp);
  if (isToday(d) || isYesterday(d)) return format(d, "HH:mm");
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEE HH:mm");
  // older than this week
  if (d >= startOfWeek(new Date(), { weekStartsOn: 1 })) return format(d, "EEE HH:mm");
  return format(d, "MMM d");
}
