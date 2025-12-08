import { Box } from "@mui/material";
import { HOUR_ARRAY, HOURS_PER_DAY } from "./util/calendarUtility";
import { MoveState } from "./util/calendarTypes";

interface CalendarDayGridProps {
    moveState: MoveState | null;
    onMouseDown: (hour: number) => (event: React.MouseEvent<HTMLDivElement>) => void;
}

export default function CalendarDayGrid({ moveState, onMouseDown }: CalendarDayGridProps) {
    return (
        <>
            {HOUR_ARRAY.map(hour => (
                <Box
                    key={hour}
                    data-hour={hour}
                    onMouseDown={onMouseDown(hour)}
                    sx={{
                        height: { xs: 40, md: 48 },
                        borderBottom: theme => hour === HOURS_PER_DAY - 1 ? "none" : `1px solid ${theme.palette.divider}`,
                        cursor: moveState ? "default" : "crosshair",
                        bgcolor: "background.paper",
                        transition: theme =>
                            theme.transitions.create("background-color", {
                                duration: theme.transitions.duration.shortest,
                            }),
                        "&:hover": {
                            bgcolor: moveState ? "background.paper" : "action.hover",
                        },
                    }}
                />
            ))}
        </>
    );
}
