import { Box, Typography } from '@mui/material';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
}

export default function StatCard({ icon, label, value }: StatCardProps) {
    return (
        <Box
            flex={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={1}
            borderRadius={2}
            boxShadow={4}
            bgcolor="background.default"
            minWidth={140}
        >
            {/* Left: icon, right-aligned in its third */}
            <Box flex={1} display="flex" justifyContent="flex-end" pr={1.5} color="primary.main">
                <Box sx={{ display: 'flex', alignItems: 'center', '& > svg': { fontSize: 40 } }}>
                    {icon}
                </Box>
            </Box>

            {/* Center: text, truly centered in the card */}
            <Box flex={1} display="flex" flexDirection="column" alignItems="center" textAlign="center">
                <Typography variant="h6" fontWeight="bold">
                    {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {label}
                </Typography>
            </Box>

            {/* Right: empty spacer to balance icon width */}
            <Box flex={1} />
        </Box>
    );
}
