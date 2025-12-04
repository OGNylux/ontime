import dayjs from "dayjs";
import { AssignedEntry, TimeEntry } from "./calendarTypes";

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const HOURS_PER_DAY = 24;
export const INTERVAL_MINUTES = 15;

export function formatTime(hourOrMinute: number, useMinutes: boolean = false) {
    if (useMinutes) {
        const hour = Math.floor(hourOrMinute / 60);
        const minute = hourOrMinute % 60;
        return dayjs().hour(hour).minute(minute).format("h:mm A");
    }
    return dayjs().hour(hourOrMinute).format("h:00 A");
}

export function roundTo15Minutes(minute: number) {
    return Math.round(minute / 15) * 15;
}

const OVERLAP_PERCENT = 4;
const MIN_WIDTH = 22;
export const ENTRY_MARGIN_PERCENT = 4;
const INNER_SCALE = (100 - ENTRY_MARGIN_PERCENT * 2) / 100;

export function assignEntryLayout(entries: TimeEntry[]): AssignedEntry[] {
    if (!entries.length) return [];

    // Layout algorithm summary:
    // 1. Sort entries by start time.
    // 2. Greedily assign each entry to the first free column (interval
    //    partitioning). `columnEnds` tracks end times per column.
    // 3. Build a list of timeline intervals and compute concurrency per
    //    interval so we can determine the maximum concurrency that affects
    //    each entry (this determines how many columns wide it should be).
    // 4. Compute width and left offset in percent, apply inner margins and
    //    minimum width constraints, and return annotated entries.

    const sorted = [...entries].sort((a, b) => (a.startMinute - b.startMinute) || (a.endMinute - b.endMinute));

    // Assign a column index to each entry (greedy reuse of freed columns)
    const columnEnds: number[] = []; // endMinute per column
    const assignedColumns: Map<string, number> = new Map();

    for (const entry of sorted) {
        // find first free column
        let found = -1;
        for (let i = 0; i < columnEnds.length; i++) {
            if (columnEnds[i] <= entry.startMinute) {
                found = i;
                break;
            }
        }
        if (found === -1) {
            found = columnEnds.length;
            columnEnds.push(entry.endMinute);
        } else {
            columnEnds[found] = entry.endMinute;
        }
        assignedColumns.set(entry.id, found);
    }

    // Build timeline intervals from unique event points (start and end times)
    const points = Array.from(new Set(entries.flatMap(e => [e.startMinute, e.endMinute]))).sort((a, b) => a - b);
    const intervals: { start: number; end: number; concurrency: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const s = points[i];
        const e = points[i + 1];
        const concurrency = entries.reduce((cnt, en) => (en.startMinute <= s && en.endMinute > s ? cnt + 1 : cnt), 0);
        intervals.push({ start: s, end: e, concurrency });
    }

    // For each entry compute the max concurrency over intervals it overlaps
    const maxConcurrencyById: Map<string, number> = new Map();
    for (const entry of entries) {
        let maxC = 1;
        for (const iv of intervals) {
            if (iv.end <= entry.startMinute) continue;
            if (iv.start >= entry.endMinute) break;
            maxC = Math.max(maxC, iv.concurrency);
        }
        maxConcurrencyById.set(entry.id, maxC);
    }

    // Prepare annotated entries
    const annotated: AssignedEntry[] = [];

    for (const entry of sorted) {
        const col = assignedColumns.get(entry.id) ?? 0;
        const concurrency = maxConcurrencyById.get(entry.id) ?? 1;

        // width and offset in percent
        let widthPercent = Math.max(MIN_WIDTH, 100 / concurrency);
        let offsetPercent = col * (100 / concurrency);

        if (offsetPercent + widthPercent > 100) {
            offsetPercent = Math.max(0, 100 - widthPercent);
        }

        // apply inner scale and margins
        let scaledOffset = ENTRY_MARGIN_PERCENT + offsetPercent * INNER_SCALE;
        let scaledWidth = widthPercent * INNER_SCALE;

        // Apply overlap percentage so adjacent concurrent entries slightly
        // overlap visually. We increase the width a bit and shift the offset
        // left for later columns to create the overlap. Ensure we don't
        // overflow the 0..100% range after adjustments.
        if (concurrency > 1 && OVERLAP_PERCENT > 0) {
            const extraWidth = OVERLAP_PERCENT; // percent points to add to each entry
            const shiftPerCol = (OVERLAP_PERCENT * (col / Math.max(1, concurrency))) || 0;

            scaledWidth = Math.min(100 - ENTRY_MARGIN_PERCENT - scaledOffset, scaledWidth + extraWidth);
            scaledOffset = Math.max(ENTRY_MARGIN_PERCENT, scaledOffset - shiftPerCol);
        }

        if (scaledOffset + scaledWidth > 100) scaledWidth = Math.max(MIN_WIDTH, 100 - scaledOffset);

        if (scaledWidth < MIN_WIDTH) {
            scaledWidth = MIN_WIDTH;
            if (scaledOffset + scaledWidth > 100) scaledOffset = Math.max(ENTRY_MARGIN_PERCENT, 100 - scaledWidth);
        }

        annotated.push({ ...entry, widthPercent: scaledWidth, offsetPercent: scaledOffset, zIndex: 2 });
    }

    return annotated;
}


