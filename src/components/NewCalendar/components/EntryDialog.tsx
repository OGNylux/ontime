/**
 * EntryDialog - create or edit a calendar entry.
 *
 * Desktop -> Popover anchored near cursor.
 * Mobile  -> bottom SwipeableDrawer.
 *
 * Features: task autocomplete, project selector, billable toggle,
 * start/end time pickers, duplicate & delete (edit mode).
 */
import {
    Button, TextField, Stack, Popover, useMediaQuery, useTheme,
    SwipeableDrawer, Box, Typography,
    IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Alert,
} from "@mui/material";
import { AttachMoney, ContentCopy, Delete, MoreVert } from "@mui/icons-material";
import { useState, useEffect, MouseEvent } from "react";
import ConfirmDialog from "../../Forms/ConfirmDialog";
import { Project } from "../../../services/projectService";
import { useCalendar } from "../context";
import { EntryFormData } from "../hooks/useEntryActions";
import ProjectSelector from "./ProjectSelector";
import TaskAutocomplete from "./TaskAutocomplete";
import { useCalendarPreferences } from "../../../hooks/useCalendarPreferences";

interface Props {
    open: boolean;
    onClose: () => void;
    anchorPosition: { top: number; left: number } | null;
    initialStartTime?: string;
    initialEndTime?: string;
    dateStr?: string;
    initialTitle?: string;
    initialIsBillable?: boolean;
    initialProjectId?: string | null;
    initialProject?: Project | null;
    isEdit?: boolean;
    editingEntryId?: string | null;
    isLiveRecording?: boolean;
    onSaveOverride?: (data: EntryFormData & { project: Project | null }) => Promise<void>;
}

