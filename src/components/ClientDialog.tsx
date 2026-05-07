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
    Divider,
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
    const [street, setStreet] = useState('');
    const [houseNumber, setHouseNumber] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [vatNumber, setVatNumber] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (client) {
                setName(client.name || '');
                setStreet(client.info?.street || '');
                setHouseNumber(client.info?.house_number || '');
                setPostalCode(client.info?.postal_code || '');
                setCity(client.info?.city || '');
                setState(client.info?.state || '');
                setCountry(client.info?.country || '');
                setEmail(client.info?.email || '');
                setPhone(client.info?.phone || '');
                setVatNumber(client.info?.vat_number || '');
            } else {
                setName('');
                setStreet('');
                setHouseNumber('');
                setPostalCode('');
                setCity('');
                setState('');
                setCountry('');
                setEmail('');
                setPhone('');
                setVatNumber('');
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
                    street: street.trim() || undefined,
                    house_number: houseNumber.trim() || undefined,
                    postal_code: postalCode.trim() || undefined,
                    city: city.trim() || undefined,
                    state: state.trim() || undefined,
                    country: country.trim() || undefined,
                    email: email.trim() || undefined,
                    phone: phone.trim() || undefined,
                    vat_number: vatNumber.trim() || undefined,
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
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
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

                        <Box display="flex" gap={2}>
                            <Box flex={3}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Street</Typography>
                                <TextField
                                    placeholder="Enter street name"
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                    fullWidth
                                />
                            </Box>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>No.</Typography>
                                <TextField
                                    placeholder="123"
                                    value={houseNumber}
                                    onChange={(e) => setHouseNumber(e.target.value)}
                                    fullWidth
                                />
                            </Box>
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

                        <Divider />
                        <Typography variant="body2" fontWeight={600} color="text.secondary">Invoice Details</Typography>

                        {/* <Box display="flex" gap={2}>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Email</Typography>
                                <TextField
                                    placeholder="billing@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    fullWidth
                                    type="email"
                                />
                            </Box>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Phone</Typography>
                                <TextField
                                    placeholder="+1 234 567 890"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    fullWidth
                                />
                            </Box>
                        </Box> */}

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>VAT Number</Typography>
                            <TextField
                                placeholder="e.g. BE0123456789"
                                value={vatNumber}
                                onChange={(e) => setVatNumber(e.target.value)}
                                fullWidth
                            />
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
