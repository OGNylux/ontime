import { FormControl, MenuItem, Select, SelectChangeEvent, OutlinedInput } from "@mui/material";

type ViewMode = "day" | "work_week" | "week";

interface CalendarViewSelectorProps {
    viewMode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export default function CalendarViewSelector({ viewMode, onChange }: CalendarViewSelectorProps) {
    const handleChange = (event: SelectChangeEvent) => {
        onChange(event.target.value as ViewMode);
    };

    return (
        <FormControl size="small" sx={{ minWidth: 120, height: 40 }}>
            <Select
                value={viewMode}
                onChange={handleChange}
                displayEmpty
                inputProps={{ 'aria-label': 'View mode' }}
                sx={{ 
                    height: 40,
                    color: 'primary.main',
                    '& .MuiOutlinedInput-notchedOutline': { 
                        borderColor: 'primary.main',
                    },
                    '& .MuiSvgIcon-root': { 
                        color: 'primary.main',
                    },
                    '&:hover': {
                        bgcolor: (theme) => `${theme.palette.primary.main}20`,
                        '& .MuiOutlinedInput-notchedOutline': { 
                            borderColor: 'primary.main',
                        },
                    },
                    '&.Mui-focused': {
                        bgcolor: (theme) => `${theme.palette.primary.main}20`,
                    },
                }}
            >
                <MenuItem value="day">Day</MenuItem>
                <MenuItem value="work_week">5 Days</MenuItem>
                <MenuItem value="week">Week</MenuItem>
            </Select>
        </FormControl>
    );
}
