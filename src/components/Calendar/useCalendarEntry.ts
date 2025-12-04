import { useRef, useState, type MouseEvent } from "react";
import { clampPercent, ENTRY_MARGIN_PERCENT, MIN_ENTRY_WIDTH, clamp } from "./calendarUtility";
import { TimeEntry } from "./calendarTypes";
import { useEntryTouch } from "./useEntryTouch";
import { useEntryResize } from "./useEntryResize";

interface UseCalendarEntryProps {
    entry: TimeEntry;
    hourHeight: number;
    widthPercent?: number;
    offsetPercent?: number;
    isPreview?: boolean;
    isDragging?: boolean;
    onDragStart?: (clientX: number, clientY: number) => void;
    onResizeCommit?: (entryId: string, startMinute: number, endMinute: number) => void;
    onEntryClick?: (event: MouseEvent | globalThis.MouseEvent) => void;
}

export function useCalendarEntry({
    entry,
    hourHeight,
    widthPercent = 100,
    offsetPercent = 0,
    isPreview = false,
    isDragging = false,
    onDragStart,
    onResizeCommit,
    onEntryClick
}: UseCalendarEntryProps) {
    const paperRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);
    const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);

    // Handle touch interactions (long press to drag)
    useEntryTouch({
        paperRef: paperRef as React.RefObject<HTMLDivElement>,
        onDragStart
    });

    // Handle resize interactions
    const {
        previewStart,
        previewEnd,
        resizing,
        startResize
    } = useEntryResize({
        entry,
        hourHeight,
        onResizeCommit
    });

    const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return; // Only left click
        
        dragStartPosRef.current = { x: event.clientX, y: event.clientY };
        isDraggingRef.current = false;

        const handleWindowMouseMove = (e: globalThis.MouseEvent) => {
            if (!dragStartPosRef.current) return;
            const dx = e.clientX - dragStartPosRef.current.x;
            const dy = e.clientY - dragStartPosRef.current.y;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                isDraggingRef.current = true;
                if (onDragStart) {
                    onDragStart(dragStartPosRef.current.x, dragStartPosRef.current.y);
                }
                cleanup();
            }
        };

        const handleWindowMouseUp = (e: globalThis.MouseEvent) => {
            cleanup();
            if (!isDraggingRef.current && onEntryClick) {
                onEntryClick(e);
            }
        };

        const cleanup = () => {
            window.removeEventListener("mousemove", handleWindowMouseMove);
            window.removeEventListener("mouseup", handleWindowMouseUp);
            dragStartPosRef.current = null;
        };

        window.addEventListener("mousemove", handleWindowMouseMove);
        window.addEventListener("mouseup", handleWindowMouseUp);
    };

    let renderOffset = clampPercent(offsetPercent);
    let renderWidth = clampPercent(widthPercent);;

    if (isDragging || isPreview) {
        renderOffset = 0;
        renderWidth = 100;
    }

    if (renderWidth >= 100 && renderOffset === 0) {
        renderOffset = ENTRY_MARGIN_PERCENT;
        renderWidth = Math.max(MIN_ENTRY_WIDTH, 100 - ENTRY_MARGIN_PERCENT * 2);
    } else {
        if (renderOffset + renderWidth > 100) renderWidth = Math.max(MIN_ENTRY_WIDTH, 100 - renderOffset);
        if (renderWidth < MIN_ENTRY_WIDTH) {
            renderWidth = MIN_ENTRY_WIDTH;
            renderOffset = clamp(renderOffset, 0, 100 - MIN_ENTRY_WIDTH);
        }
    }

    const displayStart = previewStart ?? entry.startMinute;
    const displayEnd = previewEnd ?? entry.endMinute;

    const showHandles = !isPreview && !isDragging && (hovered || resizing || previewStart !== null || previewEnd !== null);

    return {
        paperRef,
        handleMouseDown,
        setHovered,
        displayStart,
        displayEnd,
        renderWidth,
        renderOffset,
        showHandles,
        startResize
    };
}
