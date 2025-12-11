import { useEffect, useRef } from "react";

interface UseEntryTouchProps {
    paperRef: React.RefObject<HTMLDivElement>;
    onDragStart?: (clientX: number, clientY: number) => void;
}

const LONG_PRESS_DURATION = 400; // milliseconds

export function useEntryTouch({ paperRef, onDragStart }: UseEntryTouchProps) {
    const longPressTimerRef = useRef<number | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
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

            longPressTimerRef.current = window.setTimeout(() => {
                if (onDragStartRef.current && touchStartPosRef.current) {
                    onDragStartRef.current(touch.clientX, touch.clientY);
                }
                longPressTimerRef.current = null;
            }, LONG_PRESS_DURATION);
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (longPressTimerRef.current && touchStartPosRef.current) {
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
        };

        const handleTouchEnd = () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            touchStartPosRef.current = null;
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
