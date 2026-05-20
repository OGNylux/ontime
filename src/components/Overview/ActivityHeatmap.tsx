import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';

interface ActivityHeatmapProps {
    data: Record<string, number>; // date (YYYY-MM-DD) -> total minutes
}

const CELL = 20;
const GAP = 2;
const STEP = CELL + GAP;

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function level(minutes: number): 0 | 1 | 2 | 3 | 4 {
    if (minutes === 0) return 0;
    const h = minutes / 60;
    if (h < 1) return 1;
    if (h < 3) return 2;
    if (h < 6) return 3;
    return 4;
}

function levelColor(lvl: number, dark: boolean): string {
    if (lvl === 0) return dark ? '#525252' : '#F5F5F5';
    const palette = dark
        ? ['#0e4429', '#006d32', '#26a641', '#39d353']
        : ['#9be9a8', '#40c463', '#30a14e', '#216e39'];
    return palette[lvl - 1];
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';

    const today = dayjs();
    // Start from Monday of the week 51 weeks ago
    const startOfGrid = today.subtract(51, 'week').startOf('week').add(1, 'day'); // Monday

    // Build weeks: each week is an array of 7 days (Mon-Sun)
    const weeks: Array<Array<{ date: string; minutes: number } | null>> = [];
    let weekStart = startOfGrid;

    while (!weekStart.isAfter(today)) {
        const week: Array<{ date: string; minutes: number } | null> = [];
        for (let d = 0; d < 7; d++) {
            const day = weekStart.add(d, 'day');
            if (day.isAfter(today)) {
                week.push(null);
            } else {
                const key = day.format('YYYY-MM-DD');
                week.push({ date: key, minutes: data[key] ?? 0 });
            }
        }
        weeks.push(week);
        weekStart = weekStart.add(1, 'week');
    }

    // Month labels: label a week when its first non-null day is in the 1st-7th of the month
    const monthLabels = new Map<number, string>();
    weeks.forEach((week, wi) => {
        const first = week.find((d) => d !== null);
        if (!first) return;
        const d = dayjs(first.date);
        if (d.date() <= 7) monthLabels.set(wi, d.format('MMM'));
    });

    return (
        <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default">
            <Typography variant="h6" gutterBottom>
                Activity Distribution
            </Typography>

            <Box display="flex" gap="6px" overflow="auto">
                {/* Day-of-week labels */}
                <Box
                    display="flex"
                    flexDirection="column"
                    gap={`${GAP}px`}
                    pt="22px"
                    flexShrink={0}
                >
                    {DAY_LABELS.map((label, i) => (
                        <Box key={i} height={CELL} display="flex" alignItems="center">
                            <Typography
                                color="text.secondary"
                                sx={{ fontSize: 14, lineHeight: 1, width: 26, textAlign: 'right', userSelect: 'none' }}
                            >
                                {label}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <Box flexShrink={0}>
                    {/* Month labels */}
                    <Box display="flex" height="20px" mb="2px">
                        {weeks.map((_, wi) => (
                            <Box key={wi} width={STEP} flexShrink={0}>
                                {monthLabels.has(wi) && (
                                    <Typography
                                        color="text.secondary"
                                        sx={{ fontSize: 14, lineHeight: 1, userSelect: 'none' }}
                                    >
                                        {monthLabels.get(wi)}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                    </Box>

                    {/* Cell grid */}
                    <Box display="flex" gap={`${GAP}px`}>
                        {weeks.map((week, wi) => (
                            <Box key={wi} display="flex" flexDirection="column" gap={`${GAP}px`}>
                                {week.map((day, di) =>
                                    day === null ? (
                                        <Box key={di} width={CELL} height={CELL} />
                                    ) : (
                                        <Tooltip
                                            key={di}
                                            title={
                                                day.minutes > 0
                                                    ? `${dayjs(day.date).format('MMM D, YYYY')} — ${(day.minutes / 60).toFixed(1)}h`
                                                    : `${dayjs(day.date).format('MMM D, YYYY')} — no activity`
                                            }
                                            placement="top"
                                            arrow
                                        >
                                            <Box
                                                width={CELL}
                                                height={CELL}
                                                borderRadius="2px"
                                                bgcolor={levelColor(level(day.minutes), dark)}
                                                sx={{ cursor: 'default', flexShrink: 0 }}
                                            />
                                        </Tooltip>
                                    )
                                )}
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* Legend */}
            <Box display="flex" alignItems="center" gap="3px" mt={1.5} justifyContent="flex-end">
                <Typography color="text.secondary" sx={{ fontSize: 10, mr: '2px', userSelect: 'none' }}>
                    Less
                </Typography>
                {([0, 1, 2, 3, 4] as const).map((lvl) => (
                    <Box
                        key={lvl}
                        width={CELL}
                        height={CELL}
                        borderRadius="2px"
                        bgcolor={levelColor(lvl, dark)}
                    />
                ))}
                <Typography color="text.secondary" sx={{ fontSize: 10, ml: '2px', userSelect: 'none' }}>
                    More
                </Typography>
            </Box>
        </Box>
    );
}
