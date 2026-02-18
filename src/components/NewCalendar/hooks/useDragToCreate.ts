/**
 * useDragToCreate - drag on empty day area -> preview rectangle -> open dialog.
 *
 * Desktop: mouseDown -> drag -> mouseUp opens dialog with time range.
 * Touch:   single tap creates a default-duration slot.
 */
import { useState, useCallback, useRef, MouseEvent } from "react";
import { SNAP_INTERVAL } from "../constants";
import { clampMin, snap } from "../layout/timeUtils";
import type { PersistentPreview } from "../types";

interface DragState {
    active: boolean;
    startMinute: number;
    currentMinute: number;
}

const INITIAL: DragState = { active: false, startMinute: 0, currentMinute: 0 };

interface Props {
    pxPerMin: number;
    dateStr: string;
    isTouch: boolean;
    zoom: number;
    onOpen: (dateStr: string, startMin: number, endMin: number, anchor: { top: number; left: number }) => void;
    onPreviewSet?: (preview: PersistentPreview | null) => void;
}

export function useDragToCreate({ pxPerMin, dateStr, isTouch, zoom, onOpen, onPreviewSet }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [drag, setDrag] = useState<DragState>(INITIAL);

    // Convert clientY -> snapped minute
    const yToMin = useCallback((clientY: number): number => {
        if (!ref.current) return 0;
        const rect = ref.current.getBoundingClientRect();
        return snap(clampMin(((clientY - rect.top) / (pxPerMin || 1))));
    }, [pxPerMin]);

    //  Mouse handlers (desktop) 
    const onMouseDown = useCallback((e: MouseEvent) => {
        if (isTouch || e.button !== 0) return;
        const min = yToMin(e.clientY);
        setDrag({ active: true, startMinute: min, currentMinute: min });
    }, [yToMin, isTouch]);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!drag.active || isTouch) return;
        setDrag(p => ({ ...p, currentMinute: yToMin(e.clientY) }));
    }, [drag.active, yToMin, isTouch]);

    const onMouseUp = useCallback((e: MouseEvent) => {
        if (!drag.active || isTouch) return;
        const end = yToMin(e.clientY);
        const lo  = Math.min(drag.startMinute, end);
        const hi  = Math.max(drag.startMinute, end);
        const isClick = Math.abs(hi - lo) < SNAP_INTERVAL;
        const finalEnd = isClick ? clampMin(lo + zoom) : hi;

        onPreviewSet?.({ dateStr, startMinute: lo, endMinute: finalEnd });
        onOpen(dateStr, lo, finalEnd, { top: e.clientY, left: e.clientX });
        setDrag(INITIAL);
    }, [drag.active, drag.startMinute, yToMin, dateStr, zoom, onOpen, isTouch, onPreviewSet]);

    //  Touch handler (single tap) 
    const onClick = useCallback((e: MouseEvent) => {
        if (!isTouch) return;
        const min = snap(yToMin(e.clientY));
        const endMin = clampMin(min + zoom);
        onOpen(dateStr, min, endMin, { top: e.clientY, left: e.clientX });
    }, [isTouch, yToMin, dateStr, zoom, onOpen]);

    //  Derived preview 
    const preview = drag.active
        ? {
            topPx: Math.min(drag.startMinute, drag.currentMinute) * pxPerMin,
            heightPx: Math.abs(drag.currentMinute - drag.startMinute) * pxPerMin,
        }
        : null;

    const clear = useCallback(() => setDrag(INITIAL), []);

    return {
        ref,
        preview,
        isDragging: drag.active,
        handlers: {
            onMouseDown,
            onMouseMove,
            onMouseUp,
            onMouseLeave: onMouseUp,
            onClick,
        },
        clear,
    };
}
