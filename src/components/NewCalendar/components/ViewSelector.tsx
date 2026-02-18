/**
 * ViewSelector - dropdown to switch between Day / 5 Days / Week.
 */
import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import type { ViewMode } from "../types";

interface Props {
    viewMode: ViewMode;
    onChange: (m: ViewMode) => void;
}

export default function ViewSelector({ viewMode, onChange }: Props) {
    const handle = (e: SelectChangeEvent) => onChange(e.target.value as ViewMode);

    return (
        <FormControl size="small" sx={{ minWidth: 120, height: 40 }}>
            <Select value={viewMode} onChange={handle} inputProps={{ "aria-label": "View mode" }}
                MenuProps={{ PaperProps: { sx: { bgcolor: t => t.palette.background.default, backgroundImage: "none" } } }}
                sx={{
                    height: 40, color: "primary.main",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" },
                    "& .MuiSvgIcon-root": { color: "primary.main" },
                    "&:hover": { bgcolor: t => `${t.palette.primary.main}20`, "& .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" } },
                    "&.Mui-focused": { bgcolor: t => `${t.palette.primary.main}20` },
                }}>
                <MenuItem value="day">Day</MenuItem>
                <MenuItem value="work_week">5 Days</MenuItem>
                <MenuItem value="week">Week</MenuItem>
            </Select>
        </FormControl>
    );
}
