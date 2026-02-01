import { useState, useCallback, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import { clamp, clampMinute, MINUTES_PER_DAY, snap, findDayElement, lockBody, unlockBody, BodyStyles } from "../util/calendarUtility";

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

const findEntry = (entriesByDay: EntriesByDay, dateStr: string, entryId: string): CalendarEntry | undefined => {
    return entriesByDay[dateStr]?.find(e => e.id === entryId)
        ?? Object.values(entriesByDay).flat().find(e => e.id === entryId);
};

export function useEntryMove(
    entriesByDay: EntriesByDay,
    onMoveCommit: (dateStr: string, entryId: string, startMinute: number, endMinute: number) => Promise<void>
) {
    const [moveState, setMoveState] = useState<MoveState | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const originalStylesRef = useRef<BodyStyles | null>(null);

    const calcPosition = useCallback((clientX: number, clientY: number, state: MoveState) => {
        const dayEl = findDayElement(clientX, clientY);
        const dateStr = dayEl?.getAttribute("data-date");
        const rect = dayEl?.getBoundingClientRect();
        if (!dateStr || !rect || rect.height <= 0) return null;

        const offsetY = clamp(clientY - rect.top, 0, rect.height);
        const pointerMinute = clampMinute(snap((offsetY / rect.height) * MINUTES_PER_DAY));
        const startMinute = snap(pointerMinute - state.pointerOffset);
        
        return { targetDateStr: dateStr, startMinute, endMinute: startMinute + state.duration };
    }, []);

    const commitMove = useCallback(async (state: MoveState) => {
        let { currentDateStr: dateStr, startMinute, endMinute } = state;

        if (startMinute < 0) {
            dateStr = dayjs(dateStr).subtract(1, "day").format("YYYY-MM-DD");
            startMinute += MINUTES_PER_DAY;
            endMinute += MINUTES_PER_DAY;
        } else if (startMinute >= MINUTES_PER_DAY) {
            dateStr = dayjs(dateStr).add(1, "day").format("YYYY-MM-DD");
            startMinute -= MINUTES_PER_DAY;
            endMinute -= MINUTES_PER_DAY;
        }

        await onMoveCommit(dateStr, state.entry.id, startMinute, endMinute);
    }, [onMoveCommit]);

    const updatePosition = useCallback((clientX: number, clientY: number) => {
        setMoveState(prev => {
            if (!prev) return prev;
            const pos = calcPosition(clientX, clientY, prev);
            if (!pos || (pos.targetDateStr === prev.currentDateStr && pos.startMinute === prev.startMinute)) {
                return prev;
            }
            return { ...prev, currentDateStr: pos.targetDateStr, startMinute: pos.startMinute, endMinute: pos.endMinute };
        });
    }, [calcPosition]);

    const beginMove = useCallback((payload: EntryDragStartPayload) => {
        const entry = findEntry(entriesByDay, payload.dateStr, payload.entryId);
        if (!entry) return;

        const start = dayjs(entry.start_time);
        const duration = dayjs(entry.end_time).diff(start, "minute");
        const dayStart = dayjs(payload.dateStr).startOf("day");
        const startMinute = start.diff(dayStart, "minute");

        const baseState: MoveState = {
            entry,
            fromDateStr: payload.dateStr,
            pointerOffset: payload.pointerOffset,
            duration,
            currentDateStr: payload.dateStr,
            startMinute,
            endMinute: startMinute + duration,
        };

        
        const pos = calcPosition(payload.clientX, payload.clientY, baseState);
        setMoveState(pos ? { ...baseState, currentDateStr: pos.targetDateStr, startMinute: pos.startMinute, endMinute: pos.endMinute } : baseState);
    }, [entriesByDay, calcPosition]);

    
    useEffect(() => {
        if (!moveState) return;

        originalStylesRef.current = lockBody();

        const handleMove = (clientX: number, clientY: number, cancelable: boolean, event?: Event) => {
            if (cancelable) event?.preventDefault();
            if (rafIdRef.current) return;
            
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null;
                updatePosition(clientX, clientY);
            });
        };

        const handleEnd = (clientX: number, clientY: number) => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            updatePosition(clientX, clientY);
            setMoveState(prev => {
                if (prev) commitMove(prev);
                return null;
            });
        };

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY, false);
        const onMouseUp = (e: MouseEvent) => handleEnd(e.clientX, e.clientY);
        const onPointerMove = (e: PointerEvent) => handleMove(e.clientX, e.clientY, e.cancelable, e);
        const onPointerEnd = (e: PointerEvent) => handleEnd(e.clientX, e.clientY);
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY, e.cancelable, e);
        const onTouchEnd = (e: TouchEvent) => handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("pointermove", onPointerMove, { passive: false, capture: true });
        window.addEventListener("pointerup", onPointerEnd);
        window.addEventListener("pointercancel", onPointerEnd);
        window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
        window.addEventListener("touchend", onTouchEnd);
        window.addEventListener("touchcancel", onTouchEnd);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("pointermove", onPointerMove, true);
            window.removeEventListener("pointerup", onPointerEnd);
            window.removeEventListener("pointercancel", onPointerEnd);
            window.removeEventListener("touchmove", onTouchMove, true);
            window.removeEventListener("touchend", onTouchEnd);
            window.removeEventListener("touchcancel", onTouchEnd);

            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            if (originalStylesRef.current) unlockBody(originalStylesRef.current);
        };
    }, [moveState?.entry.id, updatePosition, commitMove]);

    return { moveState, beginMove };
}
