import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

export const TIMEZONE_OPTIONS = [
    { value: "UTC", label: "UTC" },
    { value: "Africa/Cairo", label: "Africa/Cairo (EET)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
    { value: "America/Anchorage", label: "America/Anchorage (AKST)" },
  { value: "America/Chicago", label: "America/Chicago (CST)" },
  { value: "America/Denver", label: "America/Denver (MST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Phoenix", label: "America/Phoenix (MST)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (BRT)" },
  { value: "America/Toronto", label: "America/Toronto (EST)" },
  { value: "America/Vancouver", label: "America/Vancouver (PST)" },
    { value: "Asia/Bangkok", label: "Asia/Bangkok (ICT)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (HKT)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (KST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
    { value: "Australia/Brisbane", label: "Australia/Brisbane (AEST)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST)" },
  { value: "Australia/Perth", label: "Australia/Perth (AWST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
    { value: "Europe/Amsterdam", label: "Europe/Amsterdam (CET)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "Europe/Brussels", label: "Europe/Brussels (CET)" },
  { value: "Europe/Dublin", label: "Europe/Dublin (GMT)" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki (EET)" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (TRT)" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon (WET)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (MSK)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "Europe/Rome", label: "Europe/Rome (CET)" },
  { value: "Europe/Stockholm", label: "Europe/Stockholm (CET)" },
  { value: "Europe/Vienna", label: "Europe/Vienna (CET)" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw (CET)" },
  { value: "Europe/Zurich", label: "Europe/Zurich (CET)" },
    { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (HST)" },
];

/**
 * Get the browser's detected timezone
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert a UTC ISO string to the user's timezone and return a dayjs object
 */
export function toUserTimezone(utcDateString: string, userTimezone: string): dayjs.Dayjs {
  return dayjs.utc(utcDateString).tz(userTimezone);
}

/**
 * Convert a local time in user's timezone to UTC ISO string for storage
 */
export function toUTC(localDate: dayjs.Dayjs, userTimezone: string): string {
  return localDate.tz(userTimezone, true).utc().toISOString();
}

/**
 * Parse a date string as if it's in the user's timezone and return UTC ISO
 */
export function parseAsUserTimezone(dateStr: string, userTimezone: string): string {
  return dayjs.tz(dateStr, userTimezone).utc().toISOString();
}

/**
 * Format a UTC date string for display in user's timezone
 */
export function formatInUserTimezone(utcDateString: string, userTimezone: string, format: string): string {
  return dayjs.utc(utcDateString).tz(userTimezone).format(format);
}

export { dayjs };
