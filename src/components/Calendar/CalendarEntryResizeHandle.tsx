import { useEffect, useRef } from "react";

interface CalendarEntryResizeHandleProps {
    position: "top" | "bottom";
    zIndex?: number;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart?: (e: React.TouchEvent) => void;
    className?: string;
    style?: React.CSSProperties;
}

export default function CalendarEntryResizeHandle({ position, zIndex = 10, onMouseDown, onTouchStart, className = "", style = {} }: CalendarEntryResizeHandleProps) {
    const mergedStyle: React.CSSProperties = { ...(style || {}), [position]: 0 } as any;
    const ref = useRef<HTMLDivElement | null>(null);
    const onMouseDownRef = useRef<((e: any) => void) | null>(null);
    const onTouchStartRef = useRef<((e: any) => void) | null>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        // Keep refs to the latest handlers so native listeners can call them
        onMouseDownRef.current = onMouseDown;
        onTouchStartRef.current = onTouchStart as any;

        const captureHandler = (e: Event) => {
            try { console.debug('[ResizeHandle] native capture', e.type); } catch (_) {}
            // Call the provided prop handler directly so it runs before other listeners
            try {
                if ((e as any).type === 'pointerdown' || (e as any).type === 'mousedown') {
                    onMouseDownRef.current && onMouseDownRef.current(e as any);
                } else if ((e as any).type === 'touchstart') {
                    onTouchStartRef.current && onTouchStartRef.current(e as any);
                }
            } catch (_) {}
            // Stop propagation to prevent parent handlers from receiving the event
            try { e.stopPropagation(); } catch (_) {}
        };

        node.addEventListener('pointerdown', captureHandler, { capture: true } as any);
        node.addEventListener('touchstart', captureHandler, { capture: true } as any);
        node.addEventListener('mousedown', captureHandler, { capture: true } as any);

        return () => {
            node.removeEventListener('pointerdown', captureHandler as any, { capture: true } as any);
            node.removeEventListener('touchstart', captureHandler as any, { capture: true } as any);
            node.removeEventListener('mousedown', captureHandler as any, { capture: true } as any);
        };
    }, []);

    return (
        <div
            ref={ref}
            onMouseDown={(e) => { console.debug('[ResizeHandle] onMouseDown'); e.stopPropagation(); onMouseDown && onMouseDown(e); }}
            onTouchStart={(e) => { console.debug('[ResizeHandle] onTouchStart'); e.stopPropagation(); onTouchStart && onTouchStart(e); }}
            onPointerDown={(e: React.PointerEvent) => { console.debug('[ResizeHandle] onPointerDown'); e.stopPropagation(); if (onMouseDown) onMouseDown(e as any); }}
            className={`resize-handle ${className} absolute left-0 right-0 h-3 flex items-center justify-center cursor-ns-resize pointer-events-auto select-none`}
            style={mergedStyle}
            // aria-hidden since it's purely interactive via pointer
            aria-hidden={false}
        >
            <span style={{ opacity: 0.85, fontSize: 10 }}>--</span>
        </div>
    );
}
