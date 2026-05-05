import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Select,
    FormControl,
    InputLabel,
    Divider,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    MoreVert,
    Delete,
    Send,
    CheckCircle,
    Cancel,
    Warning,
    Receipt,
    PictureAsPdf,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { pdf } from '@react-pdf/renderer';
import { invoiceService, Invoice, InvoiceStatus, InvoiceLineItem } from '../../services/invoiceService';
import { clientService, Client } from '../../services/clientService';
import { CalendarEntry } from '../../services/calendarService';
import { InvoicePDF } from './InvoicePDF';
import { DataTable, Column } from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/Forms/ConfirmDialog';

const STATUS_COLORS: Record<InvoiceStatus, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
    draft: 'default',
    sent: 'primary',
    paid: 'success',
    overdue: 'error',
    cancelled: 'warning',
};

const STATUS_NEXT: Record<InvoiceStatus, { label: string; value: InvoiceStatus; icon: React.ReactNode }[]> = {
    draft: [
        { label: 'Mark as Sent', value: 'sent', icon: <Send fontSize="small" /> },
        { label: 'Cancel', value: 'cancelled', icon: <Cancel fontSize="small" /> },
    ],
    sent: [
        { label: 'Mark as Paid', value: 'paid', icon: <CheckCircle fontSize="small" /> },
        { label: 'Mark as Overdue', value: 'overdue', icon: <Warning fontSize="small" /> },
        { label: 'Cancel', value: 'cancelled', icon: <Cancel fontSize="small" /> },
    ],
    paid: [],
    overdue: [
        { label: 'Mark as Paid', value: 'paid', icon: <CheckCircle fontSize="small" /> },
        { label: 'Cancel', value: 'cancelled', icon: <Cancel fontSize="small" /> },
    ],
    cancelled: [],
};

function getInvoiceTotal(invoice: Invoice): number {
    const subtotal = (invoice.line_items ?? []).reduce((sum, item) => sum + (item.amount ?? item.quantity_hours * item.unit_price), 0);
    return subtotal * (1 + invoice.tax_rate / 100);
}

function getInvoiceSubtotal(invoice: Invoice): number {
    return (invoice.line_items ?? []).reduce((sum, item) => sum + (item.amount ?? item.quantity_hours * item.unit_price), 0);
}

