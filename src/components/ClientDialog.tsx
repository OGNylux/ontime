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
    Box,
    Typography,
} from '@mui/material';
import { Client } from '../services/clientService';

interface ClientDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (client: Client) => Promise<void>;
    client?: Client | null;
}

export default function ClientDialog({ open, onClose, onSave, client }: ClientDialogProps) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (client) {
                setName(client.name || '');
                setAddress(client.info?.address || '');
                setPostalCode(client.info?.postal_code || '');
                setCity(client.info?.city || '');
                setState(client.info?.state || '');
                setCountry(client.info?.country || '');
            } else {
                setName('');
                setAddress('');
                setPostalCode('');
                setCity('');
                setState('');
                setCountry('');
            }
            setError('');
        }
    }, [open, client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Client name is required');
            return;
        }
        setLoading(true);
        try {
            await onSave({
                name: name.trim(),
                info: {
                    address: address.trim() || undefined,
                    postal_code: postalCode.trim() || undefined,
                    city: city.trim() || undefined,
                    state: state.trim() || undefined,
                    country: country.trim() || undefined,
                },
            });
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle variant='h5' fontWeight="bold">{client ? 'Edit Client' : 'New Client'}</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Stack spacing={2} marginTop={1}>
                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Client Name *</Typography>
                            <TextField
                                placeholder="Enter client name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Address</Typography>
                            <TextField
                                placeholder="Enter address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                fullWidth
                            />
                        </Box>

                        <Box display="flex" gap={2}>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Postal Code</Typography>
                                <TextField
                                    placeholder="Enter postal code"
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value)}
                                    fullWidth
                                />
                            </Box>
                            <Box flex={2}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>City</Typography>
                                <TextField
                                    placeholder="Enter city"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    fullWidth
                                />
                            </Box>
                        </Box>

                        <Box display="flex" gap={2}>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>State</Typography>
                                <TextField
                                    placeholder="Enter state"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    fullWidth
                                />
                            </Box>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Country</Typography>
                                <TextField
                                    placeholder="Enter country"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    fullWidth
                                />
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {client ? 'Save' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
