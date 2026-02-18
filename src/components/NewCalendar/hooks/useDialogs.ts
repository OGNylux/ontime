/**
 * useDialogs - manages dialog / context-menu / delete-confirmation state.
 *
 * Pure UI state - no network calls.
 */
import { useState, useCallback } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import { minutesToTime } from "../layout/timeUtils";
import type { DialogState, ContextMenuState } from "../types";

const INITIAL: DialogState = {
    open: false,
    dateStr: "",
    startTime: "09:00",
    endTime: "10:00",
    anchorPosition: null,
    editingEntry: null,
};

export function useDialogs() {
    const [dialog, setDialog] = useState<DialogState>(INITIAL);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    //  Create dialog 
    const openCreate = useCallback((
        dateStr: string,
        startMinute: number,
        endMinute: number,
        anchor: { top: number; left: number },
    ) => {
        setDialog({
            open: true,
            dateStr,
            startTime: minutesToTime(startMinute),
            endTime: minutesToTime(endMinute),
            anchorPosition: anchor,
            editingEntry: null,
        });
    }, []);

    //  Edit dialog 
    const openEdit = useCallback((entry: CalendarEntry, pos: { top: number; left: number } | null) => {
        const s = dayjs(entry.start_time);
        const e = dayjs(entry.end_time);
        setDialog({
            open: true,
            dateStr: s.format("YYYY-MM-DD"),
            startTime: s.format("HH:mm"),
            endTime: e.format("HH:mm"),
            anchorPosition: pos,
            editingEntry: entry,
        });
    }, []);

    const closeDialog = useCallback(() => setDialog(p => ({ ...p, open: false })), []);

    //  Context menu 
    const openMenu = useCallback((entry: CalendarEntry, anchor: { top: number; left: number }) => {
        setContextMenu({ mouseX: anchor.left, mouseY: anchor.top, entry });
    }, []);

    const closeMenu = useCallback(() => setContextMenu(null), []);

    //  Delete confirmation 
    const initiateDelete = useCallback((id: string) => {
        setDeleteTargetId(id);
        setConfirmOpen(true);
    }, []);

    const cancelDelete = useCallback(() => {
        setConfirmOpen(false);
        setDeleteTargetId(null);
    }, []);

    /** Returns the entry id that should be deleted. */
    const confirmDelete = useCallback((): string | null => {
        const id = deleteTargetId;
        setConfirmOpen(false);
        setContextMenu(null);
        setDeleteTargetId(null);
        return id;
    }, [deleteTargetId]);

    return {
        dialog, openCreate, openEdit, closeDialog,
        contextMenu, openMenu, closeMenu,
        confirmOpen, deleteTargetId, initiateDelete, cancelDelete, confirmDelete,
    };
}
