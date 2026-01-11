import { Box, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import ChartTooltip from './ChartTooltip';

const FALLBACK_COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
    '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57',
];

interface BarChartSectionProps {
    data: any[];
    projectIds: string[];
    projectNames: Record<string, string>;
    projectColors: Record<string, string>;
}

export default function BarChartSection({
    data,
    projectIds,
    projectNames,
    projectColors,
}: BarChartSectionProps) {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box
            flex={2}
            minWidth={300}
            minHeight={260}
            py={1}
            px={2}
            borderRadius={2}
            boxShadow={4}
            bgcolor="background.default"
        >
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                Hours per Day
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} layout={isSmallScreen ? 'vertical' : 'horizontal'}>
                    <XAxis
                        type={isSmallScreen ? 'number' : 'category'}
                        dataKey={isSmallScreen ? undefined : 'date'}
                        axisLine={{ stroke: theme.palette.text.secondary }}
                        tickLine={{ stroke: theme.palette.text.secondary }}
                        tick={{ fill: theme.palette.text.secondary }}
                    />
                    <YAxis
                        type={isSmallScreen ? 'category' : 'number'}
                        dataKey={isSmallScreen ? 'date' : undefined}
                        axisLine={{ stroke: theme.palette.text.secondary }}
                        tickLine={{ stroke: theme.palette.text.secondary }}
                        tick={{ fill: theme.palette.text.secondary }}
                    />
                    <Tooltip
                        content={
                            <ChartTooltip
                                type="bar"
                                projectNames={projectNames}
                                projectColors={projectColors}
                            />
                        }
                        cursor={{ fill: theme.palette.background.paper }}
                    />
                    <Legend formatter={(value: string) => projectNames[value] || value} />
                    {projectIds.map((projectId, idx) => (
                        <Bar
                            key={projectId}
                            dataKey={projectId}
                            stackId="a"
                            fill={projectColors[projectId] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
}
