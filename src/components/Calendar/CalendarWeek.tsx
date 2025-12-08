import { Box, Container, Stack, useMediaQuery, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import CalendarDay from "./CalendarDay";
import CalendarTime from "./CalendarTime";
import { useCalendarWeekState } from "./useCalendarWeek";
import { useCalendarScroll } from "./useCalendarScroll";
import CalendarViewSelector from "./TopBar/CalendarViewSelector";
import CalendarNavigation from "./TopBar/CalendarNavigation";

export default function Calendar() {
    const {
        weekDays,
        entriesByDay,
        moveState,
        handleCreateEntry,
        handleEntryDragStart,
        handleUpdateEntry,
        handleDeleteEntry,
        handleDuplicateEntry,
        nextWeek,
        prevWeek,
        goToToday,
        currentDate,
        viewMode,
        setViewMode,
        isRecording,
        startRecording,
        stopRecording
    } = useCalendarWeekState();
    const theme = useTheme();
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));
    const containerRef = useRef<HTMLDivElement>(null);
    const { centerNow } = useCalendarScroll(containerRef);

    useEffect(() => {
        if (moveState) {
            // Lock scroll on all parent elements
            const scrollableParents: HTMLElement[] = [];
            let element = containerRef.current?.parentElement;
            while (element) {
                const overflow = window.getComputedStyle(element).overflow;
                if (overflow === 'auto' || overflow === 'scroll' || element === document.body) {
                    scrollableParents.push(element);
                    element.style.overflow = 'hidden';
                }
                element = element.parentElement;
            }
            return () => {
                scrollableParents.forEach(el => el.style.overflow = '');
            };
        }
    }, [moveState]);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" paddingY={2} paddingX={{ xs: 2, md: 3 }}>
                 <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h6" fontWeight="bold">
                        {currentDate.format("MMMM YYYY")}
                    </Typography>
                 </Stack>
                 <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarViewSelector viewMode={viewMode} onChange={setViewMode} />
                    <CalendarNavigation 
                        onPrev={prevWeek}
                        onNext={nextWeek}
                        onToday={() => {
                            goToToday();
                            // Wait for render to update to current week, then scroll
                            setTimeout(() => centerNow(true), 50);
                        }}
                        isRecording={isRecording}
                        onToggleRecording={isRecording ? stopRecording : startRecording}
                    />
                 </Stack>
            </Stack>

            <Container
                className="scrollbar-hide"
                ref={containerRef}
                disableGutters
                maxWidth={false}
                sx={{
                    flex: 1,
                    overflowX: "auto",
                    overflowY: "auto",
                    px: { xs: 1, md: 2 },
                    pb: { xs: 1, md: 2 },
                    WebkitOverflowScrolling: "touch",
                    ...(moveState && {
                        overflow: "hidden",
                        touchAction: "none",
                    }),
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
                            dateStr={day.dateStr}
                            dayOfTheMonth={day.dayOfTheMonth}
                            dayOfTheWeek={day.dayOfTheWeek}
                            entries={entriesByDay[day.dateStr] ?? []}
                            moveState={moveState}
                            onCreateEntry={handleCreateEntry}
                            onEntryDragStart={handleEntryDragStart}
                            onUpdateEntry={(entryId, start, end, title, projectId, isBillable) => handleUpdateEntry(day.dateStr, entryId, start, end, title, projectId, isBillable)}
                            onDeleteEntry={(entryId) => handleDeleteEntry(day.dateStr, entryId)}
                            onDuplicateEntry={(entryId) => handleDuplicateEntry(day.dateStr, entryId)}
                            isCompact={isCompact}
                            totalDays={weekDays.length}
                        />
                    ))}
                </Box>
            </Stack>
        </Container>
        </Box>
    );
}
