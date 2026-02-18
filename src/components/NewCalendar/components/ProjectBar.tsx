/**
 * ProjectBar - horizontal bar showing time distribution by project.
 */
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import { TAILWIND_COLORS } from "../../../services/projectService";
import { formatDuration } from "../layout/timeUtils";

interface Props { entries: CalendarEntry[]; }

interface Segment { id: string; name: string; color: string; mins: number; pct: number; }

function buildSegments(entries: CalendarEntry[]): Segment[] {
    const projectMap = new Map<string, { name: string; color: string; mins: number }>();

    entries.forEach(e => {
        const projectId = e.project_id || "none";
        const mins = dayjs(e.end_time).diff(dayjs(e.start_time), "minute");
        const current = projectMap.get(projectId);
        if (current) { current.mins += mins; }
        else { projectMap.set(projectId, { name: e.project?.name || "No Project", color: TAILWIND_COLORS[e.project?.color || 0].value, mins }); }
    });

    const total = [...projectMap.values()].reduce((s, v) => s + v.mins, 0);
    return [...projectMap.entries()]
        .map(([id, v]) => ({ id, name: v.name, color: v.color, mins: v.mins, pct: total > 0 ? (v.mins / total) * 100 : 0 }))
        .sort((a, b) => b.mins - a.mins);
}

export default function ProjectBar({ entries }: Props) {
    const segs = useMemo(() => buildSegments(entries), [entries]);

    return (
        <Box px={1} py={1.5}>
            <Box sx={{ display: "flex", mb: 0.5, minHeight: 20 }}>
                {segs.map(s => (
                    <Box key={s.id} sx={{ width: `${s.pct}%`, pl: 0.5 }} title={`${s.name} - ${formatDuration(s.mins)}`}>
                        <Typography variant="caption" noWrap sx={{ fontSize: "0.7rem", display: "block" }}>{s.name}</Typography>
                    </Box>
                ))}
            </Box>
            <Box sx={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", boxShadow: segs.length ? 1 : 0, bgcolor: segs.length ? "transparent" : "action.hover" }}>
                {segs.map((s, i) => (
                    <Box key={s.id} bgcolor={s.color} title={`${s.name} - ${formatDuration(s.mins)}`}
                        sx={{
                            width: `${s.pct}%`,
                            ...(i === 0 && { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }),
                            ...(i === segs.length - 1 && { borderTopRightRadius: 8, borderBottomRightRadius: 8 }),
                        }} />
                ))}
            </Box>
        </Box>
    );
}
