import { useState, useEffect } from "react";
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
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip,
} from "@mui/material";
import { ContentCopy, MoreVert, Delete, AttachMoney } from "@mui/icons-material";
import { TimeEntry } from "../util/calendarTypes";
import { HOURS_PER_DAY, MINUTES_PER_HOUR, minutesToTime, timeToMinutes } from "../util/calendarUtility";
import ProjectSelector from "./ProjectSelector";

interface EditEntryDialogProps {
    open: boolean;
    entry: TimeEntry | null;
    onClose: () => void;
    onSave: (entryId: string, title: string, startMinute: number, endMinute: number, projectId?: string, isBillable?: boolean) => void;
    onDelete: (entryId: string) => void;
    onDuplicate: (entryId: string) => void;
    anchorPosition: { top: number; left: number } | null;
}

export default function EditEntryDialog({
    open,
    entry,
    onClose,
    onSave,
    onDelete,
    onDuplicate,
    anchorPosition,
}: EditEntryDialogProps) {
    const [title, setTitle] = useState("");
    const [startTime, setStartTime] = useState("00:00");
    const [endTime, setEndTime] = useState("00:00");
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
    const [isBillable, setIsBillable] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    useEffect(() => {
        if (open && entry) {
            setTitle(entry.task?.name || "");
            // use original start/end if available (for split entries)
            const start = entry.originalStartMinute !== undefined ? entry.originalStartMinute : entry.startMinute;
            const end = entry.originalEndMinute !== undefined ? entry.originalEndMinute : entry.endMinute;
            
            setStartTime(minutesToTime(start));
            setEndTime(minutesToTime(end));
            setIsBillable(entry.isBillable || false);
            setSelectedProjectId(entry.projectId);
        }
    }, [open, entry]);

    const handleSave = () => {
        if (!entry) return;
        const start = timeToMinutes(startTime);
        let end = timeToMinutes(endTime);

        if (end < start) end += HOURS_PER_DAY * MINUTES_PER_HOUR;

        onSave(entry.id, title, start, end, selectedProjectId, isBillable);
        onClose();
    };

    const handleDuplicate = () => {
        if (!entry) return;
        onDuplicate(entry.id);
        onClose();
    };

    const handleDelete = () => {
        if (!entry) return;
        onDelete(entry.id);
        onClose();
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const content = (
        <Stack spacing={2} sx={{ p: 2, minWidth: 300 }}>
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
            <TextField
                autoFocus
                label="Title"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size="small"
            />
            <Stack direction="row" spacing={1} alignItems="center">
                <ProjectSelector 
                    selectedProjectId={selectedProjectId} 
                    onSelect={(project) => setSelectedProjectId(project?.id)} 
                />

                <Tooltip title="Billable">
                    <IconButton
                        onClick={() => setIsBillable(!isBillable)}
                        color={isBillable ? "success" : "default"}
                    >
                        <AttachMoney />
                    </IconButton>
                </Tooltip>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
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
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        size="small"
                    >
                        Save
                    </Button>
                </Stack>
            </Stack>
        </Stack>
    );

    if (isMobile) {
        return (
            <SwipeableDrawer
                anchor="bottom"
                open={open}
                onClose={onClose}
                onOpen={() => { }}
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
                    Edit Entry
                </Typography>
                {content}
            </SwipeableDrawer>
        );
    }

    return (
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
    );
}
