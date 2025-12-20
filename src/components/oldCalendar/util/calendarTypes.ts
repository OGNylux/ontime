import { CalendarEntry } from "../../../services/calendarService";

export type { CalendarEntry };

export interface AssignedEntry extends CalendarEntry {
    startMinute: number;
    endMinute: number;
    widthPercent: number;
    offsetPercent: number;
    zIndex: number;
}

export interface DragState {
    active: boolean;
    startMinute: number | null;
    endMinute: number | null;
}

export interface MoveState {
    entry: CalendarEntry;
    fromDateStr: string;
    pointerOffset: number;
    duration: number;
    currentDateStr: string;
    startMinute: number;
    endMinute: number;
}

export interface EntryDragStartPayload {
    dateStr: string;
    entryId: string;
    pointerOffset: number;
    clientX: number;
    clientY: number;
}

export interface WeekDayInfo {
    id: number;
    dateStr: string;
    dayOfTheMonth: string;
    dayOfTheWeek: string;
}

export type EntriesByDay = Record<string, CalendarEntry[]>;
export type ViewMode = 'week' | 'work_week' | 'day';
