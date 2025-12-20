import { useEffect, useRef } from "react";

interface UseEntryTouchProps {
    paperRef: React.RefObject<HTMLDivElement>;
    onDragStart?: (clientX: number, clientY: number) => void;
}

const LONG_PRESS_DURATION = 400; // milliseconds

export function useEntryTouch({ paperRef, onDragStart }: UseEntryTouchProps) {
    const longPressTimerRef = useRef<number | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const longPressActiveRef = useRef(false);
    const originalTouchActionRef = useRef<string | null>(null);
    const originalBodyTouchActionRef = useRef<string | null>(null);
    const originalBodyOverscrollRef = useRef<string | null>(null);
    const onDragStartRef = useRef(onDragStart);
    
    useEffect(() => {
        onDragStartRef.current = onDragStart;
    }, [onDragStart]);

    useEffect(() => {
        const element = paperRef.current;
        if (!element) return;

        const handleTouchStart = (event: TouchEvent) => {
            if (!onDragStartRef.current) return;

            const touch = event.touches[0];
            touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

            try {
                if (element && element.style) {
                    originalTouchActionRef.current = element.style.touchAction || null;
                    element.style.touchAction = 'none';
                }
            } catch (err) {}

            longPressActiveRef.current = false;
            longPressTimerRef.current = window.setTimeout(() => {
                if (onDragStartRef.current && touchStartPosRef.current) {
                    longPressActiveRef.current = true;
                    try {
                        if (typeof document !== 'undefined' && document.body) {
                            originalBodyTouchActionRef.current = document.body.style.touchAction || null;
                            document.body.style.touchAction = 'none';
                            originalBodyOverscrollRef.current = (document.body.style as any).overscrollBehavior || null;
                            (document.body.style as any).overscrollBehavior = 'none';
                            try {
                                const docEl = document.documentElement;
                                if (docEl && (docEl.style as any)) {
                                    (docEl.style as any).overscrollBehavior = 'none';
                                }
                            } catch (_) {}
                        }
                    } catch (err) {}
                    onDragStartRef.current(touch.clientX, touch.clientY);
                }
                longPressTimerRef.current = null;
            }, LONG_PRESS_DURATION);
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (!longPressActiveRef.current && longPressTimerRef.current && touchStartPosRef.current) {
                const touch = event.touches[0];
                const dx = touch.clientX - touchStartPosRef.current.x;
                const dy = touch.clientY - touchStartPosRef.current.y;
                const distanceSq = dx * dx + dy * dy;

                if (distanceSq > 100) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                    touchStartPosRef.current = null;
                }
            }
            if (longPressActiveRef.current) {
                try {
                    if (event.cancelable) event.preventDefault();
                } catch (err) {}
            }
            try { console.debug('[old useEntryTouch] touchmove', { longPressActive: longPressActiveRef.current }); } catch (err) {}
        };

        const handleTouchEnd = () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            touchStartPosRef.current = null;
            longPressActiveRef.current = false;
            try {
                if (element && originalTouchActionRef.current !== null) {
                    element.style.touchAction = originalTouchActionRef.current;
                    originalTouchActionRef.current = null;
                }
            } catch (err) {}
            try {
                if (typeof document !== 'undefined' && document.body && originalBodyTouchActionRef.current !== null) {
                    document.body.style.touchAction = originalBodyTouchActionRef.current;
                    originalBodyTouchActionRef.current = null;
                }
            } catch (err) {}
            try {
                if (typeof document !== 'undefined' && document.body && originalBodyOverscrollRef.current !== null) {
                    (document.body.style as any).overscrollBehavior = originalBodyOverscrollRef.current;
                    originalBodyOverscrollRef.current = null;
                    try {
                        const docEl = document.documentElement;
                        if (docEl && (docEl.style as any)) {
                            (docEl.style as any).overscrollBehavior = '';
                        }
                    } catch (_) {}
                }
            } catch (err) {}
        };

        element.addEventListener("touchstart", handleTouchStart);
        element.addEventListener("touchmove", handleTouchMove);
        element.addEventListener("touchend", handleTouchEnd);
        element.addEventListener("touchcancel", handleTouchEnd);

        return () => {
            element.removeEventListener("touchstart", handleTouchStart);
            element.removeEventListener("touchmove", handleTouchMove);
            element.removeEventListener("touchend", handleTouchEnd);
            element.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, []);
}
