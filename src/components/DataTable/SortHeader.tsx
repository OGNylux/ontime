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
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': { opacity: 0.7 },
            }}
        >
            <Typography component="span">
                {label}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5}}>
                <ExpandLess
                    sx={{
                        fontSize: 20,
                        mb: -0.6,
                        color: orderBy === field && order === 'asc' ? 'primary.main' : 'action.disabled',
                    }}
                />
                <ExpandMore
                    sx={{
                        fontSize: 20,
                        mt: -0.65,
                        color: orderBy === field && order === 'desc' ? 'primary.main' : 'action.disabled',
                    }}
                />
            </Box>
        </Box>
    );
}
