/**
 * EntryPreview - semi-transparent rectangle shown during drag-to-create
 * or while moving an entry to a new position.
 */
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import { formatDuration } from "../layout/timeUtils";

interface Props {
    title?: string;
    startIso?: string;
    endIso?: string;
    top: number;
    height: number;
    left?: number | string;
    right?: number | string;
    zIndex?: number;
}

export default function EntryPreview({ title = "", startIso, endIso, top, height, left = 4, right = 4, zIndex = 10 }: Props) {
    let time = "";
    try {
        if (startIso && endIso) {
            time = formatDuration(Math.max(0, dayjs(endIso).diff(dayjs(startIso), "minute")));
        }
    } catch { /* ignore */ }

    return (
        <Box
            position="absolute"
            top={top} left={left} right={right}
            height={Math.max(height, 5)}
            bgcolor="secondary.main"
            borderRadius={1}
            zIndex={zIndex}
            padding={height < 15 ? 0 : 0.5}
            boxSizing="border-box"
            display="flex" flexDirection="column" justifyContent="flex-start"
            sx={{ opacity: 0.5, pointerEvents: "none" }}
        >
            <Typography variant="caption" color="primary.contrastText" fontWeight={600} noWrap fontSize={height < 40 ? "0.65rem" : "0.75rem"}>
                {title}
            </Typography>
            {height >= 40 && (
                <Typography variant="caption" color="primary.contrastText" noWrap fontSize="0.65rem">
                    {time}
                </Typography>
            )}
        </Box>
    );
}
