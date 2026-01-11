import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    List,
    ListItemButton,
    ListItemText,
    IconButton,
    Typography,
    useTheme,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';

interface DateRangeDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (startDate: Dayjs, endDate: Dayjs, label: string) => void;
    currentStartDate: Dayjs;
    currentEndDate: Dayjs;
}

type PresetOption = {
    label: string;
    getRange: () => [Dayjs, Dayjs];
};

const presetOptions: PresetOption[] = [
    {
        label: 'Today',
        getRange: () => [dayjs().startOf('day'), dayjs().endOf('day')],
    },
    {
        label: 'This Week',
        getRange: () => [dayjs().startOf('week'), dayjs().endOf('week')],
    },
    {
        label: 'This Month',
        getRange: () => [dayjs().startOf('month'), dayjs().endOf('month')],
    },
    {
        label: 'This Quarter',
        getRange: () => [dayjs().startOf('quarter'), dayjs().endOf('quarter')],
    },
    {
        label: 'This Year',
        getRange: () => [dayjs().startOf('year'), dayjs().endOf('year')],
    },
    {
        label: 'Last Week',
        getRange: () => [
            dayjs().subtract(1, 'week').startOf('week'),
            dayjs().subtract(1, 'week').endOf('week'),
        ],
    },
    {
        label: 'Last Month',
        getRange: () => [
            dayjs().subtract(1, 'month').startOf('month'),
            dayjs().subtract(1, 'month').endOf('month'),
        ],
    },
];

interface CalendarMonthProps {
    month: Dayjs;
    selectedStart: Dayjs | null;
    selectedEnd: Dayjs | null;
    onDateClick: (date: Dayjs) => void;
    hoveredDate: Dayjs | null;
    onDateHover: (date: Dayjs | null) => void;
}

