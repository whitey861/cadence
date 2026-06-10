// All dates are stored UTC and displayed in Australia/Sydney.
const formatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatInTimeZone(isoDate: string): string {
  return formatter.format(new Date(isoDate));
}

const dateOnlyFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(isoDate: string): string {
  return dateOnlyFormatter.format(new Date(isoDate));
}
