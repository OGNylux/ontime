import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import dayjs from "dayjs";
import { clamp, INTERVAL_MINUTES, MINUTES_PER_DAY, MINUTES_PER_HOUR } from "./util/calendarUtility";
import { assignEntryLayout } from "./util/calendarUtility";
import type {
    AssignedEntry,
    DragState,
    EntryAttributes,
    EntryDragStartPayload,
    MoveState,
    TimeEntry,
} from "./util/calendarTypes";

const INITIAL_DRAG: DragState = { active: false, startMinute: null, endMinute: null };

interface DragOverlayEntry extends TimeEntry {}

export interface UseCalendarDayParams {
    dateStr: string;
    entries: TimeEntry[];
    moveState: MoveState | null;
    onCreateEntry: (dateStr: string, attributes: EntryAttributes) => void;
    onEntryDragStart: (payload: EntryDragStartPayload) => void;
}

export interface UseCalendarDayResult {
    containerRef: RefObject<HTMLDivElement | null>;
    hourHeight: number;
    handleMouseDown: (hour: number) => (event: ReactMouseEvent<HTMLDivElement>) => void;
    handleEntryDragStart: (entry: AssignedEntry, clientX: number, clientY: number) => void;
    renderedEntries: Array<{ entry: AssignedEntry; isPreview: boolean; isDragging: boolean }>;
    dragOverlayEntry: DragOverlayEntry | null;
    pendingEntry: EntryAttributes | null;
    setPendingEntry: (entry: EntryAttributes | null) => void;
    pendingEntryAnchor: { left: number; top: number } | null;
}

// --- Helper Functions ---

const resolveMinuteOffset = (y: number, rect: DOMRect) => {
    const minutesForDay = Math.floor((y / rect.height) * MINUTES_PER_DAY);
    return Math.round(minutesForDay / INTERVAL_MINUTES) * INTERVAL_MINUTES;
};

const resolveMinuteOffsetWithinHour = (y: number, rect: DOMRect, hour: number) => {
    const minuteOfHour = Math.floor((y / rect.height) * MINUTES_PER_HOUR);
    const absoluteMinute = hour * MINUTES_PER_HOUR + minuteOfHour;
    return Math.round(absoluteMinute / INTERVAL_MINUTES) * INTERVAL_MINUTES;
};

const findMinuteOffset = (y: number, rect: DOMRect, hour?: number) => {
    if (typeof hour === "number") {
        return resolveMinuteOffsetWithinHour(y, rect, hour);
    }
    return resolveMinuteOffset(y, rect);
};

// --- Custom Hooks ---

/**
 * Manages the height of the hour rows, updating on window resize.
 */
function useHourHeight(containerRef: RefObject<HTMLDivElement | null>) {
    const [hourHeight, setHourHeight] = useState(40);

    useEffect(() => {
        const updateHourHeight = () => {
            if (!containerRef.current) return;
            const firstHour = containerRef.current.querySelector("[data-hour]");
            if (!firstHour) return;
            const rect = (firstHour as HTMLElement).getBoundingClientRect();
            setHourHeight(rect.height);
        };

        updateHourHeight();
        window.addEventListener("resize", updateHourHeight);
        return () => window.removeEventListener("resize", updateHourHeight);
    }, [containerRef]);

    return hourHeight;
}

/**
 * Manages the drag-to-create interaction.
 */
function useDragSelection(
    containerRef: RefObject<HTMLDivElement | null>,
    moveState: MoveState | null
) {
    const [drag, setDrag] = useState<DragState>(INITIAL_DRAG);
    const [pendingEntry, setPendingEntry] = useState<EntryAttributes | null>(null);
    const [pendingEntryAnchor, setPendingEntryAnchor] = useState<{ left: number; top: number } | null>(null);
    
    const dragRef = useRef<DragState>(INITIAL_DRAG);
    const isDragHandledRef = useRef(true);

    useEffect(() => {
        dragRef.current = drag;
    }, [drag]);

    const beginDrag = useCallback((minute: number) => {
        isDragHandledRef.current = false;
        setDrag({ active: true, startMinute: minute, endMinute: minute });
    }, []);

    const updateDrag = useCallback((clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const offsetY = clientY - rect.top;
        const clampedY = clamp(offsetY, 0, rect.height);
        const minute = findMinuteOffset(clampedY, rect);
        
        setDrag(prev => {
            if (!prev.active || prev.endMinute === minute) return prev;
            return { ...prev, endMinute: minute };
        });
    }, [containerRef]);

    const finishDrag = useCallback((event?: MouseEvent | TouchEvent) => {
        const prev = dragRef.current;
        if (!prev.active || prev.startMinute === null || prev.endMinute === null) {
            setDrag(INITIAL_DRAG);
            return;
        }
        if (isDragHandledRef.current) {
            setDrag(INITIAL_DRAG);
            return;
        }
        isDragHandledRef.current = true;

        const startMinute = Math.min(prev.startMinute, prev.endMinute);
        const endMinute = Math.max(prev.startMinute, prev.endMinute);
        
        setDrag(INITIAL_DRAG);

        let anchor = null;
        if (event) {
            if ('changedTouches' in event) {
                const touch = event.changedTouches[0];
                anchor = { left: touch.clientX, top: touch.clientY };
            } else {
                const mouseEvent = event as MouseEvent;
                anchor = { left: mouseEvent.clientX, top: mouseEvent.clientY };
            }
        }

        if (startMinute === endMinute) {
            setPendingEntry({
                startMinute,
                endMinute: startMinute + 15,
                title: "",
            });
            setPendingEntryAnchor(anchor);
            return;
        }

        setPendingEntry({
            startMinute,
            endMinute,
            title: "",
        });
        setPendingEntryAnchor(anchor);
    }, []);

    useEffect(() => {
        if (!drag.active) return;

        const handleMouseMove = (event: MouseEvent) => updateDrag(event.clientY);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", finishDrag);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", finishDrag);
        };
    }, [drag.active, finishDrag, updateDrag]);

    const handleMouseDown = useCallback((hour: number) => (event: ReactMouseEvent<HTMLDivElement>) => {
        if (moveState) return;
        if (event.cancelable) event.preventDefault();

        const rect = event.currentTarget.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const minute = findMinuteOffset(y, rect, hour);
        beginDrag(minute);
    }, [moveState, beginDrag]);

    return {
        drag,
        pendingEntry,
        setPendingEntry,
        pendingEntryAnchor,
        handleMouseDown
    };
}

