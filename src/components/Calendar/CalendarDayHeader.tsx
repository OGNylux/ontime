import { Box, Paper, Typography } from "@mui/material";
import { formatDuration } from "./util/calendarUtility";

interface CalendarDayHeaderProps {
    dayOfTheWeek: string;
    dayOfTheMonth: string;
    totalMinutes?: number;
}

export default function CalendarDayHeader({ dayOfTheWeek, dayOfTheMonth, totalMinutes = 0 }: CalendarDayHeaderProps) {
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
                alignItems: "flex-start",
                justifyContent: "center",
                gap: 0.5,
                bgcolor: "background.default",
                borderBottom: theme => `1px solid ${theme.palette.divider}`,
            }}
        >
            <Box display="flex" flexDirection="row" alignItems="center">
                <Box display="flex" flexDirection="row" alignItems="center" flexWrap="wrap">
                    <Typography
                        variant="subtitle2"
                        color="text.primary"
                        fontSize={{ xs: '1.4rem', sm: '1.6rem', md: '2rem' }}
                        lineHeight={1}
                        width={{ xs: '2.2rem', sm: '2.6rem', md: '3rem' }}
                        flexShrink={0}
                        textAlign="center"
                    >
                        {dayOfTheMonth}
                    </Typography>
                    <Box display="flex" flexDirection="column" alignItems="flex-start">
                        <Typography
                            variant="subtitle2"
                            noWrap
                            color="text.secondary"
                            fontSize={{ xs: '0.7rem', sm: '0.85rem' }}
                            lineHeight={1}
                            whiteSpace="nowrap"
                            overflow="hidden"
                            textOverflow="ellipsis"
                        >
                            {dayOfTheWeek}
                        </Typography>
                        <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            fontSize={{ xs: '0.7rem', sm: '0.85rem' }}
                            mt={-0.3}
                            lineHeight={1}
                        >
                            {`${formatDuration(totalMinutes)}`}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
}
