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
    /** Minutes between pointer pos and entry start. */
    pointerOffset: number;
    clientX: number;
    clientY: number;
}

type ByDate = Record<string, CalendarEntry[]>;

// Find an entry by id, falling back across all days
function findEntry(byDate: ByDate, dateStr: string, id: string): CalendarEntry | undefined {
    return byDate[dateStr]?.find(e => e.id === id)
        ?? Object.values(byDate).flat().find(e => e.id === id);
}

//  Hook 

export function useDragToMove(
    byDate: ByDate,
    onCommit: (dateStr: string, entryId: string, startMin: number, endMin: number) => Promise<void>,
) {
    const [moveState, setMoveState] = useState<MoveState | null>(null);
    const rafRef = useRef<number | null>(null);
    const savedRef = useRef<SavedBodyStyles | null>(null);

    // Compute new position from pointer coords
    const calcPos = useCallback((cx: number, cy: number, st: MoveState) => {
        const el = findDayElement(cx, cy);
        const ds = el?.getAttribute("data-date");
        const r  = el?.getBoundingClientRect();
        if (!ds || !r || r.height <= 0) return null;
        const oy = clamp(cy - r.top, 0, r.height);
        const pm = clampMin(snap((oy / r.height) * MINUTES_PER_DAY));
        const sm = snap(pm - st.pointerOffset);
        return { dateStr: ds, startMinute: sm, endMinute: sm + st.durationMinutes };
    }, []);

    const commit = useCallback(async (st: MoveState) => {
        let { currentDateStr: ds, startMinute: sm, endMinute: em } = st;
        if (sm < 0)           { ds = dayjs(ds).subtract(1, "day").format("YYYY-MM-DD"); sm += MINUTES_PER_DAY; em += MINUTES_PER_DAY; }
        if (sm >= MINUTES_PER_DAY) { ds = dayjs(ds).add(1, "day").format("YYYY-MM-DD");      sm -= MINUTES_PER_DAY; em -= MINUTES_PER_DAY; }
        await onCommit(ds, st.entry.id, sm, em);
    }, [onCommit]);

    const updatePos = useCallback((cx: number, cy: number) => {
        setMoveState(prev => {
            if (!prev) return prev;
            const pos = calcPos(cx, cy, prev);
            if (!pos || (pos.dateStr === prev.currentDateStr && pos.startMinute === prev.startMinute)) return prev;
            return { ...prev, currentDateStr: pos.dateStr, startMinute: pos.startMinute, endMinute: pos.endMinute };
        });
    }, [calcPos]);

    //  Begin a move 
    const beginMove = useCallback((p: MoveStartPayload) => {
        const entry = findEntry(byDate, p.dateStr, p.entryId);
        if (!entry) return;

        const start    = dayjs(entry.start_time);
        const duration = dayjs(entry.end_time).diff(start, "minute");
        const dayStart = dayjs(p.dateStr).startOf("day");
        const sm       = start.diff(dayStart, "minute");

        const base: MoveState = {
            entry, fromDateStr: p.dateStr, pointerOffset: p.pointerOffset,
            durationMinutes: duration, currentDateStr: p.dateStr, startMinute: sm, endMinute: sm + duration,
        };
        const pos = calcPos(p.clientX, p.clientY, base);
        setMoveState(pos ? { ...base, currentDateStr: pos.dateStr, startMinute: pos.startMinute, endMinute: pos.endMinute } : base);
    }, [byDate, calcPos]);

    //  Global listeners while moving 
    useEffect(() => {
        if (!moveState) return;
        savedRef.current = lockBodyScroll();

        const handleMove = (cx: number, cy: number, ev?: Event) => {
            if (ev?.cancelable) ev.preventDefault();
            if (rafRef.current) return;
            rafRef.current = requestAnimationFrame(() => { rafRef.current = null; updatePos(cx, cy); });
        };

        const handleEnd = (cx: number, cy: number) => {
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            updatePos(cx, cy);
            setMoveState(prev => { if (prev) commit(prev); return null; });
        };

        const mm = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const mu = (e: MouseEvent) => handleEnd(e.clientX, e.clientY);
        const pm = (e: PointerEvent) => handleMove(e.clientX, e.clientY, e);
        const pe = (e: PointerEvent) => handleEnd(e.clientX, e.clientY);
        const tm = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
        const te = (e: TouchEvent) => handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

        window.addEventListener("mousemove", mm);
        window.addEventListener("mouseup", mu);
        window.addEventListener("pointermove", pm, { passive: false, capture: true });
        window.addEventListener("pointerup", pe);
        window.addEventListener("pointercancel", pe);
        window.addEventListener("touchmove", tm, { passive: false, capture: true });
        window.addEventListener("touchend", te);
        window.addEventListener("touchcancel", te);

        return () => {
            window.removeEventListener("mousemove", mm);
            window.removeEventListener("mouseup", mu);
            window.removeEventListener("pointermove", pm, true);
            window.removeEventListener("pointerup", pe);
            window.removeEventListener("pointercancel", pe);
            window.removeEventListener("touchmove", tm, true);
            window.removeEventListener("touchend", te);
            window.removeEventListener("touchcancel", te);
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
    const timer   = useRef<number | null>(null);
    const origin  = useRef<{ x: number; y: number } | null>(null);
    const active  = useRef(false);
    const cbRef   = useRef(onDragStart);
    useEffect(() => { cbRef.current = onDragStart; }, [onDragStart]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

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
                if (pid !== undefined) try { el.setPointerCapture(pid); } catch { /* */ }
                try { navigator.vibrate?.(50); } catch { /* */ }
                cbRef.current?.(cx, cy);
                timer.current = null;
            }, LONG_PRESS_MS);
        };

        const pd = (e: PointerEvent) => {
            if (!cbRef.current || e.button !== 0) return;
            if ((e.target as Element)?.closest?.(".resize-handle")) return;
            start(e.clientX, e.clientY, e.pointerId);
        };
        const pMove = (e: PointerEvent) => {
            if (timer.current && !active.current && moved(e.clientX, e.clientY)) reset();
            if (active.current && e.cancelable) e.preventDefault();
        };
        const pUp = () => reset();
        const ts = (e: TouchEvent) => { if (cbRef.current) start(e.touches[0].clientX, e.touches[0].clientY); };
        const tMove = (e: TouchEvent) => {
            if (timer.current && !active.current && moved(e.touches[0].clientX, e.touches[0].clientY)) reset();
            if (active.current && e.cancelable) e.preventDefault();
        };
        const tEnd = () => reset();

        el.addEventListener("pointerdown", pd);
        el.addEventListener("pointermove", pMove);
        window.addEventListener("pointerup", pUp);
        window.addEventListener("pointercancel", pUp);
        el.addEventListener("touchstart", ts, { passive: true });
        el.addEventListener("touchmove", tMove, { passive: false });
        el.addEventListener("touchend", tEnd);
        el.addEventListener("touchcancel", tEnd);

        return () => {
            el.removeEventListener("pointerdown", pd);
            el.removeEventListener("pointermove", pMove);
            window.removeEventListener("pointerup", pUp);
            window.removeEventListener("pointercancel", pUp);
            el.removeEventListener("touchstart", ts);
            el.removeEventListener("touchmove", tMove);
            el.removeEventListener("touchend", tEnd);
            el.removeEventListener("touchcancel", tEnd);
            clear();
        };
    }, [ref]);
}
