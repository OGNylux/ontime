import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import { ENTRY_MARGIN_PERCENT, MIN_ENTRY_WIDTH, OVERLAP_PERCENT, SCALE_MULTIPLIER } from "./calendarConfig";


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
    if (!minutes || minutes <= 0) return "0:00:00";
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    return `${hrs}:${mins.toString().padStart(2, '0')}:00`;
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
    
    const sorted = entries.map(entry => {
        const start = dayjs(entry.start_time);
        const end = dayjs(entry.end_time);
        
        let startMinute: number;
        let endMinute: number;
        
        if (dateStr) {
            const dayStart = dayjs(dateStr).startOf('day');
            const dayEnd = dayStart.endOf('day');
            const clampedStart = start.isBefore(dayStart) ? dayStart : start;
            const clampedEnd = end.isAfter(dayEnd) ? dayEnd : end;
            
            startMinute = clampedStart.hour() * MINUTES_PER_HOUR + clampedStart.minute() + clampedStart.second() / 60;
            endMinute = clampedEnd.hour() * MINUTES_PER_HOUR + clampedEnd.minute() + clampedEnd.second() / 60;
        } else {
            
            startMinute = start.hour() * MINUTES_PER_HOUR + start.minute() + start.second() / 60;
            const duration = end.diff(start, 'minute', true); 
            endMinute = startMinute + duration;
        }
        
        return { ...entry, startMinute, endMinute };
    }).sort((a, b) => (a.startMinute - b.startMinute) || (a.endMinute - b.endMinute));

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

    const points = Array.from(new Set(sorted.flatMap(e => [e.startMinute, e.endMinute]))).sort((a, b) => a - b);
    
    const intervals = [];
    for (let i = 0; i < points.length - 1; i++) {
        const s = points[i];
        const e = points[i + 1];
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

    const titleMinutes = (titleHeightPx / hourHeight) * MINUTES_PER_HOUR;

    return sorted.map(entry => {
        const col = assignedColumns.get(entry.id) ?? 0;
        const concurrency = maxConcurrencyById.get(entry.id) ?? 1;

        let widthPercent = Math.max(MIN_ENTRY_WIDTH, 100 / concurrency);
        let offsetPercent = col * (100 / concurrency);
        
        if (concurrency === 2 && col === 1) {
            const overlappingEntry = sorted.find(other => {
                const otherCol = assignedColumns.get(other.id);
                if (otherCol !== 0) return false;
                
                return Math.max(entry.startMinute, other.startMinute) < Math.min(entry.endMinute, other.endMinute);
            });

            if (overlappingEntry && entry.startMinute >= overlappingEntry.startMinute + titleMinutes) {
                const newWidth = widthPercent * SCALE_MULTIPLIER;
                const diff = newWidth - widthPercent;
                widthPercent = newWidth;
                offsetPercent = Math.max(0, offsetPercent - diff);
            }
        }
        
        if (offsetPercent + widthPercent > 100) offsetPercent = Math.max(0, 100 - widthPercent);

        let scaledOffset = ENTRY_MARGIN_PERCENT + offsetPercent * INNER_SCALE;
        let scaledWidth = widthPercent * INNER_SCALE;
        
        if (concurrency > 1 && OVERLAP_PERCENT > 0) {
            const extraWidth = OVERLAP_PERCENT;
            const shiftPerCol = (OVERLAP_PERCENT * (col / Math.max(1, concurrency))) || 0;

            scaledWidth = Math.min(100 - ENTRY_MARGIN_PERCENT - scaledOffset, scaledWidth + extraWidth);
            scaledOffset = Math.max(ENTRY_MARGIN_PERCENT, scaledOffset - shiftPerCol);
        }
        
        if (scaledOffset + scaledWidth > 100) scaledWidth = Math.max(MIN_ENTRY_WIDTH, 100 - scaledOffset);
        if (scaledWidth < MIN_ENTRY_WIDTH) {
            scaledWidth = MIN_ENTRY_WIDTH;
            if (scaledOffset + scaledWidth > 100) scaledOffset = Math.max(ENTRY_MARGIN_PERCENT, 100 - scaledWidth);
        }

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

export interface BodyStyles {
    overflow: string;
    touchAction: string;
    userSelect: string;
    webkitUserSelect: string;
}

export function findDayElement(clientX: number, clientY: number): HTMLElement | null {
    if (typeof document === "undefined") return null;
    for (const el of document.elementsFromPoint(clientX, clientY)) {
        const dayEl = el.closest<HTMLElement>("[data-date]");
        if (dayEl) return dayEl;
    }
    return null;
}

export function lockBody(): BodyStyles {
    const original: BodyStyles = {
        overflow: document.body.style.overflow,
        touchAction: document.body.style.touchAction,
        userSelect: document.body.style.userSelect,
        webkitUserSelect: (document.body.style as CSSStyleDeclaration).webkitUserSelect || "",
    };
    Object.assign(document.body.style, {
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        webkitUserSelect: "none",
    });
    return original;
}

export function unlockBody(original: BodyStyles): void {
    Object.assign(document.body.style, {
        overflow: original.overflow,
        touchAction: original.touchAction,
        userSelect: original.userSelect,
        webkitUserSelect: original.webkitUserSelect,
    });
}

export function getClientCoords(event: MouseEvent | TouchEvent | PointerEvent, useTouches = true): { clientX: number; clientY: number } {
    if (useTouches && 'touches' in event && event.touches.length) {
        return { clientX: event.touches[0].clientX, clientY: event.touches[0].clientY };
    }
    if (useTouches && 'changedTouches' in event && event.changedTouches.length) {
        return { clientX: event.changedTouches[0].clientX, clientY: event.changedTouches[0].clientY };
    }
    return { clientX: (event as MouseEvent).clientX, clientY: (event as MouseEvent).clientY };
}