/**
 * Manages the layout of entries, including the preview entry during a move operation.
 */
function useEntryLayout(
    entries: TimeEntry[],
    moveState: MoveState | null,
    dateStr: string,
    hourHeight: number,
    drag: DragState
) {
    const assignedEntries = useMemo(() => assignEntryLayout(entries, hourHeight), [entries, hourHeight]);

    const previewEntry = useMemo<AssignedEntry | null>(() => {
        if (!moveState) return null;
        
        let preview: TimeEntry | null = null;

        // Case 1: Dragging on the current day
        if (moveState.currentDateStr === dateStr) {
            preview = {
                ...moveState.entry,
                id: `${moveState.entry.id}-preview`,
                startMinute: moveState.startMinute,
                endMinute: Math.min(moveState.endMinute, MINUTES_PER_DAY),
            };
        } 
        // Case 2: Dragging on the previous day, but it spills over to this day
        else if (moveState.endMinute > MINUTES_PER_DAY) {
            const nextDay = dayjs(moveState.currentDateStr).add(1, 'day').format('YYYY-MM-DD');
            if (nextDay === dateStr) {
                preview = {
                    ...moveState.entry,
                    id: `${moveState.entry.id}-preview-next`,
                    startMinute: 0,
                    endMinute: moveState.endMinute - MINUTES_PER_DAY,
                };
            }
        }

        if (!preview) return null;

        const comparisonEntries = moveState.fromDateStr === dateStr
            ? entries.filter(entry => entry.id !== moveState.entry.id)
            : entries;

        const layout = assignEntryLayout([...comparisonEntries, preview], hourHeight);
        return layout.find(item => item.id === preview.id) ?? null;
    }, [entries, moveState, dateStr, hourHeight]);

    const renderedEntries = useMemo((): Array<{ entry: AssignedEntry; isPreview: boolean; isDragging: boolean }> => {
        const list = assignedEntries.map(entry => ({
            entry,
            isPreview: false,
            isDragging: Boolean(moveState && moveState.entry.id === entry.id && moveState.fromDateStr === dateStr),
        }));

        if (previewEntry) list.push({ entry: previewEntry, isPreview: true, isDragging: false });

        return list;
    }, [assignedEntries, previewEntry, moveState, dateStr]);

    const dragOverlayEntry = useMemo<DragOverlayEntry | null>(() => {
        if (moveState) return null;
        if (!drag.active || drag.startMinute === null || drag.endMinute === null) return null;
        if (drag.startMinute === drag.endMinute) return null;

        const startMinute = Math.min(drag.startMinute, drag.endMinute);
        const endMinute = Math.max(drag.startMinute, drag.endMinute);

        return {
            id: "drag",
            startMinute,
            endMinute,
            title: "New Entry",
        };
    }, [drag, moveState]);

    return { renderedEntries, dragOverlayEntry };
}

// --- Main Hook ---

export function useCalendarDay({ dateStr, entries, moveState, onEntryDragStart }: UseCalendarDayParams): UseCalendarDayResult {
    const containerRef = useRef<HTMLDivElement | null>(null);
    
    const hourHeight = useHourHeight(containerRef);
    
    const { 
        drag, 
        pendingEntry, 
        setPendingEntry, 
        pendingEntryAnchor, 
        handleMouseDown 
    } = useDragSelection(containerRef, moveState);

    const { 
        renderedEntries, 
        dragOverlayEntry 
    } = useEntryLayout(entries, moveState, dateStr, hourHeight, drag);

    const handleEntryDragStart = useCallback((entry: AssignedEntry, clientX: number, clientY: number) => {
        if (moveState) return;
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const y = clientY - rect.top;
        const pointerMinute = findMinuteOffset(y, rect);
        const pointerOffset = pointerMinute - entry.startMinute;

        onEntryDragStart({
            dateStr,
            entryId: entry.id,
            pointerOffset,
            clientX: clientX,
            clientY: clientY,
        });
    }, [dateStr, moveState, onEntryDragStart]);

    return {
        containerRef,
        hourHeight,
        handleMouseDown,
        handleEntryDragStart,
        renderedEntries,
        dragOverlayEntry,
        pendingEntry,
        setPendingEntry,
        pendingEntryAnchor,
    };
}
