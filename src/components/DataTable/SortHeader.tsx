import { Box, Typography } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';

export type Order = 'asc' | 'desc';

interface SortHeaderProps {
    label: string;
    field: string;
    orderBy: string;
    order: Order;
    onSort: (field: string) => void;
}

export default function SortHeader({ label, field, orderBy, order, onSort }: SortHeaderProps) {
    return (
        <Box
            onClick={() => onSort(field)}
            display="inline-flex"
            alignItems="center"
            sx={{
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': { opacity: 0.7 },
            }}
        >
            <Typography component="span">
                {label}
            </Typography>
            <Box display="flex" flexDirection="column" ml={0.5}>
                <ExpandLess
                    color={orderBy === field && order === 'asc' ? 'secondary' : 'disabled'}
                    sx={{
                        fontSize: 20,
                        mb: -0.6
                    }}
                />
                <ExpandMore
                    color={orderBy === field && order === 'desc' ? 'secondary' : 'disabled'}
                    sx={{
                        fontSize: 20,
                        mt: -0.65
                    }}
                />
            </Box>
        </Box>
    );
}
