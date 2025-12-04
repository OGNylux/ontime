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
}

export function useCalendarEntry({
    entry,
    hourHeight,
    widthPercent = 100,
    offsetPercent = 0,
    isPreview = false,
    isDragging = false,
    onDragStart,
    onResizeCommit
}: UseCalendarEntryProps) {
    const paperRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);

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
        if (onDragStart) onDragStart(event.clientX, event.clientY);
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
