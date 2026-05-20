import { Box, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import ChartTooltip from './ChartTooltip';

interface PieDataItem {
    name: string;
    value: number;
    color: string;
    [key: string]: string | number;
}

interface PieChartSectionProps {
    data: PieDataItem[];
    projectNames: Record<string, string>;
    title?: string;
    fullHeight?: boolean;
}

export default function PieChartSection({
    data,
    projectNames,
    title = 'Project Distribution',
    fullHeight = false,
}: PieChartSectionProps) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
    const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
    const chartHeight = fullHeight ? '100%' : isSmall ? 180 : isNarrow ? 200 : 240;

    return (
        <Box
            flex={1}
            minWidth={250}
            minHeight={260}
            height={fullHeight ? '100%' : undefined}
            py={1}
            px={2}
            borderRadius={2}
            boxShadow={4}
            bgcolor="background.default"
            display="flex"
            flexDirection="column"
        >
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                {title}
            </Typography>
            <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={isSmall ? 78 : isNarrow ? 96 : 129}
                        outerRadius={isSmall ? 126 : isNarrow ? 156 : 225}
                        stroke={theme.palette.background.default}
                        strokeWidth={2}
                        cornerRadius={4}
                        isAnimationActive={false}
                        label={({ percent, x, y }) => (
                            <Typography
                                component="text"
                                x={x}
                                y={y}
                                sx={{ fill: theme.palette.text.primary, fontSize: isSmall ? 15 : isNarrow ? 16 : 17 }}
                                style={{ textAnchor: 'middle', dominantBaseline: 'central' }}
                            >
                                {`${((percent ?? 0) * 100).toFixed(0)}%`}
                            </Typography>
                        )}
                        labelLine={false}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip type="pie" projectNames={projectNames} />} />
                </PieChart>
            </ResponsiveContainer>
        </Box>
    );
}
