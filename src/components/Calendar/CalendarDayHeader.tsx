import { Paper, Typography } from "@mui/material";
import { formatDuration } from "./util/calendarUtility";

interface CalendarDayHeaderProps {
    dayOfTheWeek: string;
    dayOfTheMonth: string;
    totalMinutes?: number;
}

export default function CalendarDayHeader({ dayOfTheWeek, dayOfTheMonth, totalMinutes }: CalendarDayHeaderProps) {
    return (
        <Paper
            elevation={0}
            square
            sx={{
                height: 64,
                position: "sticky",
                top: 0,
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                bgcolor: "grey.50",
                borderBottom: theme => `1px solid ${theme.palette.divider}`,
            }}
        >
            <Typography variant="subtitle2" noWrap>
                {dayOfTheWeek}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                {dayOfTheMonth}
            </Typography>
            {typeof totalMinutes === 'number' && (
                <Typography variant="caption" color="text.secondary">
                    {`Total: ${formatDuration(totalMinutes)}`}
                </Typography>
            )}
        </Paper>
    );
}