export default function EntryDialog({
    open, onClose, anchorPosition,
    initialStartTime = "09:00", initialEndTime = "10:00", dateStr,
    initialTitle, initialIsBillable = true, initialProjectId = null,
    isEdit = false, editingEntryId,
    isLiveRecording = false, onSaveOverride,
    initialProject,
}: Props) {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { actions } = useCalendar();
    const { prefs } = useCalendarPreferences();

    const [title, setTitle] = useState(initialTitle || "");
    const [startTime, setStartTime] = useState(initialStartTime);
    const [endTime, setEndTime] = useState(initialEndTime);
    const [billable, setBillable] = useState(initialIsBillable ?? true);
    const [project, setProject] = useState<Project | null>(null);
    const [taskId, setTaskId] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset on open
    useEffect(() => {
        if (open) {
            setStartTime(initialStartTime); setEndTime(initialEndTime);
            setTitle(initialTitle || ""); setBillable(initialIsBillable ?? true);
            setTaskId(undefined);
            setProject(initialProject ?? (initialProjectId ? { id: initialProjectId } as Project : null));
            setError(null);
        }
    }, [open, initialStartTime, initialEndTime, initialTitle, initialIsBillable, initialProjectId, initialProject]);

    //  Menu (edit mode actions)
    const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const errorMsg = (err: unknown, fallback: string) =>
        err instanceof Error ? err.message : fallback;

    const handleDuplicate = async () => {
        setError(null);
        setSaving(true);
        try {
            await actions.create({ dateStr: dateStr ?? "", startTime, endTime, taskName: title, isBillable: billable, projectId: project?.id, taskId });
            onClose();
        } catch (err) {
            console.error('Duplicate failed:', err);
            setError(errorMsg(err, 'Failed to duplicate entry'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => { setMenuEl(null); setConfirmOpen(true); };
    const confirmDelete = async () => {
        if (!editingEntryId) return;
        setError(null);
        setSaving(true);
        try {
            await actions.remove(editingEntryId);
            setConfirmOpen(false);
            onClose();
        } catch (err) {
            console.error('Delete failed:', err);
            setError(errorMsg(err, 'Failed to delete entry'));
            setConfirmOpen(false);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        setError(null);
        setSaving(true);
        try {
            const data = { dateStr: dateStr ?? "", startTime, endTime, taskName: title, isBillable: billable, projectId: project?.id, taskId, project };
            if (onSaveOverride) await onSaveOverride(data);
            else if (isEdit && editingEntryId) await actions.update(editingEntryId, data);
            else await actions.create(data);
            onClose();
        } catch (err) {
            console.error('Save entry failed:', err);
            setError(errorMsg(err, 'Failed to save entry'));
        } finally {
            setSaving(false);
        }
    };

    //  Content
    const content = (
        <Stack spacing={2} sx={{ p: 2, minWidth: 300 }}>
            {isEdit && !isLiveRecording && (
                <Stack direction="row" spacing={1}>
                    <IconButton onClick={handleDuplicate} size="small"><ContentCopy /></IconButton>
                    <IconButton onClick={(e: MouseEvent<HTMLElement>) => setMenuEl(e.currentTarget)} size="small"><MoreVert /></IconButton>
                    <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)} PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
                        <MenuItem onClick={handleDelete}><ListItemIcon><Delete fontSize="small" /></ListItemIcon><ListItemText>Delete</ListItemText></MenuItem>
                    </Menu>
                </Stack>
            )}
            {!mobile && <Typography variant="h6">{isLiveRecording ? "Edit Recording" : isEdit ? "Edit Entry" : "Create New Entry"}</Typography>}

            <TaskAutocomplete
                value={title}
                onValueChange={setTitle}
                onTaskClear={() => setTaskId(undefined)}
                onTaskSelect={(task) => {
                    setTaskId(task.id);
                    if (task.project_id) setProject({ id: task.project_id } as Project);
                }}
                autoFocus
                label="Task"
                size="small"
            />

            <Stack direction="row" spacing={1} alignItems="center">
                <ProjectSelector selectedProjectId={project?.id} onSelect={setProject} />
                <Tooltip title="Billable">
                    <IconButton color={billable ? "secondary" : "default"} onClick={() => setBillable(!billable)}>
                        <AttachMoney />
                    </IconButton>
                </Tooltip>
            </Stack>

            {isLiveRecording ? (
                <TextField
                    label="Start"
                    type="time"
                    fullWidth
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    size="small"
                    slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { lang: prefs.timeFormat === "12h" ? "en-US" : "en-GB", step: 60 },
                        input: { sx: { '& input[type="time"]::-webkit-calendar-picker-indicator': { filter: t => t.palette.mode === "dark" ? "invert(0.5)" : "opacity(0.5)" } } },
                    }}
                />
            ) : (
                <Stack direction="row" spacing={2}>
                    <TextField
                        label="Start"
                        type="time"
                        fullWidth
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        size="small"
                        slotProps={{
                            inputLabel: { shrink: true },
                            htmlInput: { lang: prefs.timeFormat === "12h" ? "en-US" : "en-GB", step: 60 },
                            input: { sx: { '& input[type="time"]::-webkit-calendar-picker-indicator': { filter: t => t.palette.mode === "dark" ? "invert(0.5)" : "opacity(0.5)" } } },
                        }}
                    />
                    <TextField
                        label="End"
                        type="time"
                        fullWidth
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        size="small"
                        slotProps={{
                            inputLabel: { shrink: true },
                            htmlInput: { lang: prefs.timeFormat === "12h" ? "en-US" : "en-GB", step: 60 },
                            input: { sx: { '& input[type="time"]::-webkit-calendar-picker-indicator': { filter: t => t.palette.mode === "dark" ? "invert(0.5)" : "opacity(0.5)" } } },
                        }}
                    />
                </Stack>
            )}

            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button onClick={onClose} size="small">Cancel</Button>
                <Button onClick={handleSave} variant="contained" size="small" disabled={saving}>
                    {saving ? "Saving..." : isEdit ? "Save" : "Create"}
                </Button>
            </Stack>
        </Stack>
    );

    if (mobile) {
        return (
            <SwipeableDrawer anchor="bottom" open={open} onClose={onClose} onOpen={() => { }} disableSwipeToOpen
                PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, bgcolor: "background.default", backgroundImage: "none", pb: 6 } }}>
                <Box sx={{ width: 40, height: 4, bgcolor: "grey.300", borderRadius: 2, mx: "auto", mt: 2, mb: 1 }} />
                <Typography variant="h6" align="center" sx={{ mb: 1 }}>{isEdit ? "Edit Entry" : "Create New Entry"}</Typography>
                {content}
                <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Delete Entry" message="Are you sure you want to delete this entry?" confirmLabel="Delete" confirmColor="error" />
            </SwipeableDrawer>
        );
    }

    return (
        <>
            <Popover open={open} onClose={onClose} anchorReference="anchorPosition"
                anchorPosition={anchorPosition ?? undefined}
                transformOrigin={{ vertical: "center", horizontal: "left" }}
                PaperProps={{ sx: { bgcolor: "background.default", backgroundImage: "none" } }}>
                {content}
            </Popover>
            <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Delete Entry" message="Are you sure you want to delete this entry?" confirmLabel="Delete" confirmColor="error" />
        </>
    );
}
