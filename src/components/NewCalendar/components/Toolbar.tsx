/**
 * Toolbar - top section: Recorder row + Navigation / Week total / View selector.
 */
import { Box, Typography } from "@mui/material";
import { CalendarEntry } from "../../../services/calendarService";
import type { ViewMode } from "../types";
import Recorder from "./Recorder";
import Navigation from "./Navigation";
import ViewSelector from "./ViewSelector";

interface Props {
    onRecordingStart: (fn: () => void) => void;
    addOrReplace: (e: CalendarEntry) => void;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    totalTime: string;
    viewMode: ViewMode;
    onViewModeChange: (m: ViewMode) => void;
}

export default function Toolbar({
    onRecordingStart, addOrReplace, onPrev, onNext, onToday, totalTime, viewMode, onViewModeChange,
}: Props) {
    return (
        <>
            {/* Recorder row */}
            <Box sx={{ display: "flex", px: 1, pt: 1 }}>
                <Recorder addOrReplace={addOrReplace} onRecordingStart={onRecordingStart} />
            </Box>

            {/* Nav + view selector row */}
            <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} pb={1} px={1}
                flexWrap={{ xs: "wrap", lg: "nowrap" }} mx={1} borderBottom={t => `1px solid ${t.palette.divider}`}>
                <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { xs: "flex-start", md: "center" }, gap: { xs: 0, md: 2 } }}>
                    <Navigation onPrev={onPrev} onNext={onNext} onToday={onToday} />
                    {totalTime && (
                        <Typography variant="caption" color="text.secondary"
                            sx={{ mt: { xs: 0.5, md: 0 }, fontSize: { xs: "0.75rem", md: "0.875rem" }, fontWeight: { md: 500 } }}>
                            {`WEEK TOTAL: ${totalTime}`}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-end", flexShrink: 0, alignSelf: "flex-start" }}>
                    <ViewSelector viewMode={viewMode} onChange={onViewModeChange} />
                </Box>
            </Box>
        </>
    );
}
