/**
 * types.ts - Every shared type for the NewCalendar lives here.
 *
 * One file -> one place to look up any interface.
 */
import { CalendarEntry } from "../../services/calendarService";

//  View / Navigation 

/** Which columns are visible. */
export type ViewMode = "day" | "work_week" | "week";

/** Zoom level - how many minutes each grid row represents. */
export type ZoomLevel = 5 | 15 | 30 | 60 | 120;

/** Metadata for a single visible day column. */
export interface DayInfo {
    /** "YYYY-MM-DD" */
    dateStr: string;
    /** e.g. "14" */
    dayOfMonth: string;
    /** e.g. "Mon" */
    dayOfWeek: string;
}

//  Entry Layout 

/** An entry enriched with layout info for rendering in the day column. */
export interface LayoutEntry extends CalendarEntry {
    /** Percentage width of the day column (0-100). */
    widthPct: number;
    /** Percentage offset from the left edge (0-100). */
    offsetPct: number;
    /** CSS z-index (higher = on top). */
    zIndex: number;
    /** Visual start position in minutes from midnight. */
    startMinute: number;
    /** Visual duration in minutes. */
    durationMinutes: number;
}

//  Interactions 

/** Which edge of an entry is being resized. */
export type ResizeEdge = "top" | "bottom";

/** Describes a drag-to-create preview. */
export interface DragPreview {
    /** Top offset in pixels (relative to day container). */
    topPx: number;
    /** Height in pixels. */
    heightPx: number;
}

/** Snapshot of a persistent drag preview after mouseUp, before dialog opens. */
export interface PersistentPreview {
    /** "YYYY-MM-DD" — which day this preview belongs to */
    dateStr: string;
    startMinute: number;
    endMinute: number;
}

/** State while an entry is being moved. */
export interface MoveState {
    entry: CalendarEntry;
    fromDateStr: string;
    /** Minutes between pointer and entry start. */
    pointerOffset: number;
    durationMinutes: number;
    currentDateStr: string;
    startMinute: number;
    endMinute: number;
}

/** State while an entry is being resized. */
export interface ResizeState {
    entry: CalendarEntry;
    edge: ResizeEdge;
    /** Date the entry lives on. */
    dateStr: string;
    originalStart: number;
    originalEnd: number;
    newStart: number;
    newEnd: number;
}

//  Dialog 

export interface DialogState {
    open: boolean;
    dateStr: string;
    startTime: string;           // "HH:mm"
    endTime: string;             // "HH:mm"
    anchorPosition: { top: number; left: number } | null;
    editingEntry: CalendarEntry | null;
}

export interface ContextMenuState {
    mouseX: number;
    mouseY: number;
    entry: CalendarEntry;
}

//  Pixel helpers 

/** All the pixel-scale values derived from zoom + screen size. */
export interface PixelScale {
    /** Height of one grid row in px. */
    slotHeight: number;
    /** px per minute. */
    pxPerMin: number;
    /** px per hour (= pxPerMin × 60). */
    pxPerHour: number;
    /** Total height of the day column in px. */
    totalHeight: number;
    /** Number of grid rows. */
    slotCount: number;
}
