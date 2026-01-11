import { Box, Paper, Typography } from '@mui/material';
import { formatDuration } from '../Calendar/util/calendarUtility';

interface ChartTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    type: 'bar' | 'pie';
    projectNames?: Record<string, string>;
    projectColors?: Record<string, string>;
}

export default function ChartTooltip({
    active,
    payload,
    label,
    type,
    projectNames = {},
    projectColors = {},
}: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    const getColor = (p: any, name: string) =>
        p.color || p.payload?.color || projectColors[name] || '#8884d8';

    if (type === 'pie' && payload[0]) {
        const p = payload[0];
        const name = p.name ?? p.dataKey ?? p.payload?.name ?? '';
        const color = getColor(p, name);
        const formatted = formatDuration(Number(p.value));

        return (
            <Paper sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 2 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <Box width={10} height={10} borderRadius="50%" bgcolor={color} flexShrink={0} />
                    <Typography variant="body2" color="text.primary">
                        {projectNames[name] || p.name || p.payload?.name}
                    </Typography>
                </Box>
                <Box mt={0.5}>
                    <Typography variant="body2" color="text.primary">
                        Duration: {formatted}
                    </Typography>
                </Box>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 2 }}>
            {label && (
                <Typography variant="caption" color="text.secondary">
                    {label}
                </Typography>
            )}
            <Box mt={label ? 0.5 : 0}>
                {payload.map((p: any, i: number) => {
                    const name = p.name ?? p.dataKey ?? p.payload?.name ?? '';
                    const color = getColor(p, name);
                    const formatted =
                        type === 'bar'
                            ? formatDuration(Number(p.value) * 60)
                            : formatDuration(Number(p.value));

                    return (
                        <Box key={i} display="flex" alignItems="center" gap={1} mt={i ? 0.5 : 0}>
                            <Box width={10} height={10} borderRadius="50%" bgcolor={color} flexShrink={0} />
                            <Typography variant="body2" color="text.primary">
                                {projectNames[name] || p.name || p.payload?.name}
                            </Typography>
                            <Box flex={1} />
                            <Typography variant="body2" color="text.primary">
                                {formatted}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
}
