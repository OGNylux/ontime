import { TaskResponseDTO } from "../../../dtos/response/Task.response.dto";

export interface EntryAttributes {
    startMinute: number;
    endMinute: number;
    taskId?: string;
    task?: TaskResponseDTO;
    title?: string; // Used for creation/display if task is not yet resolved
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
