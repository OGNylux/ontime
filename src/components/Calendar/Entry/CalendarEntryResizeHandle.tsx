import { useRef, useCallback } from "react";
import { ResizeHandlePosition } from "../util/calendarUtility";
import { Box, Typography } from "@mui/material";

interface CalendarEntryResizeHandleProps {
    position: ResizeHandlePosition;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart?: (e: React.TouchEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
}

const DRAG_THRESHOLD = 5;

export default function CalendarEntryResizeHandle({ position, onMouseDown, onClick }: CalendarEntryResizeHandleProps) {
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const didDragRef = useRef(false);
    const resizeStartedRef = useRef(false);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        
        startPosRef.current = { x: e.clientX, y: e.clientY };
        didDragRef.current = false;
        resizeStartedRef.current = false;

        const onMove = (ev: PointerEvent) => {
            if (!startPosRef.current) return;
            const dx = ev.clientX - startPosRef.current.x;
            const dy = ev.clientY - startPosRef.current.y;
            
            if (!didDragRef.current && (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD)) {
                didDragRef.current = true;
                resizeStartedRef.current = true;
                if (onMouseDown) onMouseDown(e as any);
            }
        };

        const onUp = (_: PointerEvent) => {
            cleanup();
            try {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            } catch (_) {}
            
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
        <Box
            onPointerDown={handlePointerDown}
            position="absolute"
            left={0}
            right={0}
            height={12}
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{ cursor: 'ns-resize', pointerEvents: 'auto', userSelect: 'none', [position]: 0 }}
            aria-hidden={false}
        >
            <Typography fontSize={10} color="background.default" sx={{opacity: 0.85}}>--</Typography>
        </Box>
    );
}
