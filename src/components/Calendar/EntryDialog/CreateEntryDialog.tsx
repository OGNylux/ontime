import {
    Button,
    TextField,
    Stack,
    Popover,
    useMediaQuery,
    useTheme,
    SwipeableDrawer,
    Box,
    Typography,
    Autocomplete,
    IconButton,
    Tooltip,
    Menu,
    ListItemIcon,
    MenuItem,
    ListItemText,
} from "@mui/material";
import { AttachMoney, ContentCopy, Delete, MoreVert } from "@mui/icons-material";
import { useState, useEffect } from "react";
import ProjectSelector from "./ProjectSelector";
import ConfirmDialog from "../../Forms/ConfirmDialog";
import { Project } from "../../../services/projectService";
import { taskService, Task } from "../../../services/taskService";

interface CreateEntryDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: { startTime: string; endTime: string; taskName: string; isBillable: boolean; projectId?: string | null; taskId?: string }) => void;
    anchorPosition: { top: number; left: number } | null;
    initialStartTime?: string;
    initialEndTime?: string;
    dateStr?: string;
    initialTitle?: string;
    initialIsBillable?: boolean;
    isEdit?: boolean;
    editingEntryId?: string | null;
    onDelete?: (id: string) => void;
    onDuplicate?: (data: { startTime: string; endTime: string; taskName: string; isBillable: boolean; projectId?: string | null }) => void;
}

