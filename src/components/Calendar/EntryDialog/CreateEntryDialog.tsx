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
    Autocomplete,
    IconButton,
    Tooltip,
} from "@mui/material";
import { AttachMoney } from "@mui/icons-material";
import dayjs from "dayjs";
import { Task, taskService } from "../../../services/taskService";
import ProjectSelector from "./ProjectSelector";
import { Project } from "../../../services/projectService";

interface CreateEntryDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (title: string, startMinute: number, endMinute: number, taskId?: string, task?: Task, projectId?: string, isBillable?: boolean) => void;
    initialStartMinute: number;
    initialEndMinute: number;
    anchorPosition: { top: number; left: number } | null;
}

function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return dayjs().hour(h).minute(m).format("HH:mm");
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

export default function CreateEntryDialog({
    open,
    onClose,
    onSave,
    initialStartMinute,
    initialEndMinute,
    anchorPosition,
}: CreateEntryDialogProps) {
    const [title, setTitle] = useState("");
    const [taskId, setTaskId] = useState<string | undefined>(undefined);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [options, setOptions] = useState<Task[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isBillable, setIsBillable] = useState(true);
    const [startTime, setStartTime] = useState(minutesToTime(initialStartMinute));
    const [endTime, setEndTime] = useState(minutesToTime(initialEndMinute));
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    useEffect(() => {
        if (open) {
            setTitle("");
            setTaskId(undefined);
            setOptions([]);
            setSelectedProject(null);
            setIsBillable(true);
            setStartTime(minutesToTime(initialStartMinute));
            setEndTime(minutesToTime(initialEndMinute));
        }
    }, [open, initialStartMinute, initialEndMinute]);

    useEffect(() => {
        if (title.length >= 3) {
            const delayDebounceFn = setTimeout(() => {
                taskService.searchTasks(title).then(setOptions).catch(console.error);
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setOptions([]);
        }
    }, [title]);

    const handleSave = () => {
        const start = timeToMinutes(startTime);
        let end = timeToMinutes(endTime);

        if (end < start) {
            end += 24 * 60;
        }

        onSave(title, start, end, taskId, selectedTask || undefined, selectedProject?.id, isBillable);
    };

    const content = (
        <Stack spacing={2} sx={{ p: 2, minWidth: 300 }}>
            {!isMobile && <Typography variant="h6">Create New Entry</Typography>}
            <Autocomplete
                freeSolo
                options={options}
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
                onInputChange={(_, newInputValue) => {
                    setTitle(newInputValue);
                }}
                onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                        setTitle(newValue);
                        setTaskId(undefined);
                        setSelectedTask(null);
                    } else if (newValue) {
                        setTitle(newValue.name);
                        setTaskId(newValue.id);
                        setSelectedTask(newValue);
                    } else {
                        setTitle("");
                        setTaskId(undefined);
                        setSelectedTask(null);
                    }
                }}
                inputValue={title}
            />
            <Stack direction="row" spacing={1} alignItems="center">
                <ProjectSelector 
                    selectedProjectId={selectedProject?.id} 
                    onSelect={setSelectedProject} 
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
                    Create
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
                    Create New Entry
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
