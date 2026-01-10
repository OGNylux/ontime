import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
    actionIcon?: ReactNode;
}

export default function PageHeader({
    title,
    actionLabel,
    onAction,
    actionIcon = <Add />,
}: PageHeaderProps) {
    return (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight="bold">
                {title}
            </Typography>
            {actionLabel && onAction && (
                <Button variant="contained" startIcon={actionIcon} onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </Box>
    );
}
