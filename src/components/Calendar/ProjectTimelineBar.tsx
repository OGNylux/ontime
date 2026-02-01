import { Box, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../services/calendarService";
import { TAILWIND_COLORS } from "../../services/projectService";
import { formatDuration } from "./util/calendarUtility";


interface ProjectTimelineBarProps {
    entries: CalendarEntry[];
}

interface ProjectSegment {
    projectId: string;
    projectName: string;
    color: string;
    minutes: number;
    percentage: number;
}

type ViewMode = "day" | "week";

const calculateSegments = (entries: CalendarEntry[]): ProjectSegment[] => {
    const projectTimeMap = new Map<string, { name: string; color: string; minutes: number }>();

    entries.forEach(entry => {
        const projectId = entry.project_id || "no-project";
        const minutes = dayjs(entry.end_time).diff(dayjs(entry.start_time), "minute");

        const existing = projectTimeMap.get(projectId);
        if (existing) {
            existing.minutes += minutes;
        } else {
            projectTimeMap.set(projectId, {
                name: entry.project?.name || "No Project",
                color: TAILWIND_COLORS[entry.project?.color || 0].value,
                minutes,
            });
        }
    });

    const totalMinutes = [...projectTimeMap.values()].reduce((sum, p) => sum + p.minutes, 0);

    return [...projectTimeMap.entries()]
        .map(([projectId, { name, color, minutes }]) => ({
            projectId,
            projectName: name,
            color,
            minutes,
            percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
        }))
        .sort((a, b) => b.minutes - a.minutes);
};


const SegmentLabels = ({ segments }: { segments: ProjectSegment[] }) => (
    <Box sx={{ display: "flex", mb: 0.5, minHeight: "20px" }}>
        {segments.map(segment => (
            <Box
                key={segment.projectId}
                sx={{ width: `${segment.percentage}%`, pl: 0.5 }}
                title={`${segment.projectName} - ${formatDuration(segment.minutes)}`}
            >
                <Typography
                    variant="caption"
                    noWrap
                    sx={{ fontSize: "0.7rem", display: "block" }}
                >
                    {segment.projectName}
                </Typography>
            </Box>
        ))}
    </Box>
);

const TimelineBar = ({ segments }: { segments: ProjectSegment[] }) => (
    <Box
        sx={{
            display: "flex",
            height: 4,
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: segments.length > 0 ? 1 : 0,
            bgcolor: segments.length > 0 ? "transparent" : "action.hover",
        }}
    >
        {segments.map((segment, index) => (
            <Box
                key={segment.projectId}
                title={`${segment.projectName} - ${formatDuration(segment.minutes)}`}
                bgcolor={`${segment.color}`}
                sx={{
                    width: `${segment.percentage}%`,
                    ...(index === 0 && { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }),
                    ...(index === segments.length - 1 && { borderTopRightRadius: 8, borderBottomRightRadius: 8 }),
                }}
            />
        ))}
    </Box>
);

export default function ProjectTimelineBar({ entries }: ProjectTimelineBarProps) {
    const [viewMode, _] = useState<ViewMode>("week");

    const weekSegments = useMemo(() => calculateSegments(entries), [entries]);

    const todaySegments = useMemo(() => {
        const today = dayjs().format("YYYY-MM-DD");
        const todayEntries = entries.filter(
            entry => dayjs(entry.start_time).format("YYYY-MM-DD") === today
        );
        return calculateSegments(todayEntries);
    }, [entries]);

    const segments = viewMode === "week" ? weekSegments : todaySegments;

    return (
        <Box px={1} py={1.5}>
            <SegmentLabels segments={segments} />
            <TimelineBar segments={segments} />
        </Box>
    );
}
