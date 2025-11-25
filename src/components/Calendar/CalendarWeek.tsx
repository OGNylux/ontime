import { Box, Container, Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CalendarDay from "./CalendarDay";
import CalendarTime from "./CalendarTime";
import { useCalendarWeekState } from "./useCalendarWeek";

export default function Calendar() {
    const {
        weekDays,
        entriesByDay,
        moveState,
        handleCreateEntry,
        handleEntryDragStart,
    } = useCalendarWeekState();
    const theme = useTheme();
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));

    return (
        <Container
            disableGutters
            maxWidth={false}
            sx={{
                height: "100%",
                bgcolor: "background.default",
                overflowX: "auto",
                overflowY: "hidden",
                px: { xs: 1, md: 2 },
                py: { xs: 1, md: 2 },
                WebkitOverflowScrolling: "touch",
            }}
        >
            <Stack direction="row" sx={{ minHeight: "100%" }}>
                <CalendarTime isCompact={isCompact} />
                <Box
                    sx={{
                        display: "flex",
                        flex: 1,
                        minWidth: 0,
                        overflow: "visible",
                        pb: { xs: 1, md: 0 },
                    }}
                >
                    {weekDays.map(day => (
                        <CalendarDay
                            key={day.id}
                            dayIndex={day.id}
                            dayOfTheMonth={day.dayOfTheMonth}
                            dayOfTheWeek={day.dayOfTheWeek}
                            entries={entriesByDay[day.id] ?? []}
                            moveState={moveState}
                            onCreateEntry={handleCreateEntry}
                            onEntryDragStart={handleEntryDragStart}
                            isCompact={isCompact}
                            totalDays={weekDays.length}
                        />
                    ))}
                </Box>
            </Stack>
        </Container>
    );
}
