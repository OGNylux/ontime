import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert, Grid } from '@mui/material';
import { clientService } from '../../../services/clientService';
import { useNavigate } from 'react-router-dom';

export default function CreateClientPage() {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await clientService.createClient({
                name,
                info: {
                    address,
                    postal_code: postalCode,
                    city,
                    state,
                    country
                }
            });
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box mt={4} p={3} boxShadow={3} borderRadius={2}>
                <Typography variant="h5" mb={3}>Create Client</Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Client Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                        margin="normal"
                    />
                    <Typography variant="h6" mt={2} mb={1}>Address Info</Typography>
                    <TextField
                        label="Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <Grid container spacing={2}>
                        <Grid size={6}>
                            <TextField
                                label="Postal Code"
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                fullWidth
                                margin="normal"
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                label="City"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                fullWidth
                                margin="normal"
                            />
                        </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                        <Grid size={6}>
                            <TextField
                                label="State"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                fullWidth
                                margin="normal"
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                label="Country"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                fullWidth
                                margin="normal"
                            />
                        </Grid>
                    </Grid>
                    <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
                        Create Client
                    </Button>
                </form>
            </Box>
        </Container>
    );
}
