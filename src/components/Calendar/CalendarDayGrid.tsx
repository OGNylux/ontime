import { Box } from "@mui/material";
import { HOUR_ARRAY, HOURS_PER_DAY } from "./util/calendarUtility";

interface CalendarDayGridProps {
    hourHeight: number;
}

export default function CalendarDayGrid({ hourHeight }: CalendarDayGridProps) {
    return (
        <>
            {HOUR_ARRAY.map(hour => (
                <Box
                    key={hour}
                    data-hour={hour}
                    sx={{
                        height: hourHeight,
                        borderBottom: theme => hour === HOURS_PER_DAY - 1 ? "none" : `1px solid ${theme.palette.divider}`,
                        bgcolor: "background.paper",
                        transition: theme =>
                            theme.transitions.create("background-color", {
                                duration: theme.transitions.duration.shortest,
                            })
                    }}
                />
            ))}
        </>
    );
}
