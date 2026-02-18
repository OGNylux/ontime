/**
 * useDragToResize - drag an entry's top or bottom edge to change duration.
 *
 * Minimum 15 min duration is enforced. On pointer-up the new bounds
 * are committed via onCommit.
 */
import { useState, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import type { ResizeState, ResizeEdge } from "../types";
import { MINUTES_PER_DAY, MIN_RESIZE_DURATION } from "../constants";
import { clamp, clampMin, snap, findDayElement, lockBodyScroll, unlockBodyScroll, clientCoords } from "../layout/timeUtils";

export interface ResizeStartPayload {
    dateStr: string;
    entryId: string;
    edge: ResizeEdge;
    clientY: number;
}

type ByDate = Record<string, CalendarEntry[]>;

function findEntry(byDate: ByDate, id: string): CalendarEntry | undefined {
    for (const arr of Object.values(byDate)) {
        const hit = arr.find(e => e.id === id);
        if (hit) return hit;
    }
    return undefined;
}

export function useDragToResize(
    byDate: ByDate,
    onCommit: (dateStr: string, entryId: string, startMin: number, endMin: number) => Promise<void>,
) {
    const [resizeState, setResizeState] = useState<ResizeState | null>(null);

    const calcPos = useCallback((cx: number, cy: number, st: ResizeState) => {
        const el = findDayElement(cx, cy);
        if (!el) return null;
        const ds = el.getAttribute("data-date");
        const r  = el.getBoundingClientRect();
        if (!ds || r.height <= 0) return null;

        const oy = clamp(cy - r.top, 0, r.height);
        const pm = clampMin(snap((oy / r.height) * MINUTES_PER_DAY));
        const dayDiff = dayjs(ds).diff(dayjs(st.dateStr), "day");
        const absMin = pm + dayDiff * MINUTES_PER_DAY;

        let ns = st.newStart;
        let ne = st.newEnd;

        if (st.edge === "top") {
            ns = absMin;
            if (ns > st.originalEnd - MIN_RESIZE_DURATION) ns = st.originalEnd - MIN_RESIZE_DURATION;
        } else {
            ne = absMin;
            if (ne < st.originalStart + MIN_RESIZE_DURATION) ne = st.originalStart + MIN_RESIZE_DURATION;
        }

        return { newStart: ns, newEnd: ne };
    }, []);

    const commit = useCallback(async (st: ResizeState) => {
        await onCommit(st.dateStr, st.entry.id, st.newStart, st.newEnd);
    }, [onCommit]);

    //  Begin 
    const beginResize = useCallback((p: ResizeStartPayload) => {
        setResizeState(prev => {
            if (prev) return prev;
            const entry = findEntry(byDate, p.entryId);
            if (!entry) return prev;

            const dayStart = dayjs(p.dateStr).startOf("day");
            const sm = dayjs(entry.start_time).diff(dayStart, "minute");
            const em = dayjs(entry.end_time).diff(dayStart, "minute");

            return {
                entry, edge: p.edge, dateStr: p.dateStr,
                originalStart: sm, originalEnd: em, newStart: sm, newEnd: em,
            };
        });
    }, [byDate]);

    //  Global listeners while resizing 
    useEffect(() => {
        if (!resizeState) return;
        const saved = lockBodyScroll();

        const handleMove = (ev: MouseEvent | TouchEvent | PointerEvent) => {
            setResizeState(prev => {
                if (!prev) return prev;
                const { clientX: cx, clientY: cy } = clientCoords(ev);
                const pos = calcPos(cx, cy, prev);
                if (!pos || (pos.newStart === prev.newStart && pos.newEnd === prev.newEnd)) return prev;
                return { ...prev, newStart: pos.newStart, newEnd: pos.newEnd };
            });
        };

        const handleEnd = (ev: MouseEvent | TouchEvent | PointerEvent) => {
            setResizeState(prev => {
                if (!prev) return prev;
                const { clientX: cx, clientY: cy } = clientCoords(ev, false);
                const pos = calcPos(cx, cy, prev);
                const ns = pos ? pos.newStart : prev.newStart;
                const ne = pos ? pos.newEnd   : prev.newEnd;
                commit({ ...prev, newStart: ns, newEnd: ne });
                return null;
            });
        };

        window.addEventListener("pointermove", handleMove as any);
        window.addEventListener("pointerup", handleEnd as any);
        window.addEventListener("pointercancel", handleEnd as any);
        window.addEventListener("touchmove", handleMove as any, { passive: false });
        window.addEventListener("touchend", handleEnd as any);
        window.addEventListener("mousemove", handleMove as any);
        window.addEventListener("mouseup", handleEnd as any);

        return () => {
            window.removeEventListener("pointermove", handleMove as any);
            window.removeEventListener("pointerup", handleEnd as any);
            window.removeEventListener("pointercancel", handleEnd as any);
            window.removeEventListener("touchmove", handleMove as any);
            window.removeEventListener("touchend", handleEnd as any);
            window.removeEventListener("mousemove", handleMove as any);
            window.removeEventListener("mouseup", handleEnd as any);
            unlockBodyScroll(saved);
        };
    }, [resizeState, calcPos, commit]);

    return { resizeState, beginResize };
}