export default function CreateEntryDialog({
    open,
    onClose,
    onSave,
    anchorPosition,
    initialStartTime = "09:00",
    initialEndTime = "10:00",
    initialTitle,
    initialIsBillable = false,
    isEdit = false,
    editingEntryId,
    onDelete,
    onDuplicate,
}: CreateEntryDialogProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const [title, setTitle] = useState(initialTitle || "");
    const [startTime, setStartTime] = useState(initialStartTime);
    const [endTime, setEndTime] = useState(initialEndTime);
    const [isBillable, setIsBillable] = useState(initialIsBillable || false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [options, setOptions] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);

    // Reset form when dialog opens with new times
    useEffect(() => {
        if (open) {
            setStartTime(initialStartTime);
            setEndTime(initialEndTime);
            setTitle(initialTitle || "");
            setIsBillable(initialIsBillable || false);
            setOptions([]);
            setSelectedTaskId(undefined);
        }
    }, [open, initialStartTime, initialEndTime, initialTitle, initialIsBillable]);

    useEffect(() => {
        let active = true;
        const timer = setTimeout(async () => {
            if (title.length < 3) {
                if (active) setOptions([]);
                return;
            }

            setLoading(true);
            try {
                const tasks = await taskService.searchTasks(title);
                if (active) {
                    setOptions(tasks);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (active) setLoading(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [title]);

    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

    const handleMenuOpen = (e: any) => setMenuAnchorEl(e.currentTarget);
    const handleMenuClose = () => setMenuAnchorEl(null);

    const handleDuplicate = () => {
        onDuplicate && onDuplicate({ startTime, endTime, taskName: title, isBillable, projectId: selectedProject?.id });
    };

    const handleDelete = () => {
        if (!editingEntryId) return;
        // Open custom confirmation dialog
        handleMenuClose();
        setConfirmOpen(true);
    };

    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleConfirmCancel = () => {
        setConfirmOpen(false);
    };

    const handleConfirmDelete = () => {
        if (!editingEntryId) return;
        onDelete && onDelete(editingEntryId);
        setConfirmOpen(false);
    };

    const handleSave = () => {
        onSave({
            startTime,
            endTime,
            taskName: title,
            isBillable,
            projectId: selectedProject?.id,
            taskId: selectedTaskId,
        });
    };

    const content = (
        <Stack spacing={2} sx={{ p: 2, minWidth: 300 }}>
            {isEdit && (
                <Stack direction="row" spacing={1}>
                    <IconButton onClick={handleDuplicate} size="small">
                        <ContentCopy />
                    </IconButton>
                    <IconButton onClick={handleMenuOpen} size="small">
                        <MoreVert />
                    </IconButton>
                    <Menu
                        anchorEl={menuAnchorEl}
                        open={Boolean(menuAnchorEl)}
                        onClose={handleMenuClose}
                    >
                        <MenuItem onClick={handleDelete}>
                            <ListItemIcon>
                                <Delete fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Delete</ListItemText>
                        </MenuItem>
                    </Menu>
                </Stack>
            )}
            {!isMobile && <Typography variant="h6">{isEdit ? "Edit Entry" : "Create New Entry"}</Typography>}
            <Autocomplete
                freeSolo
                options={options}
                loading={loading}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        autoFocus
                        label="Task"
                        fullWidth
                        size="small"
                    />
                )}
                inputValue={title}
                onInputChange={(_, value) => {
                    setTitle(value);
                    // If user types, clear selected task ID unless it matches exactly (hard to know)
                    // Safer to clear it and let backend resolve by name/project
                    setSelectedTaskId(undefined);
                }}
                onChange={(_, value) => {
                    if (value && typeof value === 'object') {
                        setTitle(value.name);
                        setSelectedTaskId(value.id);
                        if (value.project_id) {
                            setSelectedProject({ id: value.project_id } as Project);
                        }
                    }
                }}
            />
            <Stack direction="row" spacing={1} alignItems="center">
                <ProjectSelector selectedProjectId={selectedProject?.id} onSelect={setSelectedProject} />

                <Tooltip title="Billable">
                    <IconButton
                        color={isBillable ? "success" : "default"}
                        onClick={() => setIsBillable(!isBillable)}
                    >
                        <AttachMoney />
                    </IconButton>
                </Tooltip>
            </Stack>
            
            <Stack direction="row" spacing={2}>
                <TextField
                    label="Start"
                    type="time"
                    fullWidth
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                />
                <TextField
                    label="End"
                    type="time"
                    fullWidth
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                />
            </Stack>
                <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button onClick={onClose} size="small">Cancel</Button>
                <Button onClick={handleSave} variant="contained" size="small">
                    {isEdit ? "Save" : "Create"}
                </Button>
            </Stack>
        </Stack>
    );

    if (isMobile) {
        return (
            <SwipeableDrawer
                anchor="bottom"
                open={open}
                onClose={onClose}
                onOpen={() => {}}
                disableSwipeToOpen
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                    }
                }}
            >
                <Box sx={{ 
                    width: 40, 
                    height: 4, 
                    bgcolor: 'grey.300', 
                    borderRadius: 2, 
                    mx: 'auto', 
                    mt: 2,
                    mb: 1 
                }} />
                <Typography variant="h6" align="center" sx={{ mb: 1 }}>
                    {isEdit ? "Edit Entry" : "Create New Entry"}
                </Typography>
                {content}
                <ConfirmDialog
                    open={confirmOpen}
                    onClose={handleConfirmCancel}
                    onConfirm={handleConfirmDelete}
                    title="Delete Entry"
                    message="Are you sure you want to delete this entry?"
                    confirmLabel="Delete"
                    confirmColor="error"
                />
            </SwipeableDrawer>
        );
    }

    return (
        <>
            <Popover
                open={open}
                onClose={onClose}
                anchorReference="anchorPosition"
                anchorPosition={anchorPosition ? anchorPosition : undefined}
                transformOrigin={{
                    vertical: 'center',
                    horizontal: 'left',
                }}
            >
                {content}
            </Popover>

            <ConfirmDialog
                open={confirmOpen}
                onClose={handleConfirmCancel}
                onConfirm={handleConfirmDelete}
                title="Delete Entry"
                message="Are you sure you want to delete this entry?"
                confirmLabel="Delete"
                confirmColor="error"
            />
        </>
    );
}
