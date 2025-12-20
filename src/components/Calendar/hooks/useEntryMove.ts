import { useState, useCallback, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import { clamp, clampMinute, MINUTES_PER_DAY, snap } from "../util/calendarUtility";

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

export function useEntryMove(
    entriesByDay: EntriesByDay,
    onMoveCommit: (dateStr: string, entryId: string, startMinute: number, endMinute: number) => Promise<void>
) {
    const [moveState, setMoveState] = useState<MoveState | null>(null);
    const listenersAttachedRef = useRef(false);
    const bodyLockedRef = useRef(false);
    const originalBodyStylesRef = useRef<{ overflow: string; touchAction: string; userSelect: string; webkitUserSelect: string } | null>(null);

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
        
        // We do NOT clamp startMinute here because it can be negative (previous day) 
        // or > 1440 (next day) when dragging near boundaries.
        // commitMove handles the day shift logic.
        
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
            
            // Find the entry object directly
            let clickedEntry: CalendarEntry | undefined;
            const dayEntries = entriesByDay[payload.dateStr];
            if (dayEntries) {
                clickedEntry = dayEntries.find(e => e.id === payload.entryId);
            }
            // Fallback search
            if (!clickedEntry) {
                 Object.values(entriesByDay).forEach(entries => {
                     if (!clickedEntry) clickedEntry = entries.find(e => e.id === payload.entryId);
                 });
            }

            if (!clickedEntry) return prev;

            // Calculate duration directly from the entry
            const start = dayjs(clickedEntry.start_time);
            const end = dayjs(clickedEntry.end_time);
            const totalDuration = end.diff(start, 'minute');

            // Calculate startMinute relative to the drag start day
            // startMinute = (Entry Start Time) - (Date of Drag Start) in minutes
            const dragDateStart = dayjs(payload.dateStr).startOf('day');
            const startMinuteRelativeToDay = start.diff(dragDateStart, 'minute');

            const baseState: MoveState = {
                entry: clickedEntry,
                fromDateStr: payload.dateStr,
                pointerOffset: payload.pointerOffset,
                duration: totalDuration,
                currentDateStr: payload.dateStr,
                startMinute: startMinuteRelativeToDay,
                endMinute: startMinuteRelativeToDay + totalDuration,
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

        // Attach immediate touch listeners so the ongoing touch sequence is captured
        // (some browsers may not reliably deliver subsequent touchmove events to
        // listeners added inside the effect that runs after state updates).
        if (!listenersAttachedRef.current && typeof window !== "undefined") {
            listenersAttachedRef.current = true;

            try { console.debug('[useEntryMove] beginMove: attaching immediate touch listeners'); } catch (err) {}
            // Lock body scroll immediately for this touch sequence
            if (!bodyLockedRef.current) {
                originalBodyStylesRef.current = {
                    overflow: document.body.style.overflow,
                    touchAction: document.body.style.touchAction,
                    userSelect: document.body.style.userSelect,
                    webkitUserSelect: (document.body.style as any).webkitUserSelect || "",
                };
                document.body.style.overflow = "hidden";
                document.body.style.touchAction = "none";
                document.body.style.userSelect = "none";
                // @ts-ignore
                document.body.style.webkitUserSelect = "none";
                bodyLockedRef.current = true;
            }

            const immediateHandleTouchMove = (event: globalThis.TouchEvent) => {
                if (event.cancelable) event.preventDefault();
                const touch = event.touches[0];
                const clientX = touch.clientX;
                const clientY = touch.clientY;

                // throttle via rAF
                requestAnimationFrame(() => {
                    try { console.debug('[useEntryMove] immediateHandleTouchMove', { x: clientX, y: clientY }); } catch (err) {}
                    setMoveState(prev => {
                        if (!prev) return prev;
                        const nextPosition = calculateMovePosition(clientX, clientY, prev);
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
                });
            };

            const immediateHandlePointerMove = (event: globalThis.PointerEvent) => {
                if (event.cancelable) event.preventDefault();
                const clientX = event.clientX;
                const clientY = event.clientY;

                requestAnimationFrame(() => {
                    try { console.debug('[useEntryMove] immediateHandlePointerMove', { x: clientX, y: clientY }); } catch (err) {}
                    setMoveState(prev => {
                        if (!prev) return prev;
                        const nextPosition = calculateMovePosition(clientX, clientY, prev);
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
                });
            };

            const immediateHandleTouchEnd = (event: globalThis.TouchEvent) => {
                const touch = event.changedTouches[0];
                const clientX = touch.clientX;
                const clientY = touch.clientY;

                try { console.debug('[useEntryMove] immediateHandleTouchEnd', { x: clientX, y: clientY }); } catch (err) {}
                setMoveState(prev => {
                    if (!prev) return prev;
                    const nextPosition = calculateMovePosition(clientX, clientY, prev);
                    const targetDateStr = nextPosition?.targetDateStr ?? prev.currentDateStr;
                    const startMinute = nextPosition?.startMinute ?? prev.startMinute;
                    const endMinute = nextPosition?.endMinute ?? prev.endMinute;

                    commitMove(prev, { dateStr: targetDateStr, startMinute, endMinute });
                    return null;
                });

                window.removeEventListener("touchmove", immediateHandleTouchMove, { capture: true } as AddEventListenerOptions);
                window.removeEventListener("touchend", immediateHandleTouchEnd);
                window.removeEventListener("touchcancel", immediateHandleTouchEnd);
                listenersAttachedRef.current = false;

                // Restore body styles locked earlier
                if (bodyLockedRef.current && originalBodyStylesRef.current) {
                    document.body.style.overflow = originalBodyStylesRef.current.overflow;
                    document.body.style.touchAction = originalBodyStylesRef.current.touchAction;
                    document.body.style.userSelect = originalBodyStylesRef.current.userSelect;
                    // @ts-ignore
                    document.body.style.webkitUserSelect = originalBodyStylesRef.current.webkitUserSelect;
                    bodyLockedRef.current = false;
                    originalBodyStylesRef.current = null;
                }
            };

                const immediateHandlePointerEnd = (event: globalThis.PointerEvent) => {
                    const clientX = event.clientX;
                    const clientY = event.clientY;
                    try { console.debug('[useEntryMove] immediateHandlePointerEnd', { x: clientX, y: clientY }); } catch (err) {}
                    setMoveState(prev => {
                        if (!prev) return prev;
                        const nextPosition = calculateMovePosition(clientX, clientY, prev);
                        const targetDateStr = nextPosition?.targetDateStr ?? prev.currentDateStr;
                        const startMinute = nextPosition?.startMinute ?? prev.startMinute;
                        const endMinute = nextPosition?.endMinute ?? prev.endMinute;

                        commitMove(prev, { dateStr: targetDateStr, startMinute, endMinute });
                        return null;
                    });

                    window.removeEventListener("pointermove", immediateHandlePointerMove, { capture: true } as AddEventListenerOptions);
                    window.removeEventListener("pointerup", immediateHandlePointerEnd);
                    window.removeEventListener("pointercancel", immediateHandlePointerEnd);
                    listenersAttachedRef.current = false;

                    if (bodyLockedRef.current && originalBodyStylesRef.current) {
                        document.body.style.overflow = originalBodyStylesRef.current.overflow;
                        document.body.style.touchAction = originalBodyStylesRef.current.touchAction;
                        document.body.style.userSelect = originalBodyStylesRef.current.userSelect;
                        // @ts-ignore
                        document.body.style.webkitUserSelect = originalBodyStylesRef.current.webkitUserSelect;
                        bodyLockedRef.current = false;
                        originalBodyStylesRef.current = null;
                    }
                };

            window.addEventListener("touchmove", immediateHandleTouchMove, { passive: false, capture: true });
            window.addEventListener("touchend", immediateHandleTouchEnd);
            window.addEventListener("touchcancel", immediateHandleTouchEnd);
            window.addEventListener("pointermove", immediateHandlePointerMove, { passive: false, capture: true });
            window.addEventListener("pointerup", immediateHandlePointerEnd);
            window.addEventListener("pointercancel", immediateHandlePointerEnd);
        }
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

            try { console.debug('[useEntryMove] handleTouchMove', { x: clientX, y: clientY }); } catch (err) {}
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

        const handlePointerMove = (event: globalThis.PointerEvent) => {
            if (event.cancelable) event.preventDefault();
            const clientX = event.clientX;
            const clientY = event.clientY;

            try { console.debug('[useEntryMove] handlePointerMove', { x: clientX, y: clientY }); } catch (err) {}
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
        window.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
        window.addEventListener("touchend", handleTouchEnd);
        window.addEventListener("touchcancel", handleTouchEnd);
        window.addEventListener("pointermove", handlePointerMove, { passive: false, capture: true });
        window.addEventListener("pointerup", handleTouchEnd as any);
        window.addEventListener("pointercancel", handleTouchEnd as any);

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
            window.removeEventListener("touchmove", handleTouchMove, true);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchEnd);
            window.removeEventListener("pointermove", handlePointerMove, true);
            window.removeEventListener("pointerup", handleTouchEnd as any);
            window.removeEventListener("pointercancel", handleTouchEnd as any);

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
