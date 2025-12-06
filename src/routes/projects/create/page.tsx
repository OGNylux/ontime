import React, { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert, MenuItem } from '@mui/material';
import { projectService } from '../../../services/projectService';
import { clientService } from '../../../services/clientService';
import { useNavigate } from 'react-router-dom';
import { ClientResponseDTO } from '../../../dtos/response/Client.response.dto';

export default function CreateProjectPage() {
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [error, setError] = useState('');
    const [clientId, setClientId] = useState('');
    const [clients, setClients] = useState<ClientResponseDTO[]>([]);
    const navigate = useNavigate();

        useEffect(() => {
            clientService.getClients().then(setClients).catch(console.error);
        }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await projectService.createProject({ 
                name, 
                color,
                client_id: clientId || undefined
            });
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box mt={4} p={3} boxShadow={3} borderRadius={2}>
                <Typography variant="h5" mb={3}>Create Project</Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Project Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
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
                        label="Clients"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        fullWidth
                        margin="normal"
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {clients.map((client) => (
                            <MenuItem key={client.id} value={client.id}>
                                {client.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
                        Create Project
                    </Button>
                </form>
            </Box>
        </Container>
    );
}
