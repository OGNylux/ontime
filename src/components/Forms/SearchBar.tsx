import { TextField, InputAdornment, Box } from '@mui/material';
import { Search } from '@mui/icons-material';
import { ReactNode } from 'react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    width?: number | string;
    endAdornment?: ReactNode;
}

export default function SearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    width = 300,
    endAdornment,
}: SearchBarProps) {
    return (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                size="small"
                sx={{ width }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    },
                }}
            />
            {endAdornment}
        </Box>
    );
}
