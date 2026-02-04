import { useEffect, useRef } from "react";

interface UseEntryLongPressProps {
    paperRef: React.RefObject<HTMLDivElement>;
    onDragStart?: (clientX: number, clientY: number) => void;
}

const LONG_PRESS_DURATION = 400; 
const MOVE_THRESHOLD_SQ = 100; 

export function useEntryLongPress({ paperRef, onDragStart }: UseEntryLongPressProps) {
    const timerRef = useRef<number | null>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const activeRef = useRef(false);
    const onDragStartRef = useRef(onDragStart);

    useEffect(() => {
        onDragStartRef.current = onDragStart;
    }, [onDragStart]);

    useEffect(() => {
        const el = paperRef.current;
        if (!el) return;

        const clearTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const reset = () => {
            clearTimer();
            startPosRef.current = null;
            activeRef.current = false;
        };

        const checkMovement = (clientX: number, clientY: number): boolean => {
            if (!startPosRef.current) return false;
            const dx = clientX - startPosRef.current.x;
            const dy = clientY - startPosRef.current.y;
            return dx * dx + dy * dy > MOVE_THRESHOLD_SQ;
        };

        const startLongPress = (clientX: number, clientY: number, pointerId?: number) => {
            if (!onDragStartRef.current) return;
            
            startPosRef.current = { x: clientX, y: clientY };
            activeRef.current = false;

            timerRef.current = window.setTimeout(() => {
                activeRef.current = true;
                
                
                if (pointerId !== undefined) {
                    try { el.setPointerCapture(pointerId); } catch (_) {}
                }
                
                
                try { navigator.vibrate?.(50); } catch (_) {}
                
                onDragStartRef.current?.(clientX, clientY);
                timerRef.current = null;
            }, LONG_PRESS_DURATION);
        };

        
        const handlePointerDown = (ev: PointerEvent) => {
            if (!onDragStartRef.current || ev.button !== 0) return;
            
            
            const target = ev.target as Element | null;
            if (target?.closest?.('.resize-handle')) return;

            startLongPress(ev.clientX, ev.clientY, ev.pointerId);
        };

        const handlePointerMove = (ev: PointerEvent) => {
            if (timerRef.current && !activeRef.current && checkMovement(ev.clientX, ev.clientY)) {
                reset();
            }
            if (activeRef.current && ev.cancelable) {
                ev.preventDefault();
            }
        };

        const handlePointerUp = () => reset();

        
        const handleTouchStart = (ev: TouchEvent) => {
            if (!onDragStartRef.current) return;
            const touch = ev.touches[0];
            startLongPress(touch.clientX, touch.clientY);
        };

        const handleTouchMove = (ev: TouchEvent) => {
            const touch = ev.touches[0];
            if (timerRef.current && !activeRef.current && checkMovement(touch.clientX, touch.clientY)) {
                reset();
            }
            if (activeRef.current && ev.cancelable) {
                ev.preventDefault();
            }
        };

        const handleTouchEnd = () => reset();

        
        el.addEventListener("pointerdown", handlePointerDown);
        el.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
        
        el.addEventListener("touchstart", handleTouchStart, { passive: true });
        el.addEventListener("touchmove", handleTouchMove, { passive: false });
        el.addEventListener("touchend", handleTouchEnd);
        el.addEventListener("touchcancel", handleTouchEnd);

        return () => {
            el.removeEventListener("pointerdown", handlePointerDown);
            el.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
            
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchmove", handleTouchMove);
            el.removeEventListener("touchend", handleTouchEnd);
            el.removeEventListener("touchcancel", handleTouchEnd);
            
            clearTimer();
        };
    }, [paperRef]);
}
