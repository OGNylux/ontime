import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { clamp, MINUTES_PER_DAY, snap, clampMinute } from "./util/calendarUtility";
import type {
    EntryAttributes,
    EntryDragStartPayload,
    MoveState,
    TimeEntry,
} from "./util/calendarTypes";
import { calendarService } from "../../services/calendarService";
import { taskService } from "../../services/taskService";

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
                    if (dbEntry.end_minute > MINUTES_PER_DAY) {
                        // Split entry across midnight
                        const firstPartEnd = MINUTES_PER_DAY;
                        const secondPartStart = 0;
                        const secondPartEnd = dbEntry.end_minute - MINUTES_PER_DAY;
                        const nextDay = dayjs(dbEntry.date).add(1, "day").format("YYYY-MM-DD");

                        if (!newEntriesByDay[dbEntry.date]) newEntriesByDay[dbEntry.date] = [];
                        newEntriesByDay[dbEntry.date].push({
                            id: dbEntry.id,
                            startMinute: dbEntry.start_minute,
                            endMinute: firstPartEnd,
                            title: dbEntry.task?.name,
                            taskId: dbEntry.task_id,
                            task: dbEntry.task,
                            originalStartMinute: dbEntry.start_minute,
                            originalEndMinute: dbEntry.end_minute
                        });

                        if (!newEntriesByDay[nextDay]) newEntriesByDay[nextDay] = [];
                        newEntriesByDay[nextDay].push({
                            id: dbEntry.id,
                            startMinute: secondPartStart,
                            endMinute: secondPartEnd,
                            title: dbEntry.task?.name,
                            taskId: dbEntry.task_id,
                            task: dbEntry.task,
                            originalStartMinute: dbEntry.start_minute,
                            originalEndMinute: dbEntry.end_minute
                        });
                    } else {
                        if (!newEntriesByDay[dbEntry.date]) newEntriesByDay[dbEntry.date] = [];
                        newEntriesByDay[dbEntry.date].push({
                            id: dbEntry.id,
                            startMinute: dbEntry.start_minute,
                            endMinute: dbEntry.end_minute,
                            title: dbEntry.task?.name,
                            taskId: dbEntry.task_id,
                            task: dbEntry.task,
                            originalStartMinute: dbEntry.start_minute,
                            originalEndMinute: dbEntry.end_minute
                        });
                    }
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
        const tempId = `temp-${Date.now()}`;
        
        // Optimistic update
        setEntriesByDay(prev => {
            const next = { ...prev };
            const task = attributes.task || (attributes.title ? { 
                id: 'temp-task', 
                name: attributes.title, 
                color: '#1976d2', // Default color
                created_at: new Date().toISOString(), 
                created_by: 'temp',
                project_id: ''
            } : undefined);

            if (attributes.endMinute > MINUTES_PER_DAY) {
                const firstPartEnd = MINUTES_PER_DAY;
                const secondPartStart = 0;
                const secondPartEnd = attributes.endMinute - MINUTES_PER_DAY;
                const nextDay = dayjs(dateStr).add(1, "day").format("YYYY-MM-DD");

                const dayEntries = next[dateStr] ? [...next[dateStr]] : [];
                dayEntries.push({
                    id: tempId,
                    startMinute: attributes.startMinute,
                    endMinute: firstPartEnd,
                    title: attributes.title,
                    taskId: attributes.taskId,
                    task: task,
                    originalStartMinute: attributes.startMinute,
                    originalEndMinute: attributes.endMinute
                });
                dayEntries.sort((a, b) => a.startMinute - b.startMinute);
                next[dateStr] = dayEntries;

                const nextDayEntries = next[nextDay] ? [...next[nextDay]] : [];
                nextDayEntries.push({
                    id: tempId,
                    startMinute: secondPartStart,
                    endMinute: secondPartEnd,
                    title: attributes.title,
                    taskId: attributes.taskId,
                    task: task,
                    originalStartMinute: attributes.startMinute,
                    originalEndMinute: attributes.endMinute
                });
                nextDayEntries.sort((a, b) => a.startMinute - b.startMinute);
                next[nextDay] = nextDayEntries;
            } else {
                const dayEntries = next[dateStr] ? [...next[dateStr]] : [];
                dayEntries.push({
                    id: tempId,
                    startMinute: attributes.startMinute,
                    endMinute: attributes.endMinute,
                    title: attributes.title,
                    taskId: attributes.taskId,
                    task: task,
                    originalStartMinute: attributes.startMinute,
                    originalEndMinute: attributes.endMinute
                });
                dayEntries.sort((a, b) => a.startMinute - b.startMinute);
                next[dateStr] = dayEntries;
            }
            return next;
        });

        try {
            let taskId = attributes.taskId;
            if (!taskId && attributes.title) {
                 const existingTask = await taskService.getTaskByName(attributes.title);
                 if (existingTask) {
                     taskId = existingTask.id;
                 } else {
                     const newTask = await taskService.createTask({ name: attributes.title });
                     taskId = newTask.id;
                 }
            }

            const newEntry = await calendarService.createEntry({
                date: dateStr,
                start_minute: attributes.startMinute,
                end_minute: attributes.endMinute,
                task_id: taskId,
            });

            setEntriesByDay(prev => {
                const next = { ...prev };
                
                // Remove temp entry from all days
                Object.keys(next).forEach(key => {
                    next[key] = next[key].filter(e => e.id !== tempId);
                });

                const entry = newEntry;
                
                if (entry.end_minute > MINUTES_PER_DAY) {
                    const firstPartEnd = MINUTES_PER_DAY;
                    const secondPartStart = 0;
                    const secondPartEnd = entry.end_minute - MINUTES_PER_DAY;
                    const nextDay = dayjs(entry.date).add(1, "day").format("YYYY-MM-DD");

                    if (!next[entry.date]) next[entry.date] = [];
                    next[entry.date].push({
                        id: entry.id,
                        startMinute: entry.start_minute,
                        endMinute: firstPartEnd,
                        title: entry.task?.name,
                        taskId: entry.task_id,
                        task: entry.task,
                        originalStartMinute: entry.start_minute,
                        originalEndMinute: entry.end_minute
                    });
                    next[entry.date].sort((a, b) => a.startMinute - b.startMinute);

                    if (!next[nextDay]) next[nextDay] = [];
                    next[nextDay].push({
                        id: entry.id,
                        startMinute: secondPartStart,
                        endMinute: secondPartEnd,
                        title: entry.task?.name,
                        taskId: entry.task_id,
                        task: entry.task,
                        originalStartMinute: entry.start_minute,
                        originalEndMinute: entry.end_minute
                    });
                    next[nextDay].sort((a, b) => a.startMinute - b.startMinute);
                } else {
                    const dStr = entry.date;
                    if (!next[dStr]) next[dStr] = [];
                    next[dStr].push({
                        id: entry.id,
                        startMinute: entry.start_minute,
                        endMinute: entry.end_minute,
                        title: entry.task?.name,
                        taskId: entry.task_id,
                        task: entry.task,
                        originalStartMinute: entry.start_minute,
                        originalEndMinute: entry.end_minute
                    });
                    next[dStr].sort((a, b) => a.startMinute - b.startMinute);
                }
                return next;
            });
        } catch (e) {
            console.error("Failed to create entry", e);
            // Revert optimistic update
            setEntriesByDay(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    next[key] = next[key].filter(e => e.id !== tempId);
                });
                return next;
            });
        }
    }, []);

    // Update an existing entry's start/end minutes. Keeps the entry within
    // 0..MINUTES_PER_DAY and sorts entries after update.
    const updateEntry = useCallback(async (dateStr: string, entryId: string, startMinute: number, endMinute: number, title?: string) => {
        // Optimistic update
        const previousEntries = { ...entriesByDay };
        
        setEntriesByDay(prev => {
            const next = { ...prev };
            const dayEntries = next[dateStr] ? [...next[dateStr]] : [];
            const idx = dayEntries.findIndex(e => e.id === entryId);
            if (idx === -1) return prev;
            
            const updated = { 
                ...dayEntries[idx], 
                startMinute: clampMinute(startMinute), 
                endMinute: clampMinute(endMinute),
                title: title || dayEntries[idx].title,
                task: title ? { ...dayEntries[idx].task!, name: title } : dayEntries[idx].task
            };
            dayEntries.splice(idx, 1, updated);
            dayEntries.sort((a, b) => a.startMinute - b.startMinute);
            next[dateStr] = dayEntries;
            return next;
        });

        try {
            // Find the entry to get the task ID
            const dayEntries = entriesByDay[dateStr] || [];
            const entryToUpdate = dayEntries.find(e => e.id === entryId);

            if (title && entryToUpdate?.taskId && title !== entryToUpdate.title) {
                await taskService.updateTask({
                    id: entryToUpdate.taskId,
                    name: title
                });
            }

            const updatedEntry = await calendarService.updateEntry(entryId, {
                date: dateStr,
                start_minute: clampMinute(startMinute),
                end_minute: clampMinute(endMinute)
            });

            setEntriesByDay(prev => {
                const next = { ...prev };
                
                // Remove old entry from all days
                Object.keys(next).forEach(key => {
                    next[key] = next[key].filter(e => e.id !== entryId);
                });

                const entry = updatedEntry;
                // If we updated the task name, we need to ensure the returned entry has the new name
                // The backend might return the old task name if the join happened before the task update propagated?
                // Or if we didn't refetch the task.
                // calendarService.updateEntry returns the entry with the task object.
                // If we updated the task separately, the join in updateEntry might return the new name or old name depending on timing/transaction.
                // To be safe, we can override the task name if we updated it.
                
                const taskName = title || entry.task?.name;
                const task = entry.task ? { ...entry.task, name: taskName! } : undefined;

                if (entry.end_minute > MINUTES_PER_DAY) {
                    const firstPartEnd = MINUTES_PER_DAY;
                    const secondPartStart = 0;
                    const secondPartEnd = entry.end_minute - MINUTES_PER_DAY;
                    const nextDay = dayjs(entry.date).add(1, "day").format("YYYY-MM-DD");

                    if (!next[entry.date]) next[entry.date] = [];
                    next[entry.date].push({
                        id: entry.id,
                        startMinute: entry.start_minute,
                        endMinute: firstPartEnd,
                        title: taskName,
                        taskId: entry.task_id,
                        task: task,
                        originalStartMinute: entry.start_minute,
                        originalEndMinute: entry.end_minute
                    });
                    next[entry.date].sort((a, b) => a.startMinute - b.startMinute);

                    if (!next[nextDay]) next[nextDay] = [];
                    next[nextDay].push({
                        id: entry.id,
                        startMinute: secondPartStart,
                        endMinute: secondPartEnd,
                        title: taskName,
                        taskId: entry.task_id,
                        task: task,
                        originalStartMinute: entry.start_minute,
                        originalEndMinute: entry.end_minute
                    });
                    next[nextDay].sort((a, b) => a.startMinute - b.startMinute);
                } else {
                    const dStr = entry.date;
                    if (!next[dStr]) next[dStr] = [];
                    next[dStr].push({
                        id: entry.id,
                        startMinute: entry.start_minute,
                        endMinute: entry.end_minute,
                        title: taskName,
                        taskId: entry.task_id,
                        task: task,
                        originalStartMinute: entry.start_minute,
                        originalEndMinute: entry.end_minute
                    });
                    next[dStr].sort((a, b) => a.startMinute - b.startMinute);
                }
                return next;
            });
        } catch (e) {
            console.error("Failed to update entry", e);
            setEntriesByDay(previousEntries);
        }
    }, [entriesByDay]);

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
        // Allow startMinute to go up to MINUTES_PER_DAY (crossing midnight)
        startMinute = clamp(startMinute, 0, MINUTES_PER_DAY);
        const endMinute = startMinute + state.duration;
        return { targetDateStr: dateStr, startMinute, endMinute };
    }, []);

    // Commit a move operation: remove the moving entry from the source day
    // and insert it (with updated times) into the destination day. This
    // mutates a shallow copy of the `entriesByDay` state and sorts entries
    // by start time.
    const commitMove = useCallback(async (move: MoveState, target: { dateStr: string; startMinute: number; endMinute: number }) => {
        // Normalize target date/time if startMinute is out of bounds (e.g. negative)
        let finalDateStr = target.dateStr;
        let finalStartMinute = target.startMinute;
        let finalEndMinute = target.endMinute;

        if (finalStartMinute < 0) {
            finalDateStr = dayjs(finalDateStr).subtract(1, 'day').format('YYYY-MM-DD');
            finalStartMinute += MINUTES_PER_DAY;
            finalEndMinute += MINUTES_PER_DAY;
        } else if (finalStartMinute >= MINUTES_PER_DAY) {
            finalDateStr = dayjs(finalDateStr).add(1, 'day').format('YYYY-MM-DD');
            finalStartMinute -= MINUTES_PER_DAY;
            finalEndMinute -= MINUTES_PER_DAY;
        }

        // Optimistic update
        const previousEntries = { ...entriesByDay };
        
        setEntriesByDay(prev => {
            const next = { ...prev };

            // Remove old entry from ALL days (since it might have been split)
            Object.keys(next).forEach(key => {
                next[key] = next[key].filter(e => e.id !== move.entry.id);
            });

            const updatedEntry: TimeEntry = {
                ...move.entry,
                startMinute: finalStartMinute,
                endMinute: finalEndMinute,
            };

            // Add to destination (handling split if needed)
            if (updatedEntry.endMinute > MINUTES_PER_DAY) {
                const firstPartEnd = MINUTES_PER_DAY;
                const secondPartStart = 0;
                const secondPartEnd = updatedEntry.endMinute - MINUTES_PER_DAY;
                const nextDay = dayjs(finalDateStr).add(1, "day").format("YYYY-MM-DD");

                if (!next[finalDateStr]) next[finalDateStr] = [];
                next[finalDateStr].push({
                    ...updatedEntry,
                    endMinute: firstPartEnd
                });
                next[finalDateStr].sort((a, b) => a.startMinute - b.startMinute);

                if (!next[nextDay]) next[nextDay] = [];
                next[nextDay].push({
                    ...updatedEntry,
                    startMinute: secondPartStart,
                    endMinute: secondPartEnd
                });
                next[nextDay].sort((a, b) => a.startMinute - b.startMinute);
            } else {
                if (!next[finalDateStr]) next[finalDateStr] = [];
                next[finalDateStr].push(updatedEntry);
                next[finalDateStr].sort((a, b) => a.startMinute - b.startMinute);
            }

            return next;
        });

        try {
            const updatedEntry = await calendarService.updateEntry(move.entry.id, {
                date: finalDateStr,
                start_minute: finalStartMinute,
                end_minute: finalEndMinute
            });

            setEntriesByDay(prev => {
                const next = { ...prev };
                
                // Remove old entry from all days
                Object.keys(next).forEach(key => {
                    next[key] = next[key].filter(e => e.id !== move.entry.id);
                });

                const entry = updatedEntry;
                if (entry.end_minute > MINUTES_PER_DAY) {
                    const firstPartEnd = MINUTES_PER_DAY;
                    const secondPartStart = 0;
                    const secondPartEnd = entry.end_minute - MINUTES_PER_DAY;
                    const nextDay = dayjs(entry.date).add(1, "day").format("YYYY-MM-DD");

                    if (!next[entry.date]) next[entry.date] = [];
                    next[entry.date].push({
                        id: entry.id,
                        startMinute: entry.start_minute,
                        endMinute: firstPartEnd,
                        title: entry.task?.name,
                        taskId: entry.task_id,
                        task: entry.task,
                        originalStartMinute: entry.start_minute,
                        originalEndMinute: entry.end_minute
                    });
                    next[entry.date].sort((a, b) => a.startMinute - b.startMinute);

                    if (!next[nextDay]) next[nextDay] = [];
                    next[nextDay].push({
                        id: entry.id,
                        startMinute: secondPartStart,
                        endMinute: secondPartEnd,
                        title: entry.task?.name,
                        taskId: entry.task_id,
                        task: entry.task,
                        originalStartMinute: entry.start_minute,
                        originalEndMinute: entry.end_minute
                    });
                    next[nextDay].sort((a, b) => a.startMinute - b.startMinute);
                } else {
                    const dStr = entry.date;
                    if (!next[dStr]) next[dStr] = [];
                    next[dStr].push({
                        id: entry.id,
                        startMinute: entry.start_minute,
                        endMinute: entry.end_minute,
                        title: entry.task?.name,
                        taskId: entry.task_id,
                        task: entry.task,
                        originalStartMinute: entry.start_minute,
                        originalEndMinute: entry.end_minute
                    });
                    next[dStr].sort((a, b) => a.startMinute - b.startMinute);
                }
                return next;
            });
        } catch (e) {
            console.error("Failed to move entry", e);
            setEntriesByDay(previousEntries);
        }
    }, [entriesByDay]);

    // Start a move/drag operation for an existing entry. We capture the
    // entry, its original day, pointer offset and compute the initial
    // preview position using `calculateMovePosition` so drag previews appear
    // in the correct spot immediately.
    const beginMove = useCallback((payload: EntryDragStartPayload) => {
        setMoveState(prev => {
            if (prev) return prev;
            
            // Find all parts of this entry across all days to calculate total duration
            const allParts: { date: string, entry: TimeEntry }[] = [];
            Object.entries(entriesByDay).forEach(([date, dayEntries]) => {
                const found = dayEntries.find(e => e.id === payload.entryId);
                if (found) {
                    allParts.push({ date, entry: found });
                }
            });

            if (allParts.length === 0) return prev;

            // Sort by date/time to find true start/end
            allParts.sort((a, b) => {
                if (a.date !== b.date) return dayjs(a.date).diff(dayjs(b.date));
                return a.entry.startMinute - b.entry.startMinute;
            });

            const clickedEntry = allParts.find(p => p.date === payload.dateStr && p.entry.id === payload.entryId)?.entry;
            if (!clickedEntry) return prev;

            let totalDuration = 0;
            let addedOffset = 0;
            
            for (const part of allParts) {
                const partDuration = part.entry.endMinute - part.entry.startMinute;
                totalDuration += partDuration;
                
                // If this part is strictly before the clicked entry, add its duration to the pointer offset
                const isBefore = 
                    dayjs(part.date).isBefore(dayjs(payload.dateStr)) || 
                    (part.date === payload.dateStr && part.entry.startMinute < clickedEntry.startMinute);
                
                if (isBefore) {
                    addedOffset += partDuration;
                }
            }

            const effectivePointerOffset = payload.pointerOffset + addedOffset;

            const baseState: MoveState = {
                entry: clickedEntry,
                fromDateStr: payload.dateStr,
                pointerOffset: effectivePointerOffset,
                duration: totalDuration,
                currentDateStr: payload.dateStr,
                startMinute: clickedEntry.startMinute - addedOffset,
                endMinute: clickedEntry.startMinute - addedOffset + totalDuration,
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

    const deleteEntry = useCallback(async (_dateStr: string, entryId: string) => {
        // Optimistic update
        const previousEntries = { ...entriesByDay };
        
        setEntriesByDay(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                next[key] = next[key].filter(e => e.id !== entryId);
            });
            return next;
        });

        try {
            await calendarService.deleteEntry(entryId);
        } catch (e) {
            console.error("Failed to delete entry", e);
            setEntriesByDay(previousEntries);
        }
    }, [entriesByDay]);

    const duplicateEntry = useCallback(async (dateStr: string, entryId: string) => {
        const dayEntries = entriesByDay[dateStr] || [];
        const entryToDuplicate = dayEntries.find(e => e.id === entryId);
        
        if (!entryToDuplicate) return;

        try {
            let taskId = entryToDuplicate.taskId;
            if (!taskId && entryToDuplicate.title) {
                 const existingTask = await taskService.getTaskByName(entryToDuplicate.title);
                 if (existingTask) {
                     taskId = existingTask.id;
                 } else {
                     const newTask = await taskService.createTask({ name: entryToDuplicate.title });
                     taskId = newTask.id;
                 }
            }

            const newEntry = await calendarService.createEntry({
                date: dateStr,
                start_minute: entryToDuplicate.startMinute,
                end_minute: entryToDuplicate.endMinute,
                task_id: taskId
            });

            setEntriesByDay(prev => {
                const next = { ...prev };
                if (!next[dateStr]) next[dateStr] = [];
                
                next[dateStr].push({
                    id: newEntry.id,
                    startMinute: newEntry.start_minute,
                    endMinute: newEntry.end_minute,
                    title: newEntry.task?.name,
                    taskId: newEntry.task_id,
                    task: newEntry.task
                });
                next[dateStr].sort((a, b) => a.startMinute - b.startMinute);
                return next;
            });
        } catch (e) {
            console.error("Failed to duplicate entry", e);
        }
    }, [entriesByDay]);

    const updateEntryTitle = useCallback(async (_dateStr: string, _entryId: string, _title: string) => {
        // This function might be obsolete if title is not editable directly on entry
        // Or it should update the underlying task name?
        // For now, removing the service call or updating task if needed.
        // Assuming we don't update task name from calendar view directly for now.
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
