import { useState, useCallback, useRef, MouseEvent } from "react";
import { MINUTES_PER_HOUR, INTERVAL_MINUTES, clampMinute, snap } from "../util/calendarUtility";

interface DragState {
    isDragging: boolean;
    startY: number;
    startMinute: number;
    currentMinute: number;
}

interface UseCalendarDragProps {
    hourHeight: number;
    dateStr: string;
    isTouchDevice: boolean;
    gapSize: number;
    onCreateEntry: (dateStr: string, startMinute: number, endMinute: number, anchorPosition: { top: number; left: number }) => void;
    onDragEnd?: (info: { startMinute: number; endMinute: number } | null) => void;
}

export function useCalendarDrag({ hourHeight, dateStr, isTouchDevice, gapSize, onCreateEntry, onDragEnd }: UseCalendarDragProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        startY: 0,
        startMinute: 0,
        currentMinute: 0,
    });

    const pixelsPerMinute = hourHeight / MINUTES_PER_HOUR;

    const getMinuteFromY = useCallback((clientY: number): number => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const y = clientY - rect.top;
        const minute = y / pixelsPerMinute;
        return snap(clampMinute(minute));
    }, [pixelsPerMinute]);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        // Disable drag on touch devices
        if (isTouchDevice) return;
        
        // Only handle left click
        if (e.button !== 0) return;

        const minute = getMinuteFromY(e.clientY);
        
        setDragState({
            isDragging: true,
            startY: e.clientY,
            startMinute: minute,
            currentMinute: minute,
        });
    }, [getMinuteFromY, isTouchDevice]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState.isDragging || isTouchDevice) return;

        const minute = getMinuteFromY(e.clientY);
        setDragState(prev => ({
            ...prev,
            currentMinute: minute,
        }));
    }, [dragState.isDragging, getMinuteFromY, isTouchDevice]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!dragState.isDragging || isTouchDevice) return;

        const endMinute = getMinuteFromY(e.clientY);
        const startMinute = Math.min(dragState.startMinute, endMinute);
        const finalEndMinute = Math.max(dragState.startMinute, endMinute);

        // If it's a click (no drag), default to gap size duration
        const isClick = Math.abs(finalEndMinute - startMinute) < INTERVAL_MINUTES;
        const adjustedEndMinute = isClick 
            ? clampMinute(startMinute + gapSize) 
            : finalEndMinute;

        // Get anchor position for the popover
        const anchorPosition = {
            top: e.clientY,
            left: e.clientX,
        };

        // Notify parent to keep drag preview
            // Notify parent to keep drag preview, with actual start/end minutes
            if (onDragEnd) {
                onDragEnd({ startMinute, endMinute: adjustedEndMinute });
            }

        // Reset local drag state; parent will render persistent preview
        onCreateEntry(dateStr, startMinute, adjustedEndMinute, anchorPosition);
        setDragState({
            isDragging: false,
            startY: 0,
            startMinute: 0,
            currentMinute: 0,
        });
    }, [dragState.isDragging, dragState.startMinute, getMinuteFromY, dateStr, onCreateEntry, isTouchDevice, onDragEnd]);

    const handleClick = useCallback((e: MouseEvent) => {
        // On touch devices, handle tap for opening dialog
        if (!isTouchDevice) return;

        const minute = getMinuteFromY(e.clientY);
        const startMinute = snap(minute);
        const endMinute = clampMinute(startMinute + gapSize);

        const anchorPosition = {
            top: e.clientY,
            left: e.clientX,
        };

        onCreateEntry(dateStr, startMinute, endMinute, anchorPosition);
    }, [isTouchDevice, getMinuteFromY, dateStr, onCreateEntry]);

    // Calculate drag preview dimensions
    const dragPreview = dragState.isDragging ? {
        top: Math.min(dragState.startMinute, dragState.currentMinute) * pixelsPerMinute,
        height: Math.abs(dragState.currentMinute - dragState.startMinute) * pixelsPerMinute,
    } : null;

    // Add a method to clear drag state
    const clearDrag = () => setDragState({
        isDragging: false,
        startY: 0,
        startMinute: 0,
        currentMinute: 0,
    });

    return {
        containerRef,
        dragPreview,
        isDragging: dragState.isDragging,
        handlers: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseUp,
            onClick: handleClick,
        },
        clearDrag,
    };
}
