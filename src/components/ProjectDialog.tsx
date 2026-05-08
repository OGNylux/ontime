import { useEffect, useState } from 'react';
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
    Box,
    Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Project } from '../services/projectService';
import ColorSelector from './Forms/ColorSelector';
import { Client } from '../services/clientService';

const schema = z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
    colorIndex: z.number().min(0).max(17),
    clientId: z.string().min(1, 'Client is required'),
    hourlyRate: z.number({ error: 'Must be a number' }).min(0).optional(),
    startDate: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface ProjectDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (project: Project) => Promise<void>;
    project?: Project | null;
    clients: Client[];
}

function getDefaults(project?: Project | null): FormValues {
    return {
        name: project?.name ?? '',
        description: project?.description ?? '',
        colorIndex: project?.color ?? 0,
        clientId: project?.client_id ?? '',
        hourlyRate: project?.hourly_rate ?? 50,
        startDate: project?.start_date
            ? dayjs(project.start_date).format('YYYY-MM-DD')
            : dayjs().format('YYYY-MM-DD'),
    };
}

export default function ProjectDialog({ open, onClose, onSave, project, clients }: ProjectDialogProps) {
    const [serverError, setServerError] = useState('');
    const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: getDefaults(project),
    });

    useEffect(() => {
        if (open) {
            reset(getDefaults(project));
            setServerError('');
        }
    }, [open, project, reset]);

    const onSubmit = async (values: FormValues) => {
        try {
            await onSave({
                name: values.name.trim(),
                color: values.colorIndex,
                client_id: values.clientId || null,
                hourly_rate: values.hourlyRate ?? null,
                start_date: values.startDate,
                description: values.description?.trim() || undefined,
            });
            onClose();
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle variant="h5" fontWeight="bold">{project ? 'Edit Project' : 'New Project'}</DialogTitle>
                <DialogContent>
                    {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}
                    <Stack spacing={2} marginTop={1}>
                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Project Name *</Typography>
                            <TextField
                                {...register('name')}
                                placeholder="Enter project name"
                                fullWidth
                                autoFocus
                                error={!!errors.name}
                                helperText={errors.name?.message}
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Description</Typography>
                            <TextField
                                {...register('description')}
                                placeholder="Enter project description"
                                fullWidth
                                multiline
                                minRows={3}
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Hourly Rate (€)</Typography>
                            <Controller
                                name="hourlyRate"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        placeholder="e.g. 50"
                                        type="number"
                                        inputProps={{ min: 0, step: '0.01' }}
                                        fullWidth
                                        error={!!errors.hourlyRate}
                                        helperText={errors.hourlyRate?.message}
                                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    />
                                )}
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Client *</Typography>
                            <Controller
                                name="clientId"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth error={!!errors.clientId}>
                                        <Select
                                            {...field}
                                            displayEmpty
                                            MenuProps={{ PaperProps: { sx: { bgcolor: t => t.palette.background.default, backgroundImage: "none" } } }}
                                            renderValue={(value) =>
                                                value
                                                    ? clients.find((c) => c.id === value)?.name
                                                    : <em style={{ opacity: 0.6 }}>Select a client</em>
                                            }
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {clients.map((client) => (
                                                <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
                                            ))}
                                        </Select>
                                        {errors.clientId && (
                                            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                                {errors.clientId.message}
                                            </Typography>
                                        )}
                                    </FormControl>
                                )}
                            />
                        </Box>

                        <Box display="flex" gap={2}>
                            <Box display="flex" flexDirection="column">
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Color</Typography>
                                <Controller
                                    name="colorIndex"
                                    control={control}
                                    render={({ field }) => (
                                        <ColorSelector value={field.value} onChange={field.onChange} />
                                    )}
                                />
                            </Box>

                            <Box display="flex" flexDirection="column" flexGrow={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Start Date</Typography>
                                <TextField
                                    {...register('startDate')}
                                    type="date"
                                    fullWidth
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                        input: {
                                            sx: {
                                                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                                    filter: (t) => t.palette.mode === 'dark' ? 'invert(0.6)' : 'opacity(0.6)',
                                                },
                                            },
                                        },
                                    }}
                                />
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {project ? 'Save' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
