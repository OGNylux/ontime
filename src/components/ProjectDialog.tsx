import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Alert,
    Stack,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
    Box,
    Typography,

} from '@mui/material';
import dayjs from 'dayjs';
import { Project } from '../services/projectService';
import ColorSelector from './Forms/ColorSelector';
import { Client } from '../services/clientService';

interface ProjectDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (project: Project) => Promise<void>;
    project?: Project | null;
    clients: Client[];
}

export default function ProjectDialog({ open, onClose, onSave, project, clients }: ProjectDialogProps) {
    const [name, setName] = useState('');
    const [colorIndex, setColorIndex] = useState(0);
    const [clientId, setClientId] = useState('');
    const [hourlyRate, setHourlyRate] = useState<number | ''>(0);
    const [startDate, setStartDate] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (project) {
                setName(project.name || '');
                setColorIndex(project.color ?? 0);
                setClientId(project.client_id || '');
                setHourlyRate(project.hourly_rate ?? 0);
                setStartDate(project.start_date ? dayjs(project.start_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
                setDescription(project.description || '');
            } else {
                setName('');
                setColorIndex(0);
                setClientId('');
                setHourlyRate(50);
                setStartDate(dayjs().format('YYYY-MM-DD'));
                setDescription('');
            }
            setError('');
        }
    }, [open, project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Project name is required');
            return;
        }
        setLoading(true);
        try {
            await onSave(
                {
                    name: name.trim(),
                    color: colorIndex,
                    client_id: clientId,
                    hourly_rate: hourlyRate ? hourlyRate : undefined,
                    start_date: startDate,
                    description: description.trim() || undefined,
                }
            );
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
            <form onSubmit={handleSubmit}>
                <DialogTitle variant='h5' fontWeight="bold">{project ? 'Edit Project' : 'New Project'}</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Stack spacing={2} marginTop={1}>
                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Project Name *</Typography>
                            <TextField
                                placeholder="Enter project name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Description</Typography>
                            <TextField
                                placeholder="Enter project description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                fullWidth
                                multiline
                                minRows={3}
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Hourly Rate (€)</Typography>
                            <TextField
                                placeholder="e.g. 50"
                                type="number"
                                inputProps={{ min: 0, step: '0.01' }}
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                fullWidth
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Client *</Typography>
                            <FormControl fullWidth>
                                <Select
                                    value={clientId}
                                    displayEmpty
                                    onChange={(e: SelectChangeEvent) => setClientId(e.target.value)}
                                    renderValue={(value) => value ? clients.find(c => c.id === value)?.name : <em style={{ opacity: 0.6 }}>Select a client</em>}
                                    required
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {clients.map((client) => (
                                        <MenuItem key={client.id} value={client.id}>
                                            {client.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <Box display="flex" gap={2}>
                            <Box display="flex" flexDirection="column">
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Color</Typography>
                                <ColorSelector value={colorIndex} onChange={(i: number) => setColorIndex(i)} />
                            </Box>

                            <Box display="flex" flexDirection="column" flexGrow={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Start Date</Typography>
                                <TextField
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    fullWidth
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                        input: {
                                            sx: {
                                                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                                    filter: (theme) => theme.palette.mode === 'dark' ? 'invert(0.6)' : 'opacity(0.6)'
                                                }
                                            }
                                        }
                                    }}
                                />
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {project ? 'Save' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
