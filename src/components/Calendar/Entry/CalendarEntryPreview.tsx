import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import { formatDuration } from "../util/calendarUtility";

interface Props {
    title: string;
    startIso?: string;
    endIso?: string;
    top: number;
    height: number;
    left?: number | string;
    right?: number | string;
    zIndex?: number;
}

export default function CalendarEntryPreview({ title, startIso, endIso, top, height, left = 4, right = 4, zIndex = 10 }: Props) {
    let timeDisplay = "";
    try {
        if (startIso && endIso) {
            const s = dayjs(startIso);
            const e = dayjs(endIso);
            const mins = Math.max(0, e.diff(s, 'minute'));
            timeDisplay = formatDuration(mins);
        }
    } catch (_) {}

    return (
        <Box
            position="absolute"
            top={top}
            left={left}
            right={right}
            height={Math.max(height, 5)}
            bgcolor="secondary.main"
            borderRadius={1}
            zIndex={zIndex}
            padding={height < 15 ? 0 : 0.5}
            boxSizing="border-box"
            display="flex"
            flexDirection="column"
            justifyContent="flex-start"
            sx={{
                opacity: 0.5,
                pointerEvents: "none"
            }}
        >
            <Typography
                variant="caption"
                color="primary.contrastText"
                fontWeight={600}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                fontSize={height < 40 ? "0.65rem" : "0.75rem"}
            >
                {title}
            </Typography>
            {height >= 40 && (
                <Typography
                    variant="caption"
                    color="primary.contrastText"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    fontSize="0.65rem"
                >
                    {timeDisplay}
                </Typography>
            )}
        </Box>
    );
}
