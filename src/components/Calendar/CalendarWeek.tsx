import { Box, Container, Stack, useMediaQuery, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import CalendarDay from "./CalendarDay";
import CalendarTime from "./CalendarTime";
import { useCalendarWeekState } from "./useCalendarWeek";
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
    } = useCalendarWeekState();
    const theme = useTheme();
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));
    const containerRef = useRef<HTMLDivElement>(null);

    // Center the current time in the first scrollable ancestor only on initial load.
    //
    // Notes:
    // - We look up the nearest scrollable ancestor so the calendar can be
    //   embedded inside arbitrary containers. The scrollable ancestor is the
    //   element that will receive the scrollTop adjustments. When the page
    //   itself is the scroller we fall back to `document.scrollingElement`.
    const centerNow = (smooth = true) => {
        if (!containerRef.current) return;
        const root = containerRef.current;

        const findScrollableAncestor = (el: HTMLElement | null): HTMLElement | null => {
            let current: HTMLElement | null = el;
            while (current) {
                const style = window.getComputedStyle(current);
                const overflowY = style.overflowY;
                if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
                    return current;
                }
                current = current.parentElement;
            }
            return document.scrollingElement as HTMLElement | null;
        };

        const scrollable = findScrollableAncestor(root);
        if (!scrollable) return;

        const dayColumn = root.querySelector<HTMLElement>('[data-date]');
        if (!dayColumn) return;

        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();

        const hourElem = dayColumn.querySelector<HTMLElement>(`[data-hour="${hour}"]`) || dayColumn.querySelector<HTMLElement>('[data-hour]');
        if (!hourElem) return;

        const containerRect = scrollable.getBoundingClientRect();
        const hourRect = hourElem.getBoundingClientRect();

        const hourTop = hourRect.top - containerRect.top + scrollable.scrollTop;
        const hourHeight = hourRect.height || 1;
        const minuteOffset = (minutes / 60) * hourHeight;

        let targetScrollTop = hourTop + minuteOffset - scrollable.clientHeight / 2;
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, scrollable.scrollHeight - scrollable.clientHeight));

        scrollable.scrollTo({ top: targetScrollTop, behavior: smooth ? 'smooth' : 'auto' });
    };

    useEffect(() => {
        // Retry a couple times if layout isn't ready yet
        let rafId: number | null = null;
        let attempts = 0;
        const tryCenter = () => {
            rafId = requestAnimationFrame(() => {
                attempts += 1;
                centerNow(false);
                // Check if we need to retry (e.g. if scrollHeight is small)
                if (containerRef.current) {
                    // Simple check: just retry a few times to be safe
                    if (attempts < 3) {
                        setTimeout(tryCenter, 50);
                    }
                }
            });
        };

        tryCenter();

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [containerRef]);

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
                            onUpdateEntry={(entryId, start, end, title) => handleUpdateEntry(day.dateStr, entryId, start, end, title)}
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
