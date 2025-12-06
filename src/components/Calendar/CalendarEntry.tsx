import { Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { formatTime, pixelPerMinute } from "./util/calendarUtility";
import { TimeEntry } from "./util/calendarTypes";
import { useCalendarEntry } from "./useCalendarEntry";

interface CalendarEntryOverlayProps {
    entry: TimeEntry;
    hourHeight: number;
    widthPercent?: number;
    offsetPercent?: number;
    zIndex?: number;
    isPreview?: boolean;
    isDragging?: boolean;
    onDragStart?: (clientX: number, clientY: number) => void;
    onResizeCommit?: (entryId: string, startMinute: number, endMinute: number) => void;
    onEntryClick?: (event: React.MouseEvent, entry: TimeEntry) => void;
}



export default function CalendarEntryOverlay({ 
    entry, 
    hourHeight, 
    widthPercent = 100, 
    offsetPercent = 0, 
    zIndex = 100, 
    isPreview = false, 
    isDragging = false, 
    onDragStart, 
    onResizeCommit,
    onEntryClick
}: CalendarEntryOverlayProps) {
    const theme = useTheme();
    const pxPerMinute = pixelPerMinute(hourHeight);
    
    const {
        paperRef,
        handleMouseDown,
        setHovered,
        displayStart,
        displayEnd,
        renderWidth,
        renderOffset,
        showHandles,
        startResize
    } = useCalendarEntry({
        entry,
        hourHeight,
        widthPercent,
        offsetPercent,
        isPreview,
        isDragging,
        onDragStart,
        onResizeCommit,
        onEntryClick: (e) => {
            if (onEntryClick) {
                // @ts-ignore
                onEntryClick(e, entry);
            }
        }
    });



    const baseColor = entry.color ?? theme.palette.primary.main;
    const backgroundColor = isPreview ? alpha(baseColor, 0.85) : baseColor;
    const textColor = theme.palette.getContrastText(backgroundColor);


    return (
        <Paper
            ref={paperRef}
            elevation={6}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
                position: "absolute",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                top: `${displayStart * pxPerMinute}px`,
                height: `${(displayEnd - displayStart) * pxPerMinute}px`,
                width: `${renderWidth}%`,
                left: `${renderOffset}%`,
                zIndex,
                bgcolor: backgroundColor,
                color: textColor,
                display: "flex",
                flexDirection: "column",
                px: { xs: 0.75, md: 1 },
                py: 0.75,
                cursor: isPreview ? "default" : "grab",
                pointerEvents: isPreview ? "none" : "auto",
                opacity: isDragging ? 0 : isPreview ? 0.9 : 1,
                transition: theme.transitions.create(["transform", "box-shadow", "opacity"], {
                    duration: theme.transitions.duration.shortest,
                }),
                borderRadius: 1,
                overflow: "hidden",
            }}
        >
            {/* Top resize handle */}
            {showHandles && (
                <div
                    onMouseDown={(e) => { e.stopPropagation(); startResize("top", e.clientY); }}
                    onTouchStart={(e) => { e.stopPropagation(); startResize("top", e.touches[0].clientY); }}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "ns-resize",
                        zIndex: 260,
                        pointerEvents: "auto",
                        userSelect: "none",
                    }}
                >
                    <span className="text-xs opacity-70">--</span>
                </div>
            )}

            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontSize={{ xs: "0.65rem", md: "0.85rem" }} paddingTop={0.5}>
                    {entry.title || "New Entry"}
                </Typography>
                <Typography variant="subtitle2" noWrap sx={{ fontSize: { xs: "0.55rem", md: "0.75rem" }, opacity: 0.9 }}>
                    {formatTime(displayStart, true)} - {formatTime(displayEnd, true)}
                </Typography>
            </Stack>

            {/* Bottom resize handle */}
            {showHandles && (
                <div
                    onMouseDown={(e) => { e.stopPropagation(); startResize("bottom", e.clientY); }}
                    onTouchStart={(e) => { e.stopPropagation(); startResize("bottom", e.touches[0].clientY); }}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "ns-resize",
                        zIndex: 250,
                        pointerEvents: "auto",
                        userSelect: "none",
                    }}
                >
                    <span className="text-xs opacity-70">--</span>
                </div>
            )}
        </Paper>
    );
}
