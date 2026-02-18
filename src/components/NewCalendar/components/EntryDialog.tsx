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
    SwipeableDrawer, Box, Typography, Autocomplete,
    IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText,
} from "@mui/material";
import { AttachMoney, ContentCopy, Delete, MoreVert } from "@mui/icons-material";
import { useState, useEffect, MouseEvent } from "react";
import ConfirmDialog from "../../Forms/ConfirmDialog";
import { Project } from "../../../services/projectService";
import { taskService, Task } from "../../../services/taskService";
import { useCalendar } from "../context";
import ProjectSelector from "./ProjectSelector";

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
    isEdit?: boolean;
    editingEntryId?: string | null;
}

export default function EntryDialog({
    open, onClose, anchorPosition,
    initialStartTime = "09:00", initialEndTime = "10:00", dateStr,
    initialTitle, initialIsBillable = true, initialProjectId = null,
    isEdit = false, editingEntryId,
}: Props) {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { actions } = useCalendar();

    const [title, setTitle] = useState(initialTitle || "");
    const [startTime, setStartTime] = useState(initialStartTime);
    const [endTime, setEndTime] = useState(initialEndTime);
    const [billable, setBillable] = useState(initialIsBillable ?? true);
    const [project, setProject] = useState<Project | null>(null);
    const [options, setOptions] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [taskId, setTaskId] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);

    // Reset on open
    useEffect(() => {
        if (open) {
            setStartTime(initialStartTime); setEndTime(initialEndTime);
            setTitle(initialTitle || ""); setBillable(initialIsBillable ?? true);
            setOptions([]); setTaskId(undefined);
            setProject(initialProjectId ? { id: initialProjectId } as Project : null);
        }
    }, [open, initialStartTime, initialEndTime, initialTitle, initialIsBillable, initialProjectId]);

    useEffect(() => {
        let active = true;
        const t = setTimeout(async () => {
            if (title.length < 3) { if (active) setOptions([]); return; }
            setLoading(true);
            try { 
                if (active) setOptions(await taskService.searchTasks(title)); 
            }
            catch { }
            finally { if (active) setLoading(false); }
        }, 300);
        return () => { active = false; clearTimeout(t); };
    }, [title]);

    //  Menu (edit mode actions) 
    const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleDuplicate = async () => {
        try {
            setSaving(true);
            await actions.create({ dateStr: dateStr ?? "", startTime, endTime, taskName: title, isBillable: billable, projectId: project?.id, taskId });
            onClose();
        } catch { /* */ } finally { setSaving(false); }
    };

    const handleDelete = () => { setMenuEl(null); setConfirmOpen(true); };
    const confirmDelete = async () => {
        if (!editingEntryId) return;
        try { 
            setSaving(true);
            await actions.remove(editingEntryId); onClose(); 
        } catch { } 
        finally { 
            setSaving(false); setConfirmOpen(false); 
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const data = { dateStr: dateStr ?? "", startTime, endTime, taskName: title, isBillable: billable, projectId: project?.id, taskId };
            if (isEdit && editingEntryId) await actions.update(editingEntryId, data);
            else await actions.create(data);
            onClose();
        } catch { } 
        finally { setSaving(false); }
    };

    //  Content 
    const content = (
        <Stack spacing={2} sx={{ p: 2, minWidth: 300 }}>
            {isEdit && (
                <Stack direction="row" spacing={1}>
                    <IconButton onClick={handleDuplicate} size="small"><ContentCopy /></IconButton>
                    <IconButton onClick={(e: MouseEvent<HTMLElement>) => setMenuEl(e.currentTarget)} size="small"><MoreVert /></IconButton>
                    <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
                        <MenuItem onClick={handleDelete}><ListItemIcon><Delete fontSize="small" /></ListItemIcon><ListItemText>Delete</ListItemText></MenuItem>
                    </Menu>
                </Stack>
            )}
            {!mobile && <Typography variant="h6">{isEdit ? "Edit Entry" : "Create New Entry"}</Typography>}

            <Autocomplete freeSolo options={options} loading={loading}
                getOptionLabel={o => (typeof o === "string" ? o : o.name)}
                renderInput={params => <TextField {...params} autoFocus label="Task" fullWidth size="small" />}
                inputValue={title}
                onInputChange={(_, v) => { setTitle(v); setTaskId(undefined); }}
                onChange={(_, v) => {
                    if (v && typeof v === "object") {
                        setTitle(v.name); setTaskId(v.id);
                        if (v.project_id) setProject({ id: v.project_id } as Project);
                    }
                }}
            />

            <Stack direction="row" spacing={1} alignItems="center">
                <ProjectSelector selectedProjectId={project?.id} onSelect={setProject} />
                <Tooltip title="Billable">
                    <IconButton color={billable ? "secondary" : "default"} onClick={() => setBillable(!billable)}>
                        <AttachMoney />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Stack direction="row" spacing={2}>
                <TextField label="Start" type="time" fullWidth value={startTime} onChange={e => setStartTime(e.target.value)} size="small"
                    slotProps={{ inputLabel: { shrink: true }, input: { sx: { '& input[type="time"]::-webkit-calendar-picker-indicator': { filter: t => t.palette.mode === "dark" ? "invert(0.5)" : "opacity(0.5)" } } } }} />
                <TextField label="End" type="time" fullWidth value={endTime} onChange={e => setEndTime(e.target.value)} size="small"
                    slotProps={{ inputLabel: { shrink: true }, input: { sx: { '& input[type="time"]::-webkit-calendar-picker-indicator': { filter: t => t.palette.mode === "dark" ? "invert(0.5)" : "opacity(0.5)" } } } }} />
            </Stack>

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
            <SwipeableDrawer anchor="bottom" open={open} onClose={onClose} onOpen={() => {}} disableSwipeToOpen
                PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, bgcolor: "background.default", backgroundImage: "none", pb: 6 } }}>
                <Box sx={{ width: 40, height: 4, bgcolor: "grey.300", borderRadius: 2, mx: "auto", mt: 2, mb: 1 }} />
                <Typography variant="h6" align="center" sx={{ mb: 1 }}>{isEdit ? "Edit Entry" : "Create New Entry"}</Typography>
                {content}
                <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Delete Entry" message="Are you sure you want to delete this entry?" confirmLabel="Delete" confirmColor="secondary" />
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
            <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Delete Entry" message="Are you sure you want to delete this entry?" confirmLabel="Delete" confirmColor="secondary" />
        </>
    );
}
