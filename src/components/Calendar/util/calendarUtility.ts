import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import { ENTRY_MARGIN_PERCENT, MIN_ENTRY_WIDTH, OVERLAP_PERCENT, SCALE_MULTIPLIER } from "./calendarConfig";

// Extended entry type with layout info
export interface AssignedEntry extends CalendarEntry {
    widthPercent: number;
    offsetPercent: number;
    zIndex: number;
    visualStartMinute: number;
    visualDuration: number;
}

export type ResizeHandlePosition = 'top' | 'bottom';

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const HOURS_PER_DAY = 24;
export const INTERVAL_MINUTES = 15;

export const HOUR_ARRAY = Array.from({ length: HOURS_PER_DAY }).map((_, i) => i);

export const pixelPerMinute = (hourHeight: number) => hourHeight / MINUTES_PER_HOUR;

const INNER_SCALE = (100 - ENTRY_MARGIN_PERCENT * 2) / 100;

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const clampPercent = (value: number) => clamp(value, 0, 100);
export const clampMinute = (minute: number) => clamp(minute, 0, MINUTES_PER_DAY);
export const snap = (value: number) => Math.round(value / INTERVAL_MINUTES) * INTERVAL_MINUTES;

export function formatTime(hourOrMinute: number, useMinutes: boolean = false) {
    if (useMinutes) {
        const hour = Math.floor(hourOrMinute / MINUTES_PER_HOUR);
        const minute = hourOrMinute % MINUTES_PER_HOUR;
        return dayjs().hour(hour).minute(minute).format("h:mm A");
    }
    return dayjs().hour(hourOrMinute).format("h:00 A");
}

export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / MINUTES_PER_HOUR);
    const m = minutes % MINUTES_PER_HOUR;
    return dayjs().hour(h).minute(m).format("HH:mm");
}

export function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * MINUTES_PER_HOUR + m;
}

export function roundTo15Minutes(minute: number) {
    return Math.round(minute / 15) * 15;
}

export function formatDuration(minutes: number) {
    if (!minutes || minutes <= 0) return "0m";
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) {
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    return `${mins}m`;
}

/**
 * Assigns layout properties (width, offset, zIndex) to overlapping entries.
 * Entries that overlap are placed side by side with some visual overlap.
 * When the second entry starts after the first entry's title area, it gets 30% more width.
 */
