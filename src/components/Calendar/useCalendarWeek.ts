import { useCallback } from "react";
import { useCalendarNavigation } from "./hooks/useCalendarNavigation";
import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarDrag } from "./hooks/useCalendarDrag";
import { useCalendarRecorder } from "./hooks/useCalendarRecorder";

export function useCalendarWeekState() {
    const {
        currentDate,
        viewMode,
        setViewMode,
        weekDays,
        handleNext,
        handlePrev,
        goToToday
    } = useCalendarNavigation();

    const {
        entriesByDay,
        addEntry,
        updateEntry,
        deleteEntry,
        duplicateEntry
    } = useCalendarData(weekDays);

    const handleMoveCommit = useCallback(async (dateStr: string, entryId: string, startMinute: number, endMinute: number) => {
        await updateEntry(dateStr, entryId, startMinute, endMinute);
    }, [updateEntry]);

    const {
        moveState,
        beginMove
    } = useCalendarDrag(entriesByDay, handleMoveCommit);

    const {
        isRecording,
        startRecording,
        stopRecording
    } = useCalendarRecorder(addEntry, updateEntry);

    const updateEntryTitle = useCallback(async (_dateStr: string, _entryId: string, _title: string) => {
        // This function might be obsolete if title is not editable directly on entry
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
        isRecording,
        startRecording,
        stopRecording
    };
}
