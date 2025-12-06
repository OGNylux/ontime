import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { clamp, MINUTES_PER_DAY, snap, generateEntryId, clampMinute } from "./util/calendarUtility";
import type {
    EntryAttributes,
    EntryDragStartPayload,
    MoveState,
    TimeEntry,
} from "./util/calendarTypes";
import { calendarService } from "../../services/calendarService";

export interface WeekDayInfo {
    id: number;
    dateStr: string;
    dayOfTheMonth: string;
    dayOfTheWeek: string;
}

export type EntriesByDay = Record<string, TimeEntry[]>;
export type ViewMode = 'week' | 'work_week' | 'day';

// Find the nearest ancestor element under the pointer that is a day column
// (marked with `data-date`). We use `elementsFromPoint` so we can hit
// overlays and still discover the underlying day column.
const findDayElement = (clientX: number, clientY: number) => {
    if (typeof document === "undefined") return null;
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const element of elements) {
        const dayElement = element.closest<HTMLElement>("[data-date]");
        if (dayElement) return dayElement;
    }
    return null;
};

export function useCalendarWeekState() {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [viewMode, setViewMode] = useState<ViewMode>('week');

    const weekDays = useMemo(() => {
        if (viewMode === 'day') {
            return [{
                id: 0,
                dateStr: currentDate.format("YYYY-MM-DD"),
                dayOfTheMonth: currentDate.format("DD"),
                dayOfTheWeek: currentDate.format("ddd"),
            }];
        }

        // Ensure the calendar week starts on Monday.
        const start = currentDate.startOf("week").add(1, "day");
        const length = viewMode === 'work_week' ? 5 : 7;

        return Array.from({ length }).map((_, index) => {
            const day = start.add(index, "day");
            return {
                id: index,
                dateStr: day.format("YYYY-MM-DD"),
                dayOfTheMonth: day.format("DD"),
                dayOfTheWeek: day.format("ddd"),
            };
        });
    }, [currentDate, viewMode]);

    const [entriesByDay, setEntriesByDay] = useState<EntriesByDay>({});
    const [moveState, setMoveState] = useState<MoveState | null>(null);

    // Fetch entries from Supabase
    useEffect(() => {
        const fetchWeekData = async () => {
            if (weekDays.length === 0) return;
            const start = weekDays[0].dateStr;
            const end = weekDays[weekDays.length - 1].dateStr;

            try {
                const dbEntries = await calendarService.getEntries(start, end);
                
                const newEntriesByDay: EntriesByDay = {};
                dbEntries.forEach(dbEntry => {
                    if (!newEntriesByDay[dbEntry.date]) newEntriesByDay[dbEntry.date] = [];
                    newEntriesByDay[dbEntry.date].push({
                        id: dbEntry.id,
                        startMinute: dbEntry.start_minute,
                        endMinute: dbEntry.end_minute,
                        title: dbEntry.title,
                        color: dbEntry.color
                    });
                });
                
                // Sort entries for each day
                Object.keys(newEntriesByDay).forEach(key => {
                    newEntriesByDay[key].sort((a, b) => a.startMinute - b.startMinute);
                });

                setEntriesByDay(newEntriesByDay);
            } catch (error) {
                console.error("Failed to fetch entries", error);
            }
        };

        fetchWeekData();
    }, [weekDays]);

    const handleNext = useCallback(() => {
        if (viewMode === 'day') {
            setCurrentDate(d => d.add(1, "day"));
        } else {
            setCurrentDate(d => d.add(1, "week"));
        }
    }, [viewMode]);

    const handlePrev = useCallback(() => {
        if (viewMode === 'day') {
            setCurrentDate(d => d.subtract(1, "day"));
        } else {
            setCurrentDate(d => d.subtract(1, "week"));
        }
    }, [viewMode]);

    const goToToday = useCallback(() => setCurrentDate(dayjs()), []);

    // Add a new time entry to a day. If the entry crosses midnight we split it
    // across two days so each `TimeEntry` stays within a single day's minute range.
    const addEntry = useCallback(async (dateStr: string, attributes: EntryAttributes) => {
        // Optimistic update
        const tempId = generateEntryId();
        setEntriesByDay(prev => {
            const next: EntriesByDay = { ...prev };

            const pushEntry = (dStr: string, start: number, end: number) => {
                const nextEntries = next[dStr] ? [...next[dStr]] : [];
                nextEntries.push({
                    id: tempId, // Temporary ID
                    startMinute: start,
                    endMinute: end,
                    title: attributes.title,
                    color: attributes.color,
                });
                nextEntries.sort((a, b) => a.startMinute - b.startMinute);
                next[dStr] = nextEntries;
            };

            if (attributes.endMinute > MINUTES_PER_DAY) {
                pushEntry(dateStr, attributes.startMinute, MINUTES_PER_DAY);
                const nextDay = dayjs(dateStr).add(1, "day").format("YYYY-MM-DD");
                pushEntry(nextDay, 0, attributes.endMinute - MINUTES_PER_DAY);
            } else {
                pushEntry(dateStr, attributes.startMinute, attributes.endMinute);
            }
            return next;
        });

        try {
            if (attributes.endMinute > MINUTES_PER_DAY) {
                // Split entry across midnight
                await calendarService.createEntry({
                    date: dateStr,
                    start_minute: attributes.startMinute,
                    end_minute: MINUTES_PER_DAY,
                    title: attributes.title || "",
                    color: attributes.color
                });
                
                const nextDay = dayjs(dateStr).add(1, "day").format("YYYY-MM-DD");
                await calendarService.createEntry({
                    date: nextDay,
                    start_minute: 0,
                    end_minute: attributes.endMinute - MINUTES_PER_DAY,
                    title: attributes.title || "",
                    color: attributes.color
                });
            } else {
                await calendarService.createEntry({
                    date: dateStr,
                    start_minute: attributes.startMinute,
                    end_minute: attributes.endMinute,
                    title: attributes.title || "",
                    color: attributes.color
                });
            }
            // In a real app, we should replace the temp ID with the real one, 
            // but re-fetching or handling the ID update is complex without a global store or more sophisticated logic.
            // For now, we rely on the next fetch to correct IDs or just accept the temp ID until refresh.
            // Ideally, we would update the specific entry in state with the returned ID.
        } catch (e) {
            console.error("Failed to create entry", e);
            // Rollback logic would go here
        }
    }, []);

    // Update an existing entry's start/end minutes. Keeps the entry within
    // 0..MINUTES_PER_DAY and sorts entries after update.
    const updateEntry = useCallback(async (dateStr: string, entryId: string, startMinute: number, endMinute: number) => {
        setEntriesByDay(prev => {
            const next: EntriesByDay = { ...prev };
            const dayEntries = next[dateStr] ? [...next[dateStr]] : [];
            const idx = dayEntries.findIndex(e => e.id === entryId);
            if (idx === -1) return prev;
            const updated = { ...dayEntries[idx], startMinute: clampMinute(startMinute), endMinute: clampMinute(endMinute) };
            dayEntries.splice(idx, 1, updated);
            dayEntries.sort((a, b) => a.startMinute - b.startMinute);
            next[dateStr] = dayEntries;
            return next;
        });

        try {
            await calendarService.updateEntry(entryId, {
                start_minute: clampMinute(startMinute),
                end_minute: clampMinute(endMinute)
            });
        } catch (e) {
            console.error("Failed to update entry", e);
        }
    }, []);

    // Given a pointer position and an active MoveState, calculate the
    // target day index and the snapped start/end minutes for the moving entry.
    // This function s values to the day bounds and accounts for the
    // pointer offset inside the dragged entry.
    const calculateMovePosition = useCallback((clientX: number, clientY: number, state: MoveState) => {
        const dayElement = findDayElement(clientX, clientY);
        if (!dayElement) return null;

        const dateStr = dayElement.getAttribute("data-date");
        if (!dateStr) return null;

        const rect = dayElement.getBoundingClientRect();
        if (rect.height <= 0) return null;

        const offsetY = clamp(clientY - rect.top, 0, rect.height);
        const fractionOfDay = offsetY / rect.height;
        const minutesFromTop = fractionOfDay * MINUTES_PER_DAY;
        const pointerMinute = clampMinute(snap(minutesFromTop));

        let startMinute = pointerMinute - state.pointerOffset;
        startMinute = snap(startMinute);
        startMinute = clamp(startMinute, 0, MINUTES_PER_DAY - state.duration);
        const endMinute = startMinute + state.duration;
        return { targetDateStr: dateStr, startMinute, endMinute };
    }, []);

    // Commit a move operation: remove the moving entry from the source day
    // and insert it (with updated times) into the destination day. This
    // mutates a shallow copy of the `entriesByDay` state and sorts entries
    // by start time.
    const commitMove = useCallback(async (move: MoveState, target: { dateStr: string; startMinute: number; endMinute: number }) => {
        setEntriesByDay(prev => {
            const next: EntriesByDay = { ...prev };

            const sourceEntries = (next[move.fromDateStr] ?? []).filter(entry => entry.id !== move.entry.id);
            if (sourceEntries.length) {
                next[move.fromDateStr] = sourceEntries;
            } else {
                delete next[move.fromDateStr];
            }

            const updatedEntry: TimeEntry = {
                ...move.entry,
                startMinute: target.startMinute,
                endMinute: target.endMinute,
            };

            const destinationEntries = next[target.dateStr] ? [...next[target.dateStr]] : [];
            const filteredDestination = destinationEntries.filter(entry => entry.id !== move.entry.id);
            filteredDestination.push(updatedEntry);
            filteredDestination.sort((a, b) => a.startMinute - b.startMinute);
            next[target.dateStr] = filteredDestination;

            return next;
        });

        try {
            await calendarService.updateEntry(move.entry.id, {
                date: target.dateStr,
                start_minute: target.startMinute,
                end_minute: target.endMinute
            });
        } catch (e) {
            console.error("Failed to move entry", e);
        }
    }, []);

    // Start a move/drag operation for an existing entry. We capture the
    // entry, its original day, pointer offset and compute the initial
    // preview position using `calculateMovePosition` so drag previews appear
    // in the correct spot immediately.
    const beginMove = useCallback((payload: EntryDragStartPayload) => {
        setMoveState(prev => {
            if (prev) return prev;
            const dayEntries = entriesByDay[payload.dateStr] ?? [];
            const entry = dayEntries.find(item => item.id === payload.entryId);
            if (!entry) return prev;

            const baseState: MoveState = {
                entry,
                fromDateStr: payload.dateStr,
                pointerOffset: payload.pointerOffset,
                duration: entry.endMinute - entry.startMinute,
                currentDateStr: payload.dateStr,
                startMinute: entry.startMinute,
                endMinute: entry.endMinute,
            };

            if (typeof window === "undefined") return baseState;

            const nextPosition = calculateMovePosition(payload.clientX, payload.clientY, baseState);
            if (nextPosition) {
                return {
                    ...baseState,
                    currentDateStr: nextPosition.targetDateStr,
                    startMinute: nextPosition.startMinute,
                    endMinute: nextPosition.endMinute,
                };
            }

            return baseState;
        });
    }, [calculateMovePosition, entriesByDay]);

    // While a move operation is active we listen for pointer events at the
    // window level so the user can drag outside the day column. For touch we
    // throttle updates to animation frames and prevent the default scrolling
    // behavior so the calendar drag feels smooth. We also temporarily lock
    // body-level interactions (overflow / user-select) while dragging to
    // prevent accidental page scroll/selection.
    useEffect(() => {
        if (!moveState) return;

        const handleMouseMove = (event: globalThis.MouseEvent) => {
            setMoveState(prev => {
                if (!prev) return prev;
                const nextPosition = calculateMovePosition(event.clientX, event.clientY, prev);
                if (!nextPosition) return prev;
                if (
                    nextPosition.targetDateStr === prev.currentDateStr &&
                    nextPosition.startMinute === prev.startMinute
                ) return prev;

                return {
                    ...prev,
                    currentDateStr: nextPosition.targetDateStr,
                    startMinute: nextPosition.startMinute,
                    endMinute: nextPosition.endMinute,
                };
            });
        };

        const handleMouseUp = (event: globalThis.MouseEvent) => {
            setMoveState(prev => {
                if (!prev) return prev;
                const nextPosition = calculateMovePosition(event.clientX, event.clientY, prev);
                const targetDateStr = nextPosition?.targetDateStr ?? prev.currentDateStr;
                const startMinute = nextPosition?.startMinute ?? prev.startMinute;
                const endMinute = nextPosition?.endMinute ?? prev.endMinute;

                commitMove(prev, { dateStr: targetDateStr, startMinute, endMinute });
                return null;
            });
        };

        let animationFrameId: number | null = null;

        const handleTouchMove = (event: globalThis.TouchEvent) => {
            if (event.cancelable) event.preventDefault();
            const touch = event.touches[0];
            const clientX = touch.clientX;
            const clientY = touch.clientY;

            if (animationFrameId) return;

            animationFrameId = requestAnimationFrame(() => {
                setMoveState(prev => {
                    if (!prev) return prev;
                    const nextPosition = calculateMovePosition(clientX, clientY, prev);
                    if (!nextPosition) return prev;
                    if (
                        nextPosition.targetDateStr === prev.currentDateStr &&
                        nextPosition.startMinute === prev.startMinute
                    ) {
                        return prev;
                    }

                    return {
                        ...prev,
                        currentDateStr: nextPosition.targetDateStr,
                        startMinute: nextPosition.startMinute,
                        endMinute: nextPosition.endMinute,
                    };
                });
                animationFrameId = null;
            });
        };

        const handleTouchEnd = (event: globalThis.TouchEvent) => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            const touch = event.changedTouches[0];
            setMoveState(prev => {
                if (!prev) return prev;
                const nextPosition = calculateMovePosition(touch.clientX, touch.clientY, prev);
                const targetDateStr = nextPosition?.targetDateStr ?? prev.currentDateStr;
                const startMinute = nextPosition?.startMinute ?? prev.startMinute;
                const endMinute = nextPosition?.endMinute ?? prev.endMinute;

                commitMove(prev, { dateStr: targetDateStr, startMinute, endMinute });
                return null;
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", handleTouchEnd);
        window.addEventListener("touchcancel", handleTouchEnd);

        const originalOverflow = document.body.style.overflow;
        const originalTouchAction = document.body.style.touchAction;
        const originalUserSelect = document.body.style.userSelect;
        
        // Lock common document interactions while dragging to avoid accidental
        // scrolling/selection.
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
        document.body.style.userSelect = "none";
        // @ts-ignore
        document.body.style.webkitUserSelect = "none";

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchEnd);

            document.body.style.overflow = originalOverflow;
            document.body.style.touchAction = originalTouchAction;
            document.body.style.userSelect = originalUserSelect;
            // @ts-ignore
            document.body.style.webkitUserSelect = "";
            
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [moveState ? moveState.entry.id : null, calculateMovePosition, commitMove]);

    const deleteEntry = useCallback(async (dateStr: string, entryId: string) => {
        setEntriesByDay(prev => {
            const next = { ...prev };
            if (next[dateStr]) {
                next[dateStr] = next[dateStr].filter(e => e.id !== entryId);
            }
            return next;
        });

        try {
            await calendarService.deleteEntry(entryId);
        } catch (e) {
            console.error("Failed to delete entry", e);
        }
    }, []);

    const duplicateEntry = useCallback(async (dateStr: string, entryId: string) => {
        // We need to find the entry first to duplicate it
        let entryToDuplicate: TimeEntry | undefined;
        
        setEntriesByDay(prev => {
            const next = { ...prev };
            const dayEntries = next[dateStr] || [];
            const entry = dayEntries.find(e => e.id === entryId);
            if (!entry) return prev;

            entryToDuplicate = entry;

            const newEntry = {
                ...entry,
                id: generateEntryId(), // Temp ID
            };
            
            next[dateStr] = [...dayEntries, newEntry].sort((a, b) => a.startMinute - b.startMinute);
            return next;
        });

        if (entryToDuplicate) {
            try {
                await calendarService.createEntry({
                    date: dateStr,
                    start_minute: entryToDuplicate.startMinute,
                    end_minute: entryToDuplicate.endMinute,
                    title: entryToDuplicate.title || "",
                    color: entryToDuplicate.color
                });
            } catch (e) {
                console.error("Failed to duplicate entry", e);
            }
        }
    }, []);

    const updateEntryTitle = useCallback(async (dateStr: string, entryId: string, title: string) => {
        setEntriesByDay(prev => {
            const next = { ...prev };
            const dayEntries = next[dateStr] || [];
            const idx = dayEntries.findIndex(e => e.id === entryId);
            if (idx === -1) return prev;
            
            const updated = { ...dayEntries[idx], title };
            dayEntries[idx] = updated;
            next[dateStr] = [...dayEntries];
            return next;
        });

        try {
            await calendarService.updateEntry(entryId, { title });
        } catch (e) {
            console.error("Failed to update entry title", e);
        }
    }, []);

    return {
        weekDays,
        entriesByDay,
        moveState,
        handleCreateEntry: addEntry,
        handleEntryDragStart: beginMove,
        handleUpdateEntry: updateEntry,
        handleDeleteEntry: deleteEntry,
        handleDuplicateEntry: duplicateEntry,
        handleUpdateEntryTitle: updateEntryTitle,
        nextWeek: handleNext,
        prevWeek: handlePrev,
        goToToday,
        currentDate,
        viewMode,
        setViewMode,
    };
}
