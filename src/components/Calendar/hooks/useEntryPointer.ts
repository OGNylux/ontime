import { useEffect, useRef } from "react";

interface UseEntryPointerProps {
    paperRef: React.RefObject<HTMLDivElement>;
    onDragStart?: (clientX: number, clientY: number) => void;
}

const LONG_PRESS_DURATION = 400;

export function useEntryPointer({ paperRef, onDragStart }: UseEntryPointerProps) {
    const timerRef = useRef<number | null>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const pointerIdRef = useRef<number | null>(null);
    const activeRef = useRef(false);
    const onDragStartRef = useRef(onDragStart);

    useEffect(() => { onDragStartRef.current = onDragStart; }, [onDragStart]);

    useEffect(() => {
        const el = paperRef.current;
        if (!el) return;

        const handlePointerDown = (ev: PointerEvent) => {
            if (!onDragStartRef.current) return;
            // Only primary button
            if ((ev as any).button && (ev as any).button !== 0) return;

            // If the pointerdown started on a resize handle, don't start a move here.
            try {
                const target = ev.target as Element | null;
                if (target && (target as Element).closest && (target as Element).closest('.resize-handle')) {
                    return;
                }
            } catch (_) {}

            pointerIdRef.current = ev.pointerId;
            startPosRef.current = { x: ev.clientX, y: ev.clientY };
            activeRef.current = false;

            // begin long-press timer
            timerRef.current = window.setTimeout(() => {
                activeRef.current = true;
                try {
                    // try to capture the pointer on the element so it continues to receive events
                    (el as any).setPointerCapture(ev.pointerId);
                } catch (_) {}
                try { if (navigator.vibrate) navigator.vibrate(50); } catch (_) {}
                onDragStartRef.current && onDragStartRef.current(ev.clientX, ev.clientY);
            }, LONG_PRESS_DURATION);
        };

        const handlePointerMove = (ev: PointerEvent) => {
            if (timerRef.current && startPosRef.current && !activeRef.current) {
                const dx = ev.clientX - startPosRef.current.x;
                const dy = ev.clientY - startPosRef.current.y;
                if (dx * dx + dy * dy > 100) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                    startPosRef.current = null;
                }
            }
            if (activeRef.current) {
                // prevent default while dragging
                try { if (ev.cancelable) ev.preventDefault(); } catch (_) {}
            }
        };

        const handlePointerUp = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (activeRef.current) {
                try {
                    if (pointerIdRef.current !== null) (el as any).releasePointerCapture(pointerIdRef.current);
                } catch (_) {}
            }
            startPosRef.current = null;
            pointerIdRef.current = null;
            activeRef.current = false;
        };

        el.addEventListener("pointerdown", handlePointerDown);
        el.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);

        return () => {
            el.removeEventListener("pointerdown", handlePointerDown);
            el.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [paperRef.current]);
}
