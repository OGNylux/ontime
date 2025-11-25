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
} from "@mui/material";
import dayjs from "dayjs";

interface CreateEntryDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (title: string, startMinute: number, endMinute: number) => void;
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
    const [startTime, setStartTime] = useState(minutesToTime(initialStartMinute));
    const [endTime, setEndTime] = useState(minutesToTime(initialEndMinute));
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    useEffect(() => {
        if (open) {
            setTitle("");
            setStartTime(minutesToTime(initialStartMinute));
            setEndTime(minutesToTime(initialEndMinute));
        }
    }, [open, initialStartMinute, initialEndMinute]);

    const handleSave = () => {
        const start = timeToMinutes(startTime);
        const end = timeToMinutes(endTime);
        onSave(title || "New Entry", start, end);
    };

    const content = (
        <Stack spacing={2} sx={{ p: 2, minWidth: 300 }}>
            {!isMobile && <Typography variant="h6">Create New Entry</Typography>}
            <TextField
                autoFocus
                label="Title"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size="small"
            />
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