function CalendarMonth({
    month,
    selectedStart,
    selectedEnd,
    onDateClick,
    hoveredDate,
    onDateHover,
}: CalendarMonthProps) {
    const theme = useTheme();
    const startOfMonth = month.startOf('month');
    const endOfMonth = month.endOf('month');
    const startDay = startOfMonth.startOf('week');
    const endDay = endOfMonth.endOf('week');

    const weeks: Dayjs[][] = [];
    let current = startDay;
    while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
        const week: Dayjs[] = [];
        for (let i = 0; i < 7; i++) {
            week.push(current);
            current = current.add(1, 'day');
        }
        weeks.push(week);
    }

    const isInRange = (date: Dayjs) => {
        if (!selectedStart) return false;
        const end = selectedEnd || hoveredDate;
        if (!end) return false;
        const start = selectedStart.isBefore(end) ? selectedStart : end;
        const rangeEnd = selectedStart.isBefore(end) ? end : selectedStart;
        return date.isAfter(start, 'day') && date.isBefore(rangeEnd, 'day');
    };

    const isRangeStart = (date: Dayjs) => {
        if (!selectedStart) return false;
        const end = selectedEnd || hoveredDate;
        if (!end) return false;
        const start = selectedStart.isBefore(end) ? selectedStart : end;
        return date.isSame(start, 'day');
    };

    const isRangeEnd = (date: Dayjs) => {
        if (!selectedStart) return false;
        const end = selectedEnd || hoveredDate;
        if (!end) return false;
        const rangeEnd = selectedStart.isBefore(end) ? end : selectedStart;
        return date.isSame(rangeEnd, 'day');
    };

    return (
        <Box>
            <Typography variant="subtitle2" fontWeight="bold" textAlign="center" mb={1}>
                {month.format('MMMM YYYY')}
            </Typography>
            <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <Typography
                        key={day}
                        variant="caption"
                        textAlign="center"
                        color="text.secondary"
                        fontWeight="bold"
                    >
                        {day}
                    </Typography>
                ))}
                {weeks.flat().map((date, idx) => {
                    const isCurrentMonth = date.month() === month.month();
                    const isSelected = isRangeStart(date) || isRangeEnd(date);
                    const inRange = isInRange(date);
                    const isToday = date.isSame(dayjs(), 'day');

                    return (
                        <Box
                            key={idx}
                            onClick={() => isCurrentMonth && onDateClick(date)}
                            onMouseEnter={() => onDateHover(date)}
                            onMouseLeave={() => onDateHover(null)}
                            sx={{
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: isSelected ? '50%' : inRange ? 0 : '50%',
                                backgroundColor: isSelected
                                    ? theme.palette.primary.main
                                    : inRange
                                    ? theme.palette.primary.light
                                    : 'transparent',
                                color: isSelected
                                    ? theme.palette.primary.contrastText
                                    : !isCurrentMonth
                                    ? theme.palette.text.disabled
                                    : theme.palette.text.primary,
                                cursor: isCurrentMonth ? 'pointer' : 'default',
                                border: isToday ? `2px solid ${theme.palette.primary.main}` : 'none',
                                '&:hover': isCurrentMonth
                                    ? {
                                          backgroundColor: isSelected
                                              ? theme.palette.primary.dark
                                              : theme.palette.action.hover,
                                      }
                                    : {},
                            }}
                        >
                            <Typography variant="body2">{date.date()}</Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

export default function DateRangeDialog({
    open,
    onClose,
    onSelect,
    currentStartDate,
    currentEndDate,
}: DateRangeDialogProps) {
    const [calendarMonth, setCalendarMonth] = useState(dayjs().startOf('month'));
    const [selectedStart, setSelectedStart] = useState<Dayjs | null>(currentStartDate);
    const [selectedEnd, setSelectedEnd] = useState<Dayjs | null>(currentEndDate);
    const [hoveredDate, setHoveredDate] = useState<Dayjs | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<string | null>('This Week');

    const handlePresetClick = (preset: PresetOption) => {
        const [start, end] = preset.getRange();
        setSelectedStart(start);
        setSelectedEnd(end);
        setSelectedPreset(preset.label);
    };

    const handleDateClick = (date: Dayjs) => {
        setSelectedPreset(null);
        if (!selectedStart || (selectedStart && selectedEnd)) {
            setSelectedStart(date);
            setSelectedEnd(null);
        } else {
            if (date.isBefore(selectedStart)) {
                setSelectedEnd(selectedStart);
                setSelectedStart(date);
            } else {
                setSelectedEnd(date);
            }
        }
    };

    const handleApply = () => {
        if (selectedStart && selectedEnd) {
            onSelect(selectedStart.startOf('day'), selectedEnd.endOf('day'), selectedPreset || 'Custom');
            onClose();
        }
    };

    const nextMonth = useMemo(() => calendarMonth.add(1, 'month'), [calendarMonth]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
            <DialogTitle>Select Date Range</DialogTitle>
            <DialogContent>
                <Box display="flex" gap={3}>
                    {/* Preset Options */}
                    <Box minWidth={150}>
                        <List dense>
                            {presetOptions.map((preset) => (
                                <ListItemButton
                                    key={preset.label}
                                    selected={selectedPreset === preset.label}
                                    onClick={() => handlePresetClick(preset)}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <ListItemText primary={preset.label} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Box>

                    {/* Calendar */}
                    <Box flex={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <IconButton onClick={() => setCalendarMonth((m) => m.subtract(1, 'month'))}>
                                <ChevronLeft />
                            </IconButton>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {selectedStart?.format('MMM D, YYYY') || 'Start'} -{' '}
                                {selectedEnd?.format('MMM D, YYYY') || 'End'}
                            </Typography>
                            <IconButton onClick={() => setCalendarMonth((m) => m.add(1, 'month'))}>
                                <ChevronRight />
                            </IconButton>
                        </Box>
                        <Box display="flex" gap={4} justifyContent="center">
                            <CalendarMonth
                                month={calendarMonth}
                                selectedStart={selectedStart}
                                selectedEnd={selectedEnd}
                                onDateClick={handleDateClick}
                                hoveredDate={hoveredDate}
                                onDateHover={setHoveredDate}
                            />
                            <CalendarMonth
                                month={nextMonth}
                                selectedStart={selectedStart}
                                selectedEnd={selectedEnd}
                                onDateClick={handleDateClick}
                                hoveredDate={hoveredDate}
                                onDateHover={setHoveredDate}
                            />
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleApply}
                    variant="contained"
                    disabled={!selectedStart || !selectedEnd}
                >
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    );
}
