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
    Box,
    Typography,
    Divider,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Client } from '../services/clientService';

const schema = z.object({
    name: z.string().min(1, 'Client name is required'),
    street: z.string().optional(),
    houseNumber: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    vatNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClientDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (client: Client) => Promise<void>;
    client?: Client | null;
}

function getDefaults(client?: Client | null): FormValues {
    return {
        name: client?.name ?? '',
        street: client?.info?.street ?? '',
        houseNumber: client?.info?.house_number ?? '',
        postalCode: client?.info?.postal_code ?? '',
        city: client?.info?.city ?? '',
        state: client?.info?.state ?? '',
        country: client?.info?.country ?? '',
        email: client?.info?.email ?? '',
        phone: client?.info?.phone ?? '',
        vatNumber: client?.info?.vat_number ?? '',
    };
}

export default function ClientDialog({ open, onClose, onSave, client }: ClientDialogProps) {
    const [serverError, setServerError] = useState('');
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: getDefaults(client),
    });

    useEffect(() => {
        if (open) {
            reset(getDefaults(client));
            setServerError('');
        }
    }, [open, client, reset]);

    const onSubmit = async (values: FormValues) => {
        try {
            await onSave({
                name: values.name.trim(),
                info: {
                    street: values.street?.trim() || null,
                    house_number: values.houseNumber?.trim() || null,
                    postal_code: values.postalCode?.trim() || null,
                    city: values.city?.trim() || null,
                    state: values.state?.trim() || null,
                    country: values.country?.trim() || null,
                    email: values.email?.trim() || null,
                    phone: values.phone?.trim() || null,
                    vat_number: values.vatNumber?.trim() || null,
                },
            });
            onClose();
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle variant="h5" fontWeight="bold">{client ? 'Edit Client' : 'New Client'}</DialogTitle>
                <DialogContent>
                    {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}
                    <Stack spacing={2} marginTop={1}>
                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Client Name *</Typography>
                            <TextField
                                {...register('name')}
                                placeholder="Enter client name"
                                fullWidth
                                autoFocus
                                error={!!errors.name}
                                helperText={errors.name?.message}
                            />
                        </Box>

                        <Box display="flex" gap={2}>
                            <Box flex={3}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Street</Typography>
                                <TextField {...register('street')} placeholder="Enter street name" fullWidth />
                            </Box>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>No.</Typography>
                                <TextField {...register('houseNumber')} placeholder="123" fullWidth />
                            </Box>
                        </Box>

                        <Box display="flex" gap={2}>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Postal Code</Typography>
                                <TextField {...register('postalCode')} placeholder="Enter postal code" fullWidth />
                            </Box>
                            <Box flex={2}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>City</Typography>
                                <TextField {...register('city')} placeholder="Enter city" fullWidth />
                            </Box>
                        </Box>

                        <Box display="flex" gap={2}>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>State</Typography>
                                <TextField {...register('state')} placeholder="Enter state" fullWidth />
                            </Box>
                            <Box flex={1}>
                                <Typography variant="body2" marginBottom={0.5} fontWeight={500}>Country</Typography>
                                <TextField {...register('country')} placeholder="Enter country" fullWidth />
                            </Box>
                        </Box>

                        <Divider />
                        <Typography variant="body2" fontWeight={600} color="text.secondary">Invoice Details</Typography>

                        <Box>
                            <Typography variant="body2" marginBottom={0.5} fontWeight={500}>VAT Number</Typography>
                            <TextField {...register('vatNumber')} placeholder="e.g. BE0123456789" fullWidth />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {client ? 'Save' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
