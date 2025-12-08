import { useState, useEffect, useCallback } from "react";
import { EntriesByDay, EntryAttributes, WeekDayInfo } from "../util/calendarTypes";
import { calendarService } from "../../../services/calendarService";
import { taskService } from "../../../services/taskService";
import { clampMinute } from "../util/calendarUtility";
import { addTimeEntryToMap, convertDtoToTimeEntry } from "../util/entryUtils";

export function useCalendarData(weekDays: WeekDayInfo[]) {
    const [entriesByDay, setEntriesByDay] = useState<EntriesByDay>({});

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
                    const timeEntry = convertDtoToTimeEntry(dbEntry);
                    // We need to pass the date from the DTO because TimeEntry doesn't have it
                    addTimeEntryToMap(newEntriesByDay, dbEntry.date, timeEntry);
                });
                
                setEntriesByDay(newEntriesByDay);
            } catch (error) {
                console.error("Failed to fetch entries", error);
            }
        };

        fetchWeekData();
    }, [weekDays]);

    const addEntry = useCallback(async (dateStr: string, attributes: EntryAttributes) => {
        const tempId = `temp-${Date.now()}`;
        
        // Optimistic update
        setEntriesByDay(prev => {
            const next = { ...prev };
            const task = attributes.task || (attributes.title ? { 
                id: 'temp-task', 
                name: attributes.title, 
                color: '#1976d2', 
                created_at: new Date().toISOString(), 
                created_by: 'temp',
                project_id: ''
            } : undefined);

            addTimeEntryToMap(next, dateStr, {
                id: tempId,
                ...attributes,
                task
            });
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
                project_id: attributes.projectId,
                is_billable: attributes.isBillable
            });

            setEntriesByDay(prev => {
                const next = { ...prev };
                
                // Remove temp entry from all days
                Object.keys(next).forEach(key => {
                    next[key] = next[key].filter(e => e.id !== tempId);
                });

                const timeEntry = convertDtoToTimeEntry(newEntry);
                addTimeEntryToMap(next, newEntry.date, timeEntry);
                
                return next;
            });
            return newEntry;
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
            return null;
        }
    }, []);

    const updateEntry = useCallback(async (dateStr: string, entryId: string, startMinute: number, endMinute: number, title?: string, projectId?: string, isBillable?: boolean) => {
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
                title: title !== undefined ? title : dayEntries[idx].title,
                task: title ? (dayEntries[idx].task ? { ...dayEntries[idx].task!, name: title } : undefined) : dayEntries[idx].task,
                projectId: projectId !== undefined ? projectId : dayEntries[idx].projectId,
                isBillable: isBillable !== undefined ? isBillable : dayEntries[idx].isBillable
            };
            dayEntries.splice(idx, 1, updated);
            dayEntries.sort((a, b) => a.startMinute - b.startMinute);
            next[dateStr] = dayEntries;
            return next;
        });

        try {
            const dayEntries = entriesByDay[dateStr] || [];
            const entryToUpdate = dayEntries.find(e => e.id === entryId);

            let taskId = entryToUpdate?.taskId;

            if (title && title.trim() !== "") {
                if (taskId) {
                    if (title !== entryToUpdate?.title) {
                        await taskService.updateTask({
                            id: taskId,
                            name: title
                        });
                    }
                } else {
                    const newTask = await taskService.createTask({
                        name: title,
                        project_id: projectId || entryToUpdate?.projectId
                    });
                    taskId = newTask.id;
                }
            }

            const updatedEntry = await calendarService.updateEntry(entryId, {
                date: dateStr,
                start_minute: clampMinute(startMinute),
                end_minute: clampMinute(endMinute),
                project_id: projectId,
                is_billable: isBillable,
                task_id: taskId
            });

            setEntriesByDay(prev => {
                const next = { ...prev };
                
                // Remove old entry from all days
                Object.keys(next).forEach(key => {
                    next[key] = next[key].filter(e => e.id !== entryId);
                });

                const timeEntry = convertDtoToTimeEntry(updatedEntry);
                // Override task name if we updated it locally but backend didn't return it yet (race condition safety)
                if (title) {
                    timeEntry.title = title;
                    if (timeEntry.task) timeEntry.task.name = title;
                }

                addTimeEntryToMap(next, updatedEntry.date, timeEntry);
                return next;
            });
        } catch (e) {
            console.error("Failed to update entry", e);
            setEntriesByDay(previousEntries);
        }
    }, [entriesByDay]);

    const deleteEntry = useCallback(async (_dateStr: string, entryId: string) => {
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
                const timeEntry = convertDtoToTimeEntry(newEntry);
                addTimeEntryToMap(next, dateStr, timeEntry);
                return next;
            });
        } catch (e) {
            console.error("Failed to duplicate entry", e);
        }
    }, [entriesByDay]);

    return {
        entriesByDay,
        setEntriesByDay,
        addEntry,
        updateEntry,
        deleteEntry,
        duplicateEntry
    };
}
