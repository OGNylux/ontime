import { useState, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import { EntriesByDay, EntryDragStartPayload, MoveState, CalendarEntry } from "../util/calendarTypes";
import { clamp, clampMinute, MINUTES_PER_DAY, snap } from "../util/calendarUtility";

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

export function useCalendarDrag(
    entriesByDay: EntriesByDay,
    onMoveCommit: (dateStr: string, entryId: string, startMinute: number, endMinute: number) => Promise<void>
) {
    const [moveState, setMoveState] = useState<MoveState | null>(null);

    const calculateMovePosition = useCallback((clientX: number, clientY: number, state: MoveState) => {
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

        let startMinute = pointerMinute - state.pointerOffset;
        startMinute = snap(startMinute);
        // Allow startMinute to go up to MINUTES_PER_DAY (crossing midnight)
        startMinute = clamp(startMinute, 0, MINUTES_PER_DAY);
        const endMinute = startMinute + state.duration;
        return { targetDateStr: dateStr, startMinute, endMinute };
    }, []);

    const commitMove = useCallback(async (move: MoveState, target: { dateStr: string; startMinute: number; endMinute: number }) => {
        let finalDateStr = target.dateStr;
        let finalStartMinute = target.startMinute;
        let finalEndMinute = target.endMinute;

        if (finalStartMinute < 0) {
            finalDateStr = dayjs(finalDateStr).subtract(1, 'day').format('YYYY-MM-DD');
            finalStartMinute += MINUTES_PER_DAY;
            finalEndMinute += MINUTES_PER_DAY;
        } else if (finalStartMinute >= MINUTES_PER_DAY) {
            finalDateStr = dayjs(finalDateStr).add(1, 'day').format('YYYY-MM-DD');
            finalStartMinute -= MINUTES_PER_DAY;
            finalEndMinute -= MINUTES_PER_DAY;
        }

        await onMoveCommit(finalDateStr, move.entry.id, finalStartMinute, finalEndMinute);
    }, [onMoveCommit]);

    const beginMove = useCallback((payload: EntryDragStartPayload) => {
        setMoveState(prev => {
            if (prev) return prev;
            
            // Find all parts of this entry across all days to calculate total duration
            const allParts: { date: string, entry: CalendarEntry }[] = [];
            Object.entries(entriesByDay).forEach(([date, dayEntries]) => {
                const found = dayEntries.find(e => e.id === payload.entryId);
                if (found) {
                    allParts.push({ date, entry: found });
                }
            });

            if (allParts.length === 0) return prev;

            // Sort by date/time to find true start/end
            allParts.sort((a, b) => {
                if (a.date !== b.date) return dayjs(a.date).diff(dayjs(b.date));
                return dayjs(a.entry.start_time).diff(dayjs(b.entry.start_time));
            });

            const clickedEntry = allParts.find(p => p.date === payload.dateStr && p.entry.id === payload.entryId)?.entry;
            if (!clickedEntry) return prev;

            let totalDuration = 0;
            let addedOffset = 0;
            
            for (const part of allParts) {
                const start = dayjs(part.entry.start_time);
                const end = dayjs(part.entry.end_time);
                const partDuration = end.diff(start, 'minute');
                totalDuration += partDuration;
                
                // If this part is strictly before the clicked entry, add its duration to the pointer offset
                const isBefore = 
                    dayjs(part.date).isBefore(dayjs(payload.dateStr)) || 
                    (part.date === payload.dateStr && start.isBefore(dayjs(clickedEntry.start_time)));
                
                if (isBefore) {
                    addedOffset += partDuration;
                }
            }

            const effectivePointerOffset = payload.pointerOffset + addedOffset;
            const clickedEntryStartMinute = dayjs(clickedEntry.start_time).diff(dayjs(clickedEntry.start_time).startOf('day'), 'minute');

            const baseState: MoveState = {
                entry: clickedEntry,
                fromDateStr: payload.dateStr,
                pointerOffset: effectivePointerOffset,
                duration: totalDuration,
                currentDateStr: payload.dateStr,
                startMinute: clickedEntryStartMinute - addedOffset,
                endMinute: clickedEntryStartMinute - addedOffset + totalDuration,
            };

            if (typeof window === "undefined") return baseState;

            const nextPosition = calculateMovePosition(payload.clientX, payload.clientY, baseState);
            if (nextPosition) {
                return {
                    ...baseState,
                    currentDateStr: nextPosition.targetDateStr,
                    startMinute: nextPosition.startMinute,
                    endMinute: nextPosition.endMinute,
                };
            }

            return baseState;
        });
    }, [calculateMovePosition, entriesByDay]);

    useEffect(() => {
        if (!moveState) return;

        const handleMouseMove = (event: globalThis.MouseEvent) => {
            setMoveState(prev => {
                if (!prev) return prev;
                const nextPosition = calculateMovePosition(event.clientX, event.clientY, prev);
                if (!nextPosition) return prev;
                if (
                    nextPosition.targetDateStr === prev.currentDateStr &&
                    nextPosition.startMinute === prev.startMinute
                ) return prev;

                return {
                    ...prev,
                    currentDateStr: nextPosition.targetDateStr,
                    startMinute: nextPosition.startMinute,
                    endMinute: nextPosition.endMinute,
                };
            });
        };

        const handleMouseUp = (event: globalThis.MouseEvent) => {
            setMoveState(prev => {
                if (!prev) return prev;
                const nextPosition = calculateMovePosition(event.clientX, event.clientY, prev);
                const targetDateStr = nextPosition?.targetDateStr ?? prev.currentDateStr;
                const startMinute = nextPosition?.startMinute ?? prev.startMinute;
                const endMinute = nextPosition?.endMinute ?? prev.endMinute;

                commitMove(prev, { dateStr: targetDateStr, startMinute, endMinute });
                return null;
            });
        };

        let animationFrameId: number | null = null;

        const handleTouchMove = (event: globalThis.TouchEvent) => {
            if (event.cancelable) event.preventDefault();
            const touch = event.touches[0];
            const clientX = touch.clientX;
            const clientY = touch.clientY;

            if (animationFrameId) return;

            animationFrameId = requestAnimationFrame(() => {
                setMoveState(prev => {
                    if (!prev) return prev;
                    const nextPosition = calculateMovePosition(clientX, clientY, prev);
                    if (!nextPosition) return prev;
                    if (
                        nextPosition.targetDateStr === prev.currentDateStr &&
                        nextPosition.startMinute === prev.startMinute
                    ) {
                        return prev;
                    }

                    return {
                        ...prev,
                        currentDateStr: nextPosition.targetDateStr,
                        startMinute: nextPosition.startMinute,
                        endMinute: nextPosition.endMinute,
                    };
                });
                animationFrameId = null;
            });
        };

        const handleTouchEnd = (event: globalThis.TouchEvent) => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            const touch = event.changedTouches[0];
            setMoveState(prev => {
                if (!prev) return prev;
                const nextPosition = calculateMovePosition(touch.clientX, touch.clientY, prev);
                const targetDateStr = nextPosition?.targetDateStr ?? prev.currentDateStr;
                const startMinute = nextPosition?.startMinute ?? prev.startMinute;
                const endMinute = nextPosition?.endMinute ?? prev.endMinute;

                commitMove(prev, { dateStr: targetDateStr, startMinute, endMinute });
                return null;
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", handleTouchEnd);
        window.addEventListener("touchcancel", handleTouchEnd);

        const originalOverflow = document.body.style.overflow;
        const originalTouchAction = document.body.style.touchAction;
        const originalUserSelect = document.body.style.userSelect;
        
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
        document.body.style.userSelect = "none";
        // @ts-ignore
        document.body.style.webkitUserSelect = "none";

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchEnd);

            document.body.style.overflow = originalOverflow;
            document.body.style.touchAction = originalTouchAction;
            document.body.style.userSelect = originalUserSelect;
            // @ts-ignore
            document.body.style.webkitUserSelect = "";
            
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [moveState ? moveState.entry.id : null, calculateMovePosition, commitMove]);

    return {
        moveState,
        beginMove
    };
}
