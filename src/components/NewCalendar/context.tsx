/**
 * CalendarContext - shared state flowing from NewCalendar down to every child.
 *
 * Grouped by concern:
 *   Data        - byDate, addOrReplace, removeLocal, refetch
 *   Actions     - actions (CRUD helpers)
 *   Dialogs     - openCreate, openEdit, openMenu
 *   Interactions - moveState/beginMove, resizeState/beginResize
 */
import { createContext, useContext } from "react";
import { CalendarEntry } from "../../services/calendarService";
import type { MoveState, ResizeState } from "./types";
import type { MoveStartPayload } from "./hooks/useDragToMove";
import type { ResizeStartPayload } from "./hooks/useDragToResize";
import type { useEntryActions } from "./hooks/useEntryActions";

export interface CalendarContextValue {
    byDate: Record<string, CalendarEntry[]>;
    addOrReplace: (e: CalendarEntry) => void;
    removeLocal: (id: string) => void;
    refetch: () => void;

    // CRUD
    actions: ReturnType<typeof useEntryActions>;

    // dialog openers
    openCreate: (dateStr: string, startMin: number, endMin: number, anchor: { top: number; left: number }) => void;
    openEdit: (entry: CalendarEntry, pos: { top: number; left: number } | null) => void;
    openMenu?: (entry: CalendarEntry, anchor: { top: number; left: number }) => void;

    // move / resize
    moveState: MoveState | null;
    beginMove: (p: MoveStartPayload) => void;
    resizeState: ResizeState | null;
    beginResize: (p: ResizeStartPayload) => void;
}

const Ctx = createContext<CalendarContextValue | null>(null);

export function useCalendar() {
    const v = useContext(Ctx);
    if (!v) throw new Error("useCalendar must be used inside CalendarProvider");
    return v;
}

export const CalendarProvider = Ctx.Provider;
