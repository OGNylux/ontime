import { Box } from "@mui/material";
import { MINUTES_PER_DAY } from "./util/calendarUtility";

interface CalendarDayGridProps {
    hourHeight: number;
    gapSize: number;
}

export default function CalendarDayGrid({ hourHeight, gapSize }: CalendarDayGridProps) {
    const timeSlots: number[] = [];
    for (let minute = 0; minute < MINUTES_PER_DAY; minute += gapSize) {
        timeSlots.push(minute);
    }

    return (
        <>
            {timeSlots.map((minute, index) => (
                <Box
                    key={minute}
                    data-minute={minute}
                    height={hourHeight}
                    borderBottom={t => index === timeSlots.length - 1 ? "none" : `1px solid ${t.palette.divider}`}
                    bgcolor="background.paper"
                    sx={{
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
