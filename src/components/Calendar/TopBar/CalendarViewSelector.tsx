import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { ViewMode } from "../util/calendarTypes";

interface CalendarViewSelectorProps {
    viewMode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export default function CalendarViewSelector({ viewMode, onChange }: CalendarViewSelectorProps) {
    const handleChange = (event: SelectChangeEvent) => {
        onChange(event.target.value as ViewMode);
    };

    return (
        <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
                value={viewMode}
                onChange={handleChange}
                displayEmpty
                inputProps={{ 'aria-label': 'View mode' }}
            >
                <MenuItem value="day">Day</MenuItem>
                <MenuItem value="work_week">5 Days</MenuItem>
                <MenuItem value="week">Week</MenuItem>
            </Select>
        </FormControl>
    );
}
