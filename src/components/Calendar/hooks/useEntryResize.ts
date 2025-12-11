import { useRef, useState, type MouseEvent } from "react";
import { clamp, INTERVAL_MINUTES, MINUTES_PER_DAY, pixelPerMinute, snap } from "../util/calendarUtility";
import { TimeEntry } from "../util/calendarTypes";

interface UseEntryResizeProps {
    entry: TimeEntry;
    hourHeight: number;
    onResizeCommit?: (entryId: string, startMinute: number, endMinute: number) => void;
    onResizeStart?: () => void;
    onResizeEnd?: (moved: boolean) => void;
}

type edgeType = "top" | "bottom";
type eventType = MouseEvent | TouchEvent;

export function useEntryResize({ entry, hourHeight, onResizeCommit, onResizeStart, onResizeEnd }: UseEntryResizeProps) {
    const resizeRef = useRef<{
        edge: edgeType | null;
        startMinute: number;
        endMinute: number;
        startClientY: number;
    }>({ edge: null, startMinute: entry.startMinute, endMinute: entry.endMinute, startClientY: 0 });

    const [previewStart, setPreviewStart] = useState<number | null>(null);
    const [previewEnd, setPreviewEnd] = useState<number | null>(null);
    const [resizing, setResizing] = useState(false);

    const pxPerMinute = pixelPerMinute(hourHeight);

    const startResize = (edge: edgeType, clientY: number) => {
        if (typeof onResizeStart === "function") onResizeStart();
        resizeRef.current = {
            edge,
            startMinute: previewStart ?? entry.startMinute,
            endMinute: previewEnd ?? entry.endMinute,
            startClientY: clientY,
        };

        setResizing(true);

        let raf: number | null = null;
        let moved = false;

        const handleMove = (e: eventType) => {
            let clientYPos = 0;
            if ((e as TouchEvent).touches) {
                e = e as TouchEvent;
                clientYPos = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0;
            } else {
                clientYPos = (e as MouseEvent).clientY;
            }

            if (raf) return;
            raf = requestAnimationFrame(() => {
                const r = resizeRef.current;
                if (!r.edge) {
                    raf = null;
                    return;
                }

                const deltaY = clientYPos - r.startClientY;
                const rawDeltaMinutes = deltaY / pxPerMinute;

                if (r.edge === "top") {
                    const candidate = r.startMinute + rawDeltaMinutes;
                    let newStart = snap(candidate);
                    newStart = clamp(newStart, 0, r.endMinute - INTERVAL_MINUTES);

                    const usedDeltaPixels = (newStart - r.startMinute) * pxPerMinute;

                    r.startClientY = r.startClientY + usedDeltaPixels;
                    r.startMinute = newStart;
                    moved = true;
                    setPreviewStart(newStart);
                    setPreviewEnd(null);
                } else {
                    const candidate = r.endMinute + rawDeltaMinutes;
                    let newEnd = snap(candidate);
                    newEnd = clamp(newEnd, r.startMinute + INTERVAL_MINUTES, MINUTES_PER_DAY);

                    const usedDeltaPixels = (newEnd - r.endMinute) * pxPerMinute;

                    r.startClientY = r.startClientY + usedDeltaPixels;
                    r.endMinute = newEnd;
                    moved = true;
                    setPreviewEnd(newEnd);
                    setPreviewStart(null);
                }
                raf = null;
            });
        };

        const handleUp = () => {
            const finalStart = previewStart ?? resizeRef.current.startMinute;
            const finalEnd = previewEnd ?? resizeRef.current.endMinute;
            if (typeof onResizeCommit === "function") {
                onResizeCommit(entry.id, finalStart, finalEnd);
            }
            setPreviewStart(null);
            setPreviewEnd(null);
            resizeRef.current.edge = null;
            setResizing(false);
            if (typeof onResizeEnd === "function") onResizeEnd(moved);
            window.removeEventListener("mousemove", handleMove as EventListener);
            window.removeEventListener("mouseup", handleUp as EventListener);
            window.removeEventListener("touchmove", handleMove as EventListener);
            window.removeEventListener("touchend", handleUp as EventListener);

            if (raf) cancelAnimationFrame(raf);
        };

        window.addEventListener("mousemove", handleMove as EventListener);
        window.addEventListener("mouseup", handleUp as EventListener);
        window.addEventListener("touchmove", handleMove as EventListener, { passive: false } as AddEventListenerOptions);
        window.addEventListener("touchend", handleUp as EventListener);
    };

    return {
        previewStart,
        previewEnd,
        resizing,
        startResize
    };
}
