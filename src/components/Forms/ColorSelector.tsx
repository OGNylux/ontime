import { FormControl, Select, MenuItem, SelectChangeEvent, Box, Tooltip } from '@mui/material';
import { TAILWIND_COLORS } from '../../services/projectService';

interface ColorSelectorProps {
    value: number;
    onChange: (index: number) => void;
}

export default function ColorSelector({ value, onChange }: ColorSelectorProps) {
    return (
        <FormControl fullWidth>
            <Select
                value={value.toString()}
                onChange={(e: SelectChangeEvent) => onChange(Number(e.target.value))}
                sx={{
                    '& .MuiSelect-select': {
                        height: '56px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                    },
                }}
                MenuProps={{
                    PaperProps: {
                        sx: {
                            '& .MuiMenu-list': {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(6, 1fr)',
                                gap: 1,
                                padding: 1,
                            },
                        },
                    },
                }}
                renderValue={(v) => {
                    const index = Number(v);
                    const colorObj = TAILWIND_COLORS[index];
                    return (
                        <Box display="flex" alignItems="center">
                            <Box 
                                width={32}
                                height={32}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                borderRadius="50%"
                                border="2px solid"
                                borderColor="primary.main"
                                boxSizing="border-box"
                            >
                                <div className={`w-6 h-6 rounded-full ${colorObj?.value}`} />
                            </Box>
                        </Box>
                    );
                }}
            >
                {TAILWIND_COLORS.map((colorOption, index) => (
                    <MenuItem
                        key={index}
                        value={index.toString()}
                        sx={{
                            justifyContent: 'center',
                            px: 0,
                            backgroundColor: 'transparent !important',
                            '&.Mui-selected': {
                                backgroundColor: 'transparent !important',
                            },
                            '&.Mui-selected:hover': {
                                backgroundColor: 'transparent !important',
                            },
                            '&:hover': {
                                backgroundColor: 'transparent !important',
                            },
                        }}
                    >
                        <Tooltip title={colorOption.name} enterDelay={200} followCursor>
                            <Box 
                                width={36}
                                height={36}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                borderRadius="50%"
                                boxSizing="border-box"
                                border="2px solid"
                                borderColor={index === value ? 'primary.main' : 'transparent'}
                                sx={{
                                    transition: 'border-color 0.2s',
                                    '&:hover': {
                                        borderColor: index === value ? 'primary.main' : 'primary.light',
                                    },
                                }}
                            >
                                <div className={`w-6 h-6 rounded-full ${colorOption.value}`} />
                            </Box>
                        </Tooltip>
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
