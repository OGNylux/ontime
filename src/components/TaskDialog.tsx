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
import { Task } from '../services/taskService';
import { Project } from '../services/projectService';
import ColorSelector from './Forms/ColorSelector';

interface TaskDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (task: Task) => Promise<void>;
    task?: Task | null;
    projects: Project[];
}

export default function TaskDialog({ open, onClose, onSave, task, projects }: TaskDialogProps) {
    const [name, setName] = useState('');
    const [colorIndex, setColorIndex] = useState(0);
    const [projectId, setProjectId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (task) {
                setName(task.name || '');
                setColorIndex(task.color ? task.color : 0);
                setProjectId(task.project_id || '');
            } else {
                setName('');
                setColorIndex(0);
                setProjectId('');
            }
            setError('');
        }
    }, [open, task]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Task name is required');
            return;
        }
        setLoading(true);
        try {
            await onSave({
                name: name.trim(),
                color: colorIndex,
                project_id: projectId || undefined,
            });
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
                <DialogTitle variant='h5' fontWeight="bold">{task ? 'Edit Task' : 'New Task'}</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Stack spacing={2} marginTop={1}>
                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Task Name *</Typography>
                            <TextField
                                placeholder="Enter task name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Project *</Typography>
                            <FormControl fullWidth>
                                <Select
                                    value={projectId}
                                    displayEmpty
                                    required
                                    onChange={(e: SelectChangeEvent) => {
                                        const newProjectId = e.target.value;
                                        setProjectId(newProjectId);
                                        if (!task && newProjectId) {
                                            const selectedProject = projects.find(p => p.id === newProjectId);
                                            if (selectedProject?.color) {
                                                setColorIndex(selectedProject.color);
                                            }
                                        }
                                    }}
                                    renderValue={(value) => value ? projects.find(p => p.id === value)?.name : <em style={{ opacity: 0.6 }}>Select a project</em>}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {projects.map((project) => (
                                        <MenuItem key={project.id} value={project.id}>
                                            {project.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Color</Typography>
                            <ColorSelector value={colorIndex} onChange={(i: number) => setColorIndex(i)} />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {task ? 'Save' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
