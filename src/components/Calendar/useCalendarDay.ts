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
    handleEntryDragStart: (entry: AssignedEntry, event: ReactMouseEvent<HTMLDivElement>) => void;
    renderedEntries: Array<{ entry: AssignedEntry; isPreview: boolean }>;
    dragOverlayEntry: DragOverlayEntry | null;
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

export function useCalendarDay({ dayIndex, entries, moveState, onCreateEntry, onEntryDragStart }: UseCalendarDayParams): UseCalendarDayResult {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [drag, setDrag] = useState<DragState>(INITIAL_DRAG);
    const [hourHeight, setHourHeight] = useState(40);
    const isDragHandledRef = useRef(true);

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

    const finishDrag = useCallback(() => {
        setDrag(prev => {
            if (!prev.active || prev.startMinute === null || prev.endMinute === null) {
                return INITIAL_DRAG;
            }
            if (isDragHandledRef.current) {
                return INITIAL_DRAG;
            }
            isDragHandledRef.current = true;

            const startMinute = Math.min(prev.startMinute, prev.endMinute);
            const endMinute = Math.max(prev.startMinute, prev.endMinute);
            if (startMinute === endMinute) {
                return INITIAL_DRAG;
            }
            onCreateEntry(dayIndex, {
                startMinute,
                endMinute,
                title: "New Entry",
            });
            return INITIAL_DRAG;
        });
    }, [dayIndex, onCreateEntry]);

    const handleMouseDown = useCallback((hour: number) => (event: ReactMouseEvent<HTMLDivElement>) => {
        if (moveState) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const minute = findMinuteOffset(y, rect, hour);
        beginDrag(minute);
    }, [beginDrag, findMinuteOffset, moveState]);

    const handleEntryDragStart = useCallback((entry: AssignedEntry, event: ReactMouseEvent<HTMLDivElement>) => {
        if (moveState) return;
        event.preventDefault();
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const pointerMinute = findMinuteOffset(y, rect);
        const pointerOffset = pointerMinute - entry.startMinute;

        onEntryDragStart({
            dayIndex,
            entryId: entry.id,
            pointerOffset,
            clientX: event.clientX,
            clientY: event.clientY,
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

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resolveHourElement = (target: EventTarget | null) => {
            if (!(target instanceof HTMLElement)) return null;
            return target.closest<HTMLElement>("[data-hour]");
        };

        const handleTouchStart = (event: TouchEvent) => {
            if (moveState) return;
            event.preventDefault();
            const hourElement = resolveHourElement(event.target);
            if (!hourElement) return;

            const hour = parseInt(hourElement.getAttribute("data-hour") ?? "0", 10);
            const rect = hourElement.getBoundingClientRect();
            const y = event.touches[0].clientY - rect.top;
            const minute = findMinuteOffset(y, rect, hour);
            beginDrag(minute);
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (moveState) return;
            event.preventDefault();
            const touch = event.touches[0];
            const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
            const hourElement = elements.find(el => el.hasAttribute("data-hour"));
            if (!hourElement) return;

            const hour = parseInt(hourElement.getAttribute("data-hour") ?? "0", 10);
            const rect = hourElement.getBoundingClientRect();
            const y = touch.clientY - rect.top;
            const minute = findMinuteOffset(y, rect, hour);
            setDrag(prev => {
                if (!prev.active || prev.endMinute === minute) return prev;
                return { ...prev, endMinute: minute };
            });
        };

        const handleTouchEnd = (event: TouchEvent) => {
            if (moveState) return;
            event.preventDefault();
            finishDrag();
        };

        container.addEventListener("touchstart", handleTouchStart, { passive: false });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });
        container.addEventListener("touchend", handleTouchEnd, { passive: false });
        container.addEventListener("touchcancel", handleTouchEnd, { passive: false });

        return () => {
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
            container.removeEventListener("touchend", handleTouchEnd);
            container.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [beginDrag, finishDrag, findMinuteOffset, moveState]);

    const visibleEntries = useMemo(() => {
        if (!moveState) return entries;
        if (moveState.fromDayIndex !== dayIndex) return entries;
        return entries.filter(entry => entry.id !== moveState.entry.id);
    }, [entries, moveState, dayIndex]);

    const layoutEntries = useMemo<AssignedEntry[]>(() => {
        const base = visibleEntries;
        if (moveState && moveState.currentDayIndex === dayIndex) {
            const previewEntry: TimeEntry = {
                ...moveState.entry,
                startMinute: moveState.startMinute,
                endMinute: moveState.endMinute,
            };
            return assignEntryLayout([...base, previewEntry]);
        }
        return assignEntryLayout(base);
    }, [visibleEntries, moveState, dayIndex]);

    const renderedEntries = useMemo((): Array<{ entry: AssignedEntry; isPreview: boolean }> => {
        const previewId = moveState && moveState.currentDayIndex === dayIndex ? moveState.entry.id : null;
        return layoutEntries.map(entry => ({
            entry,
            isPreview: previewId === entry.id,
        }));
    }, [layoutEntries, moveState, dayIndex]);

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
    };
}
