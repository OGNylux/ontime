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
import { Task } from '../services/taskService';
import { Project } from '../services/projectService';
import ColorSelector from './Forms/ColorSelector';

const schema = z.object({
    name: z.string().min(1, 'Task name is required'),
    colorIndex: z.number().min(0).max(17),
    projectId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TaskDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (task: Task) => Promise<void>;
    task?: Task | null;
    projects: Project[];
}

function getDefaults(task?: Task | null): FormValues {
    return {
        name: task?.name ?? '',
        colorIndex: task?.color ?? 0,
        projectId: task?.project_id ?? '',
    };
}

export default function TaskDialog({ open, onClose, onSave, task, projects }: TaskDialogProps) {
    const [serverError, setServerError] = useState('');
    const { control, register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: getDefaults(task),
    });

    useEffect(() => {
        if (open) {
            reset(getDefaults(task));
            setServerError('');
        }
    }, [open, task, reset]);

    const onSubmit = async (values: FormValues) => {
        try {
            await onSave({
                name: values.name.trim(),
                color: values.colorIndex,
                project_id: values.projectId || null,
            });
            onClose();
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle variant="h5" fontWeight="bold">{task ? 'Edit Task' : 'New Task'}</DialogTitle>
                <DialogContent>
                    {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}
                    <Stack spacing={2} marginTop={1}>
                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Task Name *</Typography>
                            <TextField
                                {...register('name')}
                                placeholder="Enter task name"
                                fullWidth
                                autoFocus
                                error={!!errors.name}
                                helperText={errors.name?.message}
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Project</Typography>
                            <Controller
                                name="projectId"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <Select
                                            {...field}
                                            displayEmpty
                                            onChange={(e) => {
                                                const newId = e.target.value;
                                                field.onChange(newId);
                                                if (!task && newId) {
                                                    const selectedProject = projects.find((p) => p.id === newId);
                                                    if (selectedProject?.color != null) {
                                                        setValue('colorIndex', selectedProject.color);
                                                    }
                                                }
                                            }}
                                            renderValue={(value) =>
                                                value
                                                    ? projects.find((p) => p.id === value)?.name
                                                    : <em style={{ opacity: 0.6 }}>Select a project</em>
                                            }
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {projects.map((project) => (
                                                <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Color</Typography>
                            <Controller
                                name="colorIndex"
                                control={control}
                                render={({ field }) => (
                                    <ColorSelector value={field.value} onChange={field.onChange} />
                                )}
                            />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {task ? 'Save' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
