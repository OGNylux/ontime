import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Container, Alert, MenuItem } from '@mui/material';
import { taskService } from '../../../services/taskService';
import { projectService } from '../../../services/projectService';
import { ProjectResponseDTO } from '../../../dtos/response/Project.response.dto';
import { useNavigate } from 'react-router-dom';

export default function CreateTaskPage() {
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [projectId, setProjectId] = useState('');
    const [projects, setProjects] = useState<ProjectResponseDTO[]>([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        projectService.getProjects().then(setProjects).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await taskService.createTask({ 
                name, 
                color, 
                project_id: projectId || undefined 
            });
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box mt={4} p={3} boxShadow={3} borderRadius={2}>
                <Typography variant="h5" mb={3}>Create Task</Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Task Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        select
                        label="Project"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        fullWidth
                        margin="normal"
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {projects.map((project) => (
                            <MenuItem key={project.id} value={project.id}>
                                {project.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
                        Create Task
                    </Button>
                </form>
            </Box>
        </Container>
    );
}
