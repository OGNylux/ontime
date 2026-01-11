import { Box, Typography } from '@mui/material';
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
}

export default function PieChartSection({ data, projectNames }: PieChartSectionProps) {
    const theme = useTheme();

    return (
        <Box
            flex={1}
            minWidth={250}
            minHeight={260}
            py={1}
            px={2}
            borderRadius={2}
            boxShadow={4}
            bgcolor="background.default"
        >
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                Project Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        stroke={theme.palette.background.default}
                        strokeWidth={2}
                        cornerRadius={4}
                        isAnimationActive={false}
                        label={({ percent, x, y }) => (
                            <Typography
                                component="text"
                                x={x}
                                y={y}
                                sx={{ fill: theme.palette.text.primary, fontSize: 14 }}
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
