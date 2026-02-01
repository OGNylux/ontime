import { useState, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import { clamp, clampMinute, MINUTES_PER_DAY, ResizeHandlePosition, snap, findDayElement, lockBody, unlockBody, getClientCoords } from "../util/calendarUtility";

export interface ResizeState {
    entry: CalendarEntry;
    handle: ResizeHandlePosition;
    dateStr: string; 
    originalStartMinute: number;
    originalEndMinute: number;
    newStartMinute: number;
    newEndMinute: number;
}

export interface EntryResizeStartPayload {
    dateStr: string;
    entryId: string;
    handle: ResizeHandlePosition;
    clientY: number;
}

export type EntriesByDay = Record<string, CalendarEntry[]>;

export function useEntryResize(
    entriesByDay: EntriesByDay,
    onResizeCommit: (dateStr: string, entryId: string, startMinute: number, endMinute: number) => Promise<void>
) {
    const [resizeState, setResizeState] = useState<ResizeState | null>(null);

    const calculateResizePosition = useCallback((clientX: number, clientY: number, state: ResizeState) => {
        const dayElement = findDayElement(clientX, clientY);
        if (!dayElement) return null;

        const dateStr = dayElement.getAttribute("data-date");
        if (!dateStr) return null;

        const rect = dayElement.getBoundingClientRect();
        if (rect.height <= 0) return null;

        const offsetY = clamp(clientY - rect.top, 0, rect.height);
        const fractionOfDay = offsetY / rect.height;
        const minutesFromTop = fractionOfDay * MINUTES_PER_DAY;
        const pointerMinute = clampMinute(snap(minutesFromTop));

        let newStart = state.newStartMinute;
        let newEnd = state.newEndMinute;

        const dayDiff = dayjs(dateStr).diff(dayjs(state.dateStr), 'day');
        const absolutePointerMinute = pointerMinute + (dayDiff * MINUTES_PER_DAY);

        if (state.handle === 'top') {
            newStart = absolutePointerMinute;
            if (newStart > state.originalEndMinute - 15) {
                newStart = state.originalEndMinute - 15;
            }
        } else {
            newEnd = absolutePointerMinute;
            if (newEnd < state.originalStartMinute + 15) {
                newEnd = state.originalStartMinute + 15;
            }
        }

        return { 
            newStartMinute: newStart, 
            newEndMinute: newEnd,
            targetDateStr: state.dateStr 
        };
    }, []);

    const commitResize = useCallback(async (state: ResizeState) => {
        await onResizeCommit(state.dateStr, state.entry.id, state.newStartMinute, state.newEndMinute);
    }, [onResizeCommit]);

    const beginResize = useCallback((payload: EntryResizeStartPayload) => {
        setResizeState(prev => {
            if (prev) return prev;

            let clickedEntry: CalendarEntry | undefined;
            const dayEntries = entriesByDay[payload.dateStr];
            if (dayEntries) {
                clickedEntry = dayEntries.find(e => e.id === payload.entryId);
            }
            if (!clickedEntry) {
                 Object.values(entriesByDay).forEach(entries => {
                     if (!clickedEntry) clickedEntry = entries.find(e => e.id === payload.entryId);
                 });
            }

            if (!clickedEntry) return prev;

            const start = dayjs(clickedEntry.start_time);
            const end = dayjs(clickedEntry.end_time);
            
            const dayStart = dayjs(payload.dateStr).startOf('day');
            const startMinute = start.diff(dayStart, 'minute');
            const endMinute = end.diff(dayStart, 'minute');

            return {
                entry: clickedEntry,
                handle: payload.handle,
                dateStr: payload.dateStr,
                originalStartMinute: startMinute,
                originalEndMinute: endMinute,
                newStartMinute: startMinute,
                newEndMinute: endMinute,
            };
        });
    }, [entriesByDay]);

    useEffect(() => {
        if (!resizeState) return;

        const originalStyles = lockBody();

        const handleMouseMove = (event: globalThis.MouseEvent | globalThis.TouchEvent | globalThis.PointerEvent) => {
            setResizeState(prev => {
                if (!prev) return prev;
                const { clientX, clientY } = getClientCoords(event as MouseEvent | TouchEvent | PointerEvent);

                const next = calculateResizePosition(clientX, clientY, prev);
                if (!next) return prev;
                
                if (next.newStartMinute === prev.newStartMinute && next.newEndMinute === prev.newEndMinute) {
                    return prev;
                }

                return {
                    ...prev,
                    newStartMinute: next.newStartMinute,
                    newEndMinute: next.newEndMinute,
                };
            });
        };

        const handleMouseUp = (event: globalThis.MouseEvent | globalThis.TouchEvent | globalThis.PointerEvent) => {
            setResizeState(prev => {
                if (!prev) return prev;
                const { clientX, clientY } = getClientCoords(event as MouseEvent | TouchEvent | PointerEvent, false);


                const next = calculateResizePosition(clientX, clientY, prev);
                const finalStart = next ? next.newStartMinute : prev.newStartMinute;
                const finalEnd = next ? next.newEndMinute : prev.newEndMinute;

                commitResize({ ...prev, newStartMinute: finalStart, newEndMinute: finalEnd });
                return null;
            });
        };

        window.addEventListener("pointermove", handleMouseMove as any);
        window.addEventListener("pointerup", handleMouseUp as any);
        window.addEventListener("pointercancel", handleMouseUp as any);

        window.addEventListener("touchmove", handleMouseMove as any, { passive: false } as AddEventListenerOptions);
        window.addEventListener("touchend", handleMouseUp as any);
        
        window.addEventListener("mousemove", handleMouseMove as any);
        window.addEventListener("mouseup", handleMouseUp as any);

        return () => {
            window.removeEventListener("pointermove", handleMouseMove as any);
            window.removeEventListener("pointerup", handleMouseUp as any);
            window.removeEventListener("pointercancel", handleMouseUp as any);

            window.removeEventListener("touchmove", handleMouseMove as any);
            window.removeEventListener("touchend", handleMouseUp as any);

            window.removeEventListener("mousemove", handleMouseMove as any);
            window.removeEventListener("mouseup", handleMouseUp as any);
            unlockBody(originalStyles);
        };
    }, [resizeState, calculateResizePosition, commitResize]);

    return {
        resizeState,
        beginResize
    };
}
