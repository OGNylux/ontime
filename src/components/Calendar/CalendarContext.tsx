import { createContext, useContext } from "react";
import { CalendarEntry } from "../../services/calendarService";
import { useEntryPersistence } from "./hooks/useEntryPersistence";
import { MoveState, EntryDragStartPayload } from "./hooks/useEntryMove";
import { ResizeState, EntryResizeStartPayload } from "./hooks/useEntryResize";

export interface CalendarContextValue {
    addOrReplaceEntry: (entry: CalendarEntry) => void;
    removeEntryLocal: (id: string) => void;
    refetch: () => void;
    
    persistence: ReturnType<typeof useEntryPersistence>;
    
    entriesByDate: Record<string, CalendarEntry[]>;
    
    openCreateDialog: (dateStr: string, startMinute: number, endMinute: number, anchorPosition: { top: number; left: number }) => void;
    openEditDialog: (entry: CalendarEntry, position: { top: number; left: number } | null) => void;
    openContextMenu?: (entry: CalendarEntry, anchor: { top: number; left: number }) => void;

    moveState: MoveState | null;
    beginMove: (payload: EntryDragStartPayload) => void;
    resizeState: ResizeState | null;
    beginResize: (payload: EntryResizeStartPayload) => void;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function useCalendarContext() {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error("useCalendarContext must be used within CalendarProvider");
    }
    return context;
}

export const CalendarProvider = CalendarContext.Provider;
