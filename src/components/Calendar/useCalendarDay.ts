import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { INTERVAL_MINUTES, MINUTES_PER_DAY, MINUTES_PER_HOUR } from "./calendarUtility";
import { assignEntryLayout } from "./calendarUtility";
import type {
    AssignedEntry,
    DragState,
    EntryAttributes,
    EntryDragStartPayload,
    MoveState,
    TimeEntry,
} from "./calendarTypes";

const INITIAL_DRAG: DragState = { active: false, startMinute: null, endMinute: null };

interface DragOverlayEntry extends TimeEntry {}

export interface UseCalendarDayParams {
    dayIndex: number;
    entries: TimeEntry[];
    moveState: MoveState | null;
    onCreateEntry: (dayIndex: number, attributes: EntryAttributes) => void;
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

const resolveMinuteOffset = (y: number, rect: DOMRect) => {
    const minutesForDay = Math.floor((y / rect.height) * MINUTES_PER_DAY);
    return Math.round(minutesForDay / INTERVAL_MINUTES) * INTERVAL_MINUTES;
};

const resolveMinuteOffsetWithinHour = (y: number, rect: DOMRect, hour: number) => {
    const minuteOfHour = Math.floor((y / rect.height) * MINUTES_PER_HOUR);
    const absoluteMinute = hour * MINUTES_PER_HOUR + minuteOfHour;
    return Math.round(absoluteMinute / INTERVAL_MINUTES) * INTERVAL_MINUTES;
};

export function useCalendarDay({ dayIndex, entries, moveState, onEntryDragStart }: UseCalendarDayParams): UseCalendarDayResult {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [drag, setDrag] = useState<DragState>(INITIAL_DRAG);
    const [hourHeight, setHourHeight] = useState(40);
    const isDragHandledRef = useRef(true);
    const [pendingEntry, setPendingEntry] = useState<EntryAttributes | null>(null);
    const [pendingEntryAnchor, setPendingEntryAnchor] = useState<{ left: number; top: number } | null>(null);
    const dragRef = useRef<DragState>(INITIAL_DRAG);

    useEffect(() => {
        dragRef.current = drag;
    }, [drag]);

    // Measure the rendered hour row height so overlays (entries) can compute
    // their pixel heights/positions. We recalc on window resize in case the
    // row size changes when the container is resized.
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
    }, []);

    const findMinuteOffset = useCallback((y: number, rect: DOMRect, hour?: number) => {
        if (typeof hour === "number") {
            return resolveMinuteOffsetWithinHour(y, rect, hour);
        }
        return resolveMinuteOffset(y, rect);
    }, []);

    // Begin a selection drag when user clicks/taps inside an hour. The
    // resulting `drag` state is used to render a preview overlay until the
    // user releases the pointer (mouseup) which will produce a pending entry
    // dialog or directly create an entry depending on duration.
    const beginDrag = useCallback((minute: number) => {
        isDragHandledRef.current = false;
        setDrag({ active: true, startMinute: minute, endMinute: minute });
    }, []);

    const updateDrag = useCallback((clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const offsetY = clientY - rect.top;
        const clampedY = Math.max(0, Math.min(rect.height, offsetY));
        const minute = findMinuteOffset(clampedY, rect);
        setDrag(prev => {
            if (!prev.active || prev.endMinute === minute) return prev;
            return { ...prev, endMinute: minute };
        });
    }, [findMinuteOffset]);

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

    const handleMouseDown = useCallback((hour: number) => (event: ReactMouseEvent<HTMLDivElement>) => {
        if (moveState) return;
        if (event.cancelable) event.preventDefault();

        const rect = event.currentTarget.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const minute = findMinuteOffset(y, rect, hour);
        beginDrag(minute);
    }, [beginDrag, findMinuteOffset, moveState]);

    const handleEntryDragStart = useCallback((entry: AssignedEntry, clientX: number, clientY: number) => {
        if (moveState) return;
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const y = clientY - rect.top;
        const pointerMinute = findMinuteOffset(y, rect);
        const pointerOffset = pointerMinute - entry.startMinute;

        onEntryDragStart({
            dayIndex,
            entryId: entry.id,
            pointerOffset,
            clientX: clientX,
            clientY: clientY,
        });
    }, [dayIndex, findMinuteOffset, moveState, onEntryDragStart]);

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

    const assignedEntries = useMemo(() => assignEntryLayout(entries), [entries]);

    const previewEntry = useMemo<AssignedEntry | null>(() => {
        if (!moveState) return null;
        if (moveState.currentDayIndex !== dayIndex) return null;

        const preview: TimeEntry = {
            ...moveState.entry,
            id: `${moveState.entry.id}-preview`,
            startMinute: moveState.startMinute,
            endMinute: moveState.endMinute,
        };

        const comparisonEntries = moveState.fromDayIndex === dayIndex
            ? entries.filter(entry => entry.id !== moveState.entry.id)
            : entries;

        const layout = assignEntryLayout([...comparisonEntries, preview]);
        return layout.find(item => item.id === preview.id) ?? null;
    }, [entries, moveState, dayIndex]);

    const renderedEntries = useMemo((): Array<{ entry: AssignedEntry; isPreview: boolean; isDragging: boolean }> => {
        const list = assignedEntries.map(entry => ({
            entry,
            isPreview: false,
            isDragging: Boolean(moveState && moveState.entry.id === entry.id && moveState.fromDayIndex === dayIndex),
        }));

        if (previewEntry) list.push({ entry: previewEntry, isPreview: true, isDragging: false });

        return list;
    }, [assignedEntries, previewEntry, moveState, dayIndex]);

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
