import { useState, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import { clamp, clampMinute, MINUTES_PER_DAY, ResizeHandlePosition, snap } from "../util/calendarUtility";

export interface ResizeState {
    entry: CalendarEntry;
    handle: ResizeHandlePosition;
    dateStr: string; // The day where the resize started (usually the day column)
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

// Find the nearest ancestor element under the pointer that is a day column
const findDayElement = (clientX: number, clientY: number) => {
    if (typeof document === "undefined") return null;
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const element of elements) {
        const dayElement = element.closest<HTMLElement>("[data-date]");
        if (dayElement) return dayElement;
    }
    return null;
};

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

        // For simplicity, we might restrict resizing to the same day for now, 
        // or handle multi-day resizing if needed. 
        // If the user drags to another day, we could support it, but let's start with same-day logic 
        // or simple overflow logic.
        
        // Actually, let's stick to the day column logic.
        const rect = dayElement.getBoundingClientRect();
        if (rect.height <= 0) return null;

        const offsetY = clamp(clientY - rect.top, 0, rect.height);
        const fractionOfDay = offsetY / rect.height;
        const minutesFromTop = fractionOfDay * MINUTES_PER_DAY;
        const pointerMinute = clampMinute(snap(minutesFromTop));

        // Calculate new start/end based on handle
        let newStart = state.newStartMinute;
        let newEnd = state.newEndMinute;

        // We need to handle day difference if dragged to another day
        const dayDiff = dayjs(dateStr).diff(dayjs(state.dateStr), 'day');
        const absolutePointerMinute = pointerMinute + (dayDiff * MINUTES_PER_DAY);

        if (state.handle === 'top') {
            newStart = absolutePointerMinute;
            // Ensure start < end (min duration 15 mins)
            if (newStart > state.originalEndMinute - 15) {
                newStart = state.originalEndMinute - 15;
            }
        } else {
            newEnd = absolutePointerMinute;
            // Ensure end > start (min duration 15 mins)
            if (newEnd < state.originalStartMinute + 15) {
                newEnd = state.originalStartMinute + 15;
            }
        }

        return { 
            newStartMinute: newStart, 
            newEndMinute: newEnd,
            targetDateStr: state.dateStr // Keep the reference date as the start date of the resize operation
        };
    }, []);

    const commitResize = useCallback(async (state: ResizeState) => {
        await onResizeCommit(state.dateStr, state.entry.id, state.newStartMinute, state.newEndMinute);
    }, [onResizeCommit]);

    const beginResize = useCallback((payload: EntryResizeStartPayload) => {
        setResizeState(prev => {
            if (prev) return prev;

            // Find the entry
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
            
            // Calculate minutes relative to the day column where resize started
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

        const handleMouseMove = (event: globalThis.MouseEvent | globalThis.TouchEvent | globalThis.PointerEvent) => {
            setResizeState(prev => {
                if (!prev) return prev;
                let clientX = 0, clientY = 0;
                if ((event as TouchEvent).touches && (event as TouchEvent).touches.length) {
                    const t = (event as TouchEvent).touches[0];
                    clientX = t.clientX; clientY = t.clientY;
                } else if ((event as PointerEvent).clientX !== undefined) {
                    clientX = (event as PointerEvent).clientX; clientY = (event as PointerEvent).clientY;
                } else {
                    clientX = (event as MouseEvent).clientX; clientY = (event as MouseEvent).clientY;
                }

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
                let clientX = 0, clientY = 0;
                if ((event as TouchEvent).changedTouches && (event as TouchEvent).changedTouches.length) {
                    const t = (event as TouchEvent).changedTouches[0];
                    clientX = t.clientX; clientY = t.clientY;
                } else if ((event as PointerEvent).clientX !== undefined) {
                    clientX = (event as PointerEvent).clientX; clientY = (event as PointerEvent).clientY;
                } else {
                    clientX = (event as MouseEvent).clientX; clientY = (event as MouseEvent).clientY;
                }

                // Final calculation
                const next = calculateResizePosition(clientX, clientY, prev);
                const finalStart = next ? next.newStartMinute : prev.newStartMinute;
                const finalEnd = next ? next.newEndMinute : prev.newEndMinute;

                commitResize({ ...prev, newStartMinute: finalStart, newEndMinute: finalEnd });
                return null;
            });
        };

        // Support pointer events first (covers touch and pen on modern browsers)
        window.addEventListener("pointermove", handleMouseMove as any);
        window.addEventListener("pointerup", handleMouseUp as any);
        window.addEventListener("pointercancel", handleMouseUp as any);

        // Fallback for touch-only environments
        window.addEventListener("touchmove", handleMouseMove as any, { passive: false } as AddEventListenerOptions);
        window.addEventListener("touchend", handleMouseUp as any);

        // Mouse fallback
        window.addEventListener("mousemove", handleMouseMove as any);
        window.addEventListener("mouseup", handleMouseUp as any);

        const originalUserSelect = document.body.style.userSelect;
        const originalTouchAction = (document.body as HTMLElement).style.touchAction;
        document.body.style.userSelect = "none";
        (document.body as HTMLElement).style.touchAction = 'none';

        return () => {
            window.removeEventListener("pointermove", handleMouseMove as any);
            window.removeEventListener("pointerup", handleMouseUp as any);
            window.removeEventListener("pointercancel", handleMouseUp as any);

            window.removeEventListener("touchmove", handleMouseMove as any);
            window.removeEventListener("touchend", handleMouseUp as any);

            window.removeEventListener("mousemove", handleMouseMove as any);
            window.removeEventListener("mouseup", handleMouseUp as any);
            document.body.style.userSelect = originalUserSelect;
            (document.body as HTMLElement).style.touchAction = originalTouchAction;
        };
    }, [resizeState, calculateResizePosition, commitResize]);

    return {
        resizeState,
        beginResize
    };
}
