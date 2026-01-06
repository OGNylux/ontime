import { useRef, useCallback } from "react";
import { ResizeHandlePosition } from "../util/calendarUtility";

interface CalendarEntryResizeHandleProps {
    position: ResizeHandlePosition;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart?: (e: React.TouchEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
}

const DRAG_THRESHOLD = 5; // pixels of movement before considered a drag

export default function CalendarEntryResizeHandle({ position, onMouseDown, onClick }: CalendarEntryResizeHandleProps) {
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const didDragRef = useRef(false);
    const resizeStartedRef = useRef(false);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Capture pointer to prevent parent handlers from taking over
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        
        startPosRef.current = { x: e.clientX, y: e.clientY };
        didDragRef.current = false;
        resizeStartedRef.current = false;

        const onMove = (ev: PointerEvent) => {
            if (!startPosRef.current) return;
            const dx = ev.clientX - startPosRef.current.x;
            const dy = ev.clientY - startPosRef.current.y;
            
            // If moved beyond threshold, start resize (only once)
            if (!didDragRef.current && (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD)) {
                didDragRef.current = true;
                resizeStartedRef.current = true;
                if (onMouseDown) onMouseDown(e as any);
            }
        };

        const onUp = (_: PointerEvent) => {
            cleanup();
            // Release pointer capture
            try {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            } catch (_) {}
            
            // If we didn't drag, it's a click - trigger onClick
            if (!didDragRef.current && onClick) {
                onClick(e as any);
            }
            startPosRef.current = null;
        };

        const cleanup = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    }, [onMouseDown, onClick]);

    return (
        <div
            onPointerDown={handlePointerDown}
            className={`resize-handle absolute left-0 right-0 h-3 flex items-center justify-center cursor-ns-resize pointer-events-auto select-none`}
            style={{ [position]: 0 }}
            aria-hidden={false}
        >
            <span style={{ opacity: 0.85, fontSize: 10 }}>--</span>
        </div>
    );
}
