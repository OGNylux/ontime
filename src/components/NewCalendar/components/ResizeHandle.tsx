/**
 * ResizeHandle - draggable edge on an entry block (top or bottom).
 *
 * Uses pointer capture for smooth cross-element tracking.
 * On pointer-down without movement -> falls through to entry click.
 */
import { useRef, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import type { ResizeEdge } from "../types";

const DRAG_PX = 5;

interface Props {
    edge: ResizeEdge;
    onResize: (edge: ResizeEdge, clientY: number) => void;
    onClick?: (e: React.MouseEvent) => void;
}

export default function ResizeHandle({ edge, onResize, onClick }: Props) {
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const didDrag  = useRef(false);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        startRef.current = { x: e.clientX, y: e.clientY };
        didDrag.current = false;

        const onMove = (ev: PointerEvent) => {
            if (!startRef.current) return;
            const dx = ev.clientX - startRef.current.x;
            const dy = ev.clientY - startRef.current.y;
            if (!didDrag.current && dx * dx + dy * dy > DRAG_PX * DRAG_PX) {
                didDrag.current = true;
                onResize(edge, startRef.current.y);
            }
        };

        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* */ }
            if (!didDrag.current) onClick?.(e as any);
            startRef.current = null;
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    }, [edge, onResize, onClick]);

    return (
        <Box
            className="resize-handle"
            onPointerDown={handlePointerDown}
            position="absolute"
            left={0}
            right={0}
            height={12}
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{ cursor: "ns-resize", pointerEvents: "auto", userSelect: "none", [edge === "top" ? "top" : "bottom"]: 0, opacity: 0 }}
        >
            <Typography fontSize={10} color="background.default" sx={{ opacity: 0.85 }}>
                --
            </Typography>
        </Box>
    );
}
