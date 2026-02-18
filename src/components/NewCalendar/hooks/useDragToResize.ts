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
    for (const array of Object.values(byDate)) {
        const hit = array.find(e => e.id === id);
        if (hit) return hit;
    }
    return undefined;
}

export function useDragToResize(
    byDate: ByDate,
    onCommit: (dateStr: string, entryId: string, startMin: number, endMin: number) => Promise<void>,
) {
    const [resizeState, setResizeState] = useState<ResizeState | null>(null);

    const calcPos = useCallback((x: number, y: number, resizeState: ResizeState) => {
        const element = findDayElement(x, y);
        if (!element) return null;
        const date = element.getAttribute("data-date");
        const rect = element.getBoundingClientRect();
        if (!date || rect.height <= 0) return null;

        const offsetY = clamp(y - rect.top, 0, rect.height);
        const pixelMin = clampMin(snap((offsetY / rect.height) * MINUTES_PER_DAY));
        const dayDiff = dayjs(date).diff(dayjs(resizeState.dateStr), "day");
        const absMin = pixelMin + dayDiff * MINUTES_PER_DAY;

        let newStart = resizeState.newStart;
        let newEnd = resizeState.newEnd;

        if (resizeState.edge === "top") {
            newStart = absMin;
            if (newStart > resizeState.originalEnd - MIN_RESIZE_DURATION) newStart = resizeState.originalEnd - MIN_RESIZE_DURATION;
        } else {
            newEnd = absMin;
            if (newEnd < resizeState.originalStart + MIN_RESIZE_DURATION) newEnd = resizeState.originalStart + MIN_RESIZE_DURATION;
        }

        return { newStart, newEnd };
    }, []);

    const commit = useCallback(async (resizeState: ResizeState) => {
        await onCommit(resizeState.dateStr, resizeState.entry.id, resizeState.newStart, resizeState.newEnd);
    }, [onCommit]);

    //  Begin 
    const beginResize = useCallback((p: ResizeStartPayload) => {
        setResizeState(prev => {
            if (prev) return prev;
            const entry = findEntry(byDate, p.entryId);
            if (!entry) return prev;

            const dayStart = dayjs(p.dateStr).startOf("day");
            const start = dayjs(entry.start_time).diff(dayStart, "minute");
            const end = dayjs(entry.end_time).diff(dayStart, "minute");

            return {
                entry, edge: p.edge, dateStr: p.dateStr,
                originalStart: start, originalEnd: end, newStart: start, newEnd: end,
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
                const newStart = pos ? pos.newStart : prev.newStart;
                const newEnd = pos ? pos.newEnd   : prev.newEnd;
                commit({ ...prev, newStart, newEnd });
                return null;
            });
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleEnd);
        window.addEventListener("pointercancel", handleEnd);
        window.addEventListener("touchmove", handleMove, { passive: false });
        window.addEventListener("touchend", handleEnd);
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleEnd);

        return () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleEnd);
            window.removeEventListener("pointercancel", handleEnd);
            window.removeEventListener("touchmove", handleMove);
            window.removeEventListener("touchend", handleEnd);
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleEnd);
            unlockBodyScroll(saved);
        };
    }, [resizeState, calcPos, commit]);

    return { resizeState, beginResize };
}
