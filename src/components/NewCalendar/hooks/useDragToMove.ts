/**
 * useDragToMove - drag an existing entry to a new time / day.
 *
 * Includes long-press detection for touch devices:
 *  - 400 ms hold -> vibrate -> begin move
 *  - Cancels if pointer moves > threshold before hold fires
 *
 * Desktop: mouse-down + 5 px movement -> begin move immediately.
 *
 * Global listeners auto-attach while a move is active and clean up on end.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import type { MoveState } from "../types";
import { MINUTES_PER_DAY, LONG_PRESS_MS, LONG_PRESS_MOVE_SQ } from "../constants";
import { clamp, clampMin, snap, findDayElement, lockBodyScroll, unlockBodyScroll, SavedBodyStyles } from "../layout/timeUtils";

export interface MoveStartPayload {
    dateStr: string;
    entryId: string;
    pointerOffset: number;
    clientX: number;
    clientY: number;
}

type ByDate = Record<string, CalendarEntry[]>;

function findEntry(byDate: ByDate, dateStr: string, id: string): CalendarEntry | undefined {
    return byDate[dateStr]?.find(e => e.id === id)
        ?? Object.values(byDate).flat().find(e => e.id === id);
}

export function useDragToMove(
    byDate: ByDate,
    onCommit: (dateStr: string, entryId: string, startMin: number, endMin: number) => Promise<void>,
) {
    const [moveState, setMoveState] = useState<MoveState | null>(null);
    const rafRef = useRef<number | null>(null);
    const savedRef = useRef<SavedBodyStyles | null>(null);

    // Compute new position from pointer coords
    const calcPos = useCallback((x: number, y: number, moveState: MoveState) => {
        const element = findDayElement(x, y);
        const date = element?.getAttribute("data-date");
        const rect = element?.getBoundingClientRect();
        if (!date || !rect || rect.height <= 0) return null;
        const offsetY = clamp(y - rect.top, 0, rect.height);
        const pixelMin = clampMin(snap((offsetY / rect.height) * MINUTES_PER_DAY));
        const startMinute = snap(pixelMin - moveState.pointerOffset);
        return { dateStr: date, startMinute, endMinute: startMinute + moveState.durationMinutes };
    }, []);

    const commit = useCallback(async (moveState: MoveState) => {
        let { currentDateStr, startMinute, endMinute } = moveState;
        if (startMinute < 0) { 
            currentDateStr = dayjs(currentDateStr).subtract(1, "day").format("YYYY-MM-DD"); 
            startMinute += MINUTES_PER_DAY; endMinute += MINUTES_PER_DAY; 
        }
        if (endMinute >= MINUTES_PER_DAY) { 
            currentDateStr = dayjs(currentDateStr).add(1, "day").format("YYYY-MM-DD");      
            startMinute -= MINUTES_PER_DAY; endMinute -= MINUTES_PER_DAY; 
        }
        await onCommit(currentDateStr, moveState.entry.id, startMinute, endMinute);
    }, [onCommit]);

    const updatePos = useCallback((x: number, y: number) => {
        setMoveState(prev => {
            if (!prev) return prev;
            const pos = calcPos(x, y, prev);
            if (!pos || (pos.dateStr === prev.currentDateStr && pos.startMinute === prev.startMinute)) return prev;
            return { ...prev, currentDateStr: pos.dateStr, startMinute: pos.startMinute, endMinute: pos.endMinute };
        });
    }, [calcPos]);

    //  Begin a move 
    const beginMove = useCallback((data: MoveStartPayload) => {
        const entry = findEntry(byDate, data.dateStr, data.entryId);
        if (!entry) return;

        const start = dayjs(entry.start_time);
        const duration = dayjs(entry.end_time).diff(start, "minute");
        const dayStart = dayjs(data.dateStr).startOf("day");
        const startMinute = start.diff(dayStart, "minute");

        const base: MoveState = {
            entry, fromDateStr: data.dateStr, pointerOffset: data.pointerOffset,
            durationMinutes: duration, currentDateStr: data.dateStr, startMinute, endMinute: startMinute + duration,
        };
        const pos = calcPos(data.clientX, data.clientY, base);
        setMoveState(pos ? { ...base, currentDateStr: pos.dateStr, startMinute: pos.startMinute, endMinute: pos.endMinute } : base);
    }, [byDate, calcPos]);

    //  Global listeners while moving 
    useEffect(() => {
        if (!moveState) return;
        savedRef.current = lockBodyScroll();

        const handleMove = (x: number, y: number, ev?: Event) => {
            if (ev?.cancelable) ev.preventDefault();
            if (rafRef.current) return;
            rafRef.current = requestAnimationFrame(() => { rafRef.current = null; updatePos(x, y); });
        };

        const handleEnd = (x: number, y: number) => {
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            updatePos(x, y);
            setMoveState(prev => { if (prev) commit(prev); return null; });
        };

        const move = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const moveEnd = (e: MouseEvent) => handleEnd(e.clientX, e.clientY);
        const pointer = (e: PointerEvent) => handleMove(e.clientX, e.clientY, e);
        const pointerEnd = (e: PointerEvent) => handleEnd(e.clientX, e.clientY);
        const touch = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
        const touchEnd = (e: TouchEvent) => handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", moveEnd);
        window.addEventListener("pointermove", pointer, { passive: false, capture: true });
        window.addEventListener("pointerup", pointerEnd);
        window.addEventListener("pointercancel", pointerEnd);
        window.addEventListener("touchmove", touch, { passive: false, capture: true });
        window.addEventListener("touchend", touchEnd);
        window.addEventListener("touchcancel", touchEnd);

        return () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", moveEnd);
            window.removeEventListener("pointermove", pointer, true);
            window.removeEventListener("pointerup", pointerEnd);
            window.removeEventListener("pointercancel", pointerEnd);
            window.removeEventListener("touchmove", touch, true);
            window.removeEventListener("touchend", touchEnd);
            window.removeEventListener("touchcancel", touchEnd);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (savedRef.current) unlockBodyScroll(savedRef.current);
        };
    }, [moveState?.entry.id, updatePos, commit]);

    return { moveState, beginMove };
}

//  Long-press helper (used inside EntryBlock) 

export function useLongPress(
    ref: React.RefObject<HTMLElement | null>,
    onDragStart?: (cx: number, cy: number) => void,
) {
    const timer = useRef<number | null>(null);
    const origin = useRef<{ x: number; y: number } | null>(null);
    const active = useRef(false);
    const cbRef = useRef(onDragStart);
    useEffect(() => { cbRef.current = onDragStart; }, [onDragStart]);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
        const reset = () => { clear(); origin.current = null; active.current = false; };

        const moved = (cx: number, cy: number) => {
            if (!origin.current) return false;
            const dx = cx - origin.current.x, dy = cy - origin.current.y;
            return dx * dx + dy * dy > LONG_PRESS_MOVE_SQ;
        };

        const start = (cx: number, cy: number, pid?: number) => {
            if (!cbRef.current) return;
            origin.current = { x: cx, y: cy };
            active.current = false;
            timer.current = window.setTimeout(() => {
                active.current = true;
                if (pid !== undefined) {
                    try { 
                        element.setPointerCapture(pid); 
                    } catch { }
                }
                try { 
                    navigator.vibrate?.(50); 
                } catch { }
                cbRef.current?.(cx, cy);
                timer.current = null;
            }, LONG_PRESS_MS);
        };

        const pointerDown = (e: PointerEvent) => {
            if (!cbRef.current || e.button !== 0) return;
            if ((e.target as Element)?.closest?.(".resize-handle")) return;
            start(e.clientX, e.clientY, e.pointerId);
        };
        const pointerMove = (e: PointerEvent) => {
            if (timer.current && !active.current && moved(e.clientX, e.clientY)) reset();
            if (active.current && e.cancelable) e.preventDefault();
        };
        const pointerUp = () => reset();
        const touchStart = (e: TouchEvent) => { if (cbRef.current) start(e.touches[0].clientX, e.touches[0].clientY); };
        const touchMove = (e: TouchEvent) => {
            if (timer.current && !active.current && moved(e.touches[0].clientX, e.touches[0].clientY)) reset();
            if (active.current && e.cancelable) e.preventDefault();
        };
        const touchEnd = () => reset();

        element.addEventListener("pointerdown", pointerDown);
        element.addEventListener("pointermove", pointerMove);
        window.addEventListener("pointerup", pointerUp);
        window.addEventListener("pointercancel", pointerUp);
        element.addEventListener("touchstart", touchStart, { passive: true });
        element.addEventListener("touchmove", touchMove, { passive: false });
        element.addEventListener("touchend", touchEnd);
        element.addEventListener("touchcancel", touchEnd);

        return () => {
            element.removeEventListener("pointerdown", pointerDown);
            element.removeEventListener("pointermove", pointerMove);
            window.removeEventListener("pointerup", pointerUp);
            window.removeEventListener("pointercancel", pointerUp);
            element.removeEventListener("touchstart", touchStart);
            element.removeEventListener("touchmove", touchMove);
            element.removeEventListener("touchend", touchEnd);
            element.removeEventListener("touchcancel", touchEnd);
            clear();
        };
    }, [ref]);
}