export function assignEntryLayout(
    entries: CalendarEntry[],
    hourHeight: number = 40,
    titleHeightPx: number = 30,
    dateStr?: string
): AssignedEntry[] {
    if (!entries.length) return [];

    // 1. Prepare and sort entries
    const sorted = entries.map(entry => {
        const start = dayjs(entry.start_time);
        const end = dayjs(entry.end_time);
        
        // If dateStr provided, clamp to day boundaries for layout only
        let startMinute: number;
        let endMinute: number;
        
        if (dateStr) {
            const dayStart = dayjs(dateStr).startOf('day');
            const dayEnd = dayStart.endOf('day');
            const clampedStart = start.isBefore(dayStart) ? dayStart : start;
            const clampedEnd = end.isAfter(dayEnd) ? dayEnd : end;
            // Include seconds for precise positioning
            startMinute = clampedStart.hour() * MINUTES_PER_HOUR + clampedStart.minute() + clampedStart.second() / 60;
            endMinute = clampedEnd.hour() * MINUTES_PER_HOUR + clampedEnd.minute() + clampedEnd.second() / 60;
        } else {
            // Include seconds for precise positioning
            startMinute = start.hour() * MINUTES_PER_HOUR + start.minute() + start.second() / 60;
            const duration = end.diff(start, 'minute', true); // true for floating point
            endMinute = startMinute + duration;
        }
        
        return { ...entry, startMinute, endMinute };
    }).sort((a, b) => (a.startMinute - b.startMinute) || (a.endMinute - b.endMinute));

    // 2. Assign columns (greedy packing)
    const columnEnds: number[] = [];
    const assignedColumns = new Map<string, number>();

    for (const entry of sorted) {
        let col = columnEnds.findIndex(end => end <= entry.startMinute);
        if (col === -1) {
            col = columnEnds.length;
            columnEnds.push(entry.endMinute);
        } else columnEnds[col] = entry.endMinute;

        assignedColumns.set(entry.id, col);
    }

    // 3. Calculate concurrency per entry
    // Build timeline intervals from unique start/end points
    const points = Array.from(new Set(sorted.flatMap(e => [e.startMinute, e.endMinute]))).sort((a, b) => a - b);
    
    const intervals = [];
    for (let i = 0; i < points.length - 1; i++) {
        const s = points[i];
        const e = points[i + 1];
        // Count how many entries overlap this specific interval
        const concurrency = sorted.reduce((cnt, en) => (en.startMinute <= s && en.endMinute > s) ? cnt + 1 : cnt, 0);
        intervals.push({ start: s, end: e, concurrency });
    }

    const maxConcurrencyById = new Map<string, number>();
    for (const entry of sorted) {
        let maxC = 1;
        for (const iv of intervals) {
            if (iv.end <= entry.startMinute) continue;
            if (iv.start >= entry.endMinute) break;
            maxC = Math.max(maxC, iv.concurrency);
        }
        maxConcurrencyById.set(entry.id, maxC);
    }

    // 4. Compute final layout props
    const titleMinutes = (titleHeightPx / hourHeight) * MINUTES_PER_HOUR;

    return sorted.map(entry => {
        const col = assignedColumns.get(entry.id) ?? 0;
        const concurrency = maxConcurrencyById.get(entry.id) ?? 1;

        // Base width and offset
        let widthPercent = Math.max(MIN_ENTRY_WIDTH, 100 / concurrency);
        let offsetPercent = col * (100 / concurrency);

        // Rule: If 2 entries overlap and the 2nd one starts after the 1st one's title, expand it
        if (concurrency === 2 && col === 1) {
            const overlappingEntry = sorted.find(other => {
                const otherCol = assignedColumns.get(other.id);
                if (otherCol !== 0) return false;
                // Check overlap
                return Math.max(entry.startMinute, other.startMinute) < Math.min(entry.endMinute, other.endMinute);
            });

            if (overlappingEntry && entry.startMinute >= overlappingEntry.startMinute + titleMinutes) {
                const newWidth = widthPercent * SCALE_MULTIPLIER;
                const diff = newWidth - widthPercent;
                widthPercent = newWidth;
                offsetPercent = Math.max(0, offsetPercent - diff);
            }
        }

        // Clamp to 100%
        if (offsetPercent + widthPercent > 100) offsetPercent = Math.max(0, 100 - widthPercent);

        // Apply inner margins and scale
        let scaledOffset = ENTRY_MARGIN_PERCENT + offsetPercent * INNER_SCALE;
        let scaledWidth = widthPercent * INNER_SCALE;

        // Apply visual overlap for adjacent columns
        if (concurrency > 1 && OVERLAP_PERCENT > 0) {
            const extraWidth = OVERLAP_PERCENT;
            const shiftPerCol = (OVERLAP_PERCENT * (col / Math.max(1, concurrency))) || 0;

            scaledWidth = Math.min(100 - ENTRY_MARGIN_PERCENT - scaledOffset, scaledWidth + extraWidth);
            scaledOffset = Math.max(ENTRY_MARGIN_PERCENT, scaledOffset - shiftPerCol);
        }

        // Final safety clamps
        if (scaledOffset + scaledWidth > 100) scaledWidth = Math.max(MIN_ENTRY_WIDTH, 100 - scaledOffset);
        
        if (scaledWidth < MIN_ENTRY_WIDTH) {
            scaledWidth = MIN_ENTRY_WIDTH;
            if (scaledOffset + scaledWidth > 100) scaledOffset = Math.max(ENTRY_MARGIN_PERCENT, 100 - scaledWidth);
        }

        // Return original entry with layout props
        const { startMinute, endMinute, ...originalEntry } = entry;
        return {
            ...originalEntry,
            widthPercent: scaledWidth,
            offsetPercent: scaledOffset,
            zIndex: 2 + col,
            visualStartMinute: startMinute,
            visualDuration: endMinute - startMinute,
        };
    });
}
