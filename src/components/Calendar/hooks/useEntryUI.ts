import { useState, useCallback } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import { minutesToTime } from "../util/calendarUtility";

interface DialogState {
    open: boolean;
    dateStr: string;
    startTime: string;
    endTime: string;
    anchorPosition: { top: number; left: number } | null;
    editingEntry?: CalendarEntry | null;
}

const INITIAL_DIALOG_STATE: DialogState = {
    open: false,
    dateStr: "",
    startTime: "09:00",
    endTime: "10:00",
    anchorPosition: null,
    editingEntry: null,
};

interface ContextMenuState {
    mouseX: number;
    mouseY: number;
    entry: CalendarEntry;
}

export function useEntryUI() {
    const [dialogState, setDialogState] = useState<DialogState>(INITIAL_DIALOG_STATE);

    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const openCreateDialog = useCallback((
        dateStr: string,
        startMinute: number,
        endMinute: number,
        anchorPosition: { top: number; left: number }
    ) => {
        setDialogState({
            open: true,
            dateStr,
            startTime: minutesToTime(startMinute),
            endTime: minutesToTime(endMinute),
            anchorPosition,
            editingEntry: null,
        });
    }, []);

    const openEditDialog = useCallback((entry: CalendarEntry, position: { top: number; left: number } | null) => {
        const start = dayjs(entry.start_time);
        const end = dayjs(entry.end_time);

        setDialogState({
            open: true,
            dateStr: start.format("YYYY-MM-DD"),
            startTime: start.format("HH:mm"),
            endTime: end.format("HH:mm"),
            anchorPosition: position,
            editingEntry: entry,
        });
    }, []);

    const closeDialog = useCallback(() => {
        setDialogState(prev => ({ ...prev, open: false }));
    }, []);

    const openContextMenu = useCallback((entry: CalendarEntry, anchor: { top: number; left: number }) => {
        setContextMenu({ mouseX: anchor.left, mouseY: anchor.top, entry });
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const initiateDelete = useCallback((entryId: string) => {
        setDeleteTargetId(entryId);
        setConfirmDeleteOpen(true);
    }, []);

    const cancelDelete = useCallback(() => {
        setConfirmDeleteOpen(false);
        setDeleteTargetId(null);
    }, []);

    const confirmDelete = useCallback(() => {
        const id = deleteTargetId;
        setConfirmDeleteOpen(false);
        setContextMenu(null);
        setDeleteTargetId(null);
        return id;
    }, [deleteTargetId]);

    return {
        dialogState,
        openCreateDialog,
        openEditDialog,
        closeDialog,

        contextMenu,
        openContextMenu,
        closeContextMenu,

        confirmDeleteOpen,
        deleteTargetId,
        initiateDelete,
        cancelDelete,
        confirmDelete,
    };
}
