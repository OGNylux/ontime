export interface EntryAttributes {
    startMinute: number;
    endMinute: number;
    title?: string;
    color?: string;
}

export interface TimeEntry extends EntryAttributes {
    id: string;
}

export interface AssignedEntry extends TimeEntry {
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
    entry: TimeEntry;
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