function durationHours(entry: CalendarEntry): number {
    return (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 3_600_000;
}

// ─── Create Invoice Dialog ───────────────────────────────────────────────────

interface CreateDialogProps {
    open: boolean;
    clients: Client[];
    onClose: () => void;
    onCreate: (invoice: Invoice) => void;
}

function CreateInvoiceDialog({ open, clients, onClose, onCreate }: CreateDialogProps) {
    const [clientId, setClientId] = useState('');
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
    const [currency, setCurrency] = useState('EUR');
    const [taxRate, setTaxRate] = useState(0);
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');

    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const canLoad = Boolean(clientId && dateFrom && dateTo);

    useEffect(() => {
        if (!open) return;
        setClientId('');
        setDateFrom(dayjs().startOf('month').format('YYYY-MM-DD'));
        setDateTo(dayjs().format('YYYY-MM-DD'));
        setCurrency('EUR');
        setTaxRate(0);
        setDueDate('');
        setNotes('');
        setEntries([]);
        setError('');
    }, [open]);

    useEffect(() => {
        if (!canLoad) { setEntries([]); return; }
        let cancelled = false;
        setLoadingEntries(true);
        invoiceService.getBillableEntries(clientId, dateFrom, dateTo).then((data) => {
            if (!cancelled) { setEntries(data); setLoadingEntries(false); }
        }).catch(() => {
            if (!cancelled) setLoadingEntries(false);
        });
        return () => { cancelled = true; };
    }, [clientId, dateFrom, dateTo, canLoad]);

    const lineItems = useMemo((): Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'amount'>[] =>
        entries.map((e) => ({
            calendar_entry_id: e.id,
            project_name: e.task?.project?.name ?? null,
            description: e.task?.name ?? 'No task',
            date: dayjs(e.start_time).format('YYYY-MM-DD'),
            quantity_hours: Math.round(durationHours(e) * 100) / 100,
            unit_price: e.task?.project?.hourly_rate ?? 0,
        })),
        [entries],
    );

    const subtotal = lineItems.reduce((s, i) => s + i.quantity_hours * i.unit_price, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    const currency_symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency;

    const handleCreate = async () => {
        if (!clientId) { setError('Please select a client.'); return; }
        if (lineItems.length === 0) { setError('No billable entries found for the selected client and date range.'); return; }
        setSaving(true);
        setError('');
        try {
            const inv = await invoiceService.create(
                { client_id: clientId, issue_date: dayjs().format('YYYY-MM-DD'), due_date: dueDate || null, currency, tax_rate: taxRate, notes: notes || null },
                lineItems,
            );
            onCreate(inv);
        } catch (e) {
            setError((e as Error).message ?? 'Failed to create invoice.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>New Invoice</DialogTitle>
            <DialogContent dividers>
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2} mb={3}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Client</InputLabel>
                        <Select label="Client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                            {clients.map((c) => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                        <InputLabel>Currency</InputLabel>
                        <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            {['EUR', 'USD', 'GBP', 'CHF'].map((c) => (
                                <MenuItem key={c} value={c}>{c}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField size="small" label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" label="Tax %" type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} inputProps={{ min: 0, max: 100, step: 1 }} />
                    <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} sx={{ gridColumn: { sm: '1 / -1' } }} />
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                    Billable Entries {loadingEntries && <CircularProgress size={12} sx={{ ml: 1 }} />}
                </Typography>

                {!canLoad && (
                    <Typography variant="body2" color="text.secondary">Select a client and date range to load entries.</Typography>
                )}

                {canLoad && !loadingEntries && entries.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No billable entries found.</Typography>
                )}

                {entries.length > 0 && (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Task</TableCell>
                                <TableCell>Project</TableCell>
                                <TableCell align="right">Hours</TableCell>
                                <TableCell align="right">Rate</TableCell>
                                <TableCell align="right">Amount</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lineItems.map((item, i) => (
                                <TableRow key={entries[i].id}>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{entries[i].task?.project?.name ?? '—'}</TableCell>
                                    <TableCell align="right">{item.quantity_hours.toFixed(2)}</TableCell>
                                    <TableCell align="right">{currency_symbol}{item.unit_price.toFixed(2)}</TableCell>
                                    <TableCell align="right">{currency_symbol}{(item.quantity_hours * item.unit_price).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {entries.length > 0 && (
                    <Box mt={2} display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                        <Typography variant="body2">Subtotal: <strong>{currency_symbol}{subtotal.toFixed(2)}</strong></Typography>
                        {taxRate > 0 && <Typography variant="body2">Tax ({taxRate}%): <strong>{currency_symbol}{tax.toFixed(2)}</strong></Typography>}
                        <Typography variant="body1" fontWeight="bold">Total: {currency_symbol}{total.toFixed(2)}</Typography>
                    </Box>
                )}

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleCreate} disabled={saving || loadingEntries}>
                    {saving ? <CircularProgress size={18} /> : 'Create Invoice'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Invoice List Page ───────────────────────────────────────────────────────

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
    const [menuInvoice, setMenuInvoice] = useState<Invoice | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([invoiceService.list(), clientService.getClientsLight()]).then(([invs, cls]) => {
            setInvoices(invs);
            setClients(cls);
            setLoading(false);
        });
    }, []);

    const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, inv: Invoice) => {
        setMenuAnchorEl(e.currentTarget);
        setMenuInvoice(inv);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setMenuInvoice(null);
    };

    const handleStatusChange = async (status: InvoiceStatus) => {
        if (!menuInvoice) return;
        handleMenuClose();
        await invoiceService.updateStatus(menuInvoice.id, status);
        setInvoices((prev) => prev.map((inv) => inv.id === menuInvoice.id ? { ...inv, status } : inv));
    };

    const handleDeleteClick = () => {
        if (!menuInvoice) return;
        setInvoiceToDelete(menuInvoice);
        setDeleteDialogOpen(true);
        handleMenuClose();
    };

    const handleConfirmDelete = async () => {
        if (!invoiceToDelete) return;
        await invoiceService.delete(invoiceToDelete.id);
        setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceToDelete.id));
        setDeleteDialogOpen(false);
        setInvoiceToDelete(null);
    };

    const handleDownloadPdf = async () => {
        if (!menuInvoice) return;
        const id = menuInvoice.id;
        handleMenuClose();
        setDownloadingId(id);
        try {
            const data = await invoiceService.getForPdf(id);
            const blob = await pdf(<InvoicePDF {...data} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.invoice.invoice_number}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleCreated = useCallback((inv: Invoice) => {
        setInvoices((prev) => [inv, ...prev]);
        setCreateOpen(false);
    }, []);

    const columns: Column<Invoice>[] = useMemo(() => [
        {
            field: 'invoice_number',
            label: 'Invoice #',
            render: (row) => <Typography fontWeight="medium" fontFamily="monospace">{row.invoice_number}</Typography>,
        },
        {
            field: 'client',
            label: 'Client',
            render: (row) => row.client?.name ?? '—',
        },
        {
            field: 'status',
            label: 'Status',
            render: (row) => (
                <Chip label={row.status} size="small" color={STATUS_COLORS[row.status]} sx={{ textTransform: 'capitalize' }} />
            ),
        },
        {
            field: 'issue_date',
            label: 'Issue Date',
            render: (row) => dayjs(row.issue_date).format('MMM D, YYYY'),
        },
        {
            field: 'due_date',
            label: 'Due Date',
            render: (row) => row.due_date ? dayjs(row.due_date).format('MMM D, YYYY') : '—',
        },
        {
            field: 'total',
            label: 'Total',
            render: (row) => {
                const subtotal = getInvoiceSubtotal(row);
                const total = getInvoiceTotal(row);
                const sym = row.currency === 'EUR' ? '€' : row.currency === 'USD' ? '$' : row.currency === 'GBP' ? '£' : row.currency;
                return (
                    <Typography fontWeight="medium">
                        {sym}{total.toFixed(2)}
                        {row.tax_rate > 0 && (
                            <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>
                                (excl. {sym}{subtotal.toFixed(2)})
                            </Typography>
                        )}
                    </Typography>
                );
            },
        },
    ], []);

    const rowActions = useCallback((inv: Invoice) => (
        downloadingId === inv.id
            ? <CircularProgress size={20} sx={{ mx: 1 }} />
            : <IconButton size="small" onClick={(e) => handleMenuOpen(e, inv)}>
                <MoreVert />
            </IconButton>
    ), [downloadingId]);

    return (
        <Box padding={3} height="100%" display="flex" flexDirection="column" borderRadius={2} boxShadow={4} bgcolor="background.default">
            <PageHeader title="Invoices" actionLabel="New Invoice" actionIcon={<Receipt />} onAction={() => setCreateOpen(true)} />

            <Divider sx={{ mb: 3 }} />

            <DataTable
                data={invoices}
                columns={columns}
                loading={loading}
                defaultSortField="issue_date"
                defaultSortOrder="desc"
                rowActions={rowActions}
                emptyMessage="No invoices yet"
                getRowId={(row) => row.id}
            />

            <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleDownloadPdf}>
                    <ListItemIcon><PictureAsPdf fontSize="small" /></ListItemIcon>
                    <ListItemText>Download PDF</ListItemText>
                </MenuItem>
                <Divider />
                {menuInvoice && STATUS_NEXT[menuInvoice.status].map((action) => (
                    <MenuItem key={action.value} onClick={() => handleStatusChange(action.value)}>
                        <ListItemIcon>{action.icon}</ListItemIcon>
                        <ListItemText>{action.label}</ListItemText>
                    </MenuItem>
                ))}
                {menuInvoice && STATUS_NEXT[menuInvoice.status].length > 0 && <Divider />}
                <MenuItem onClick={handleDeleteClick}>
                    <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>

            <CreateInvoiceDialog
                open={createOpen}
                clients={clients}
                onClose={() => setCreateOpen(false)}
                onCreate={handleCreated}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => { setDeleteDialogOpen(false); setInvoiceToDelete(null); }}
                onConfirm={handleConfirmDelete}
                title="Delete Invoice"
                message={`Delete invoice ${invoiceToDelete?.invoice_number}? This cannot be undone.`}
                confirmLabel="Delete"
            />
        </Box>
    );
}
