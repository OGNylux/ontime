import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    Checkbox,
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
    MergeType,
    Visibility,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { invoiceService, Invoice, InvoiceStatus, InvoicePdfData } from '../../services/invoiceService';
import { clientService, Client } from '../../services/clientService';
import { CalendarEntry } from '../../services/calendarService';
import { InvoicePDF } from './InvoicePDF';
import { DataTable, Column } from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/Forms/ConfirmDialog';
import { useSnackbar } from '../../hooks/useSnackbar';

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

function PdfPreviewDialog({
    open,
    onClose,
    data,
    loading,
    onDownload,
}: {
    open: boolean;
    onClose: () => void;
    data: InvoicePdfData | null;
    loading?: boolean;
    onDownload?: () => void;
}) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{ sx: { height: '90vh', display: 'flex', flexDirection: 'column' } }}
        >
            <DialogTitle>PDF Preview</DialogTitle>
            <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden' }}>
                {loading ? (
                    <Box height="100%" display="flex" alignItems="center" justifyContent="center">
                        <CircularProgress />
                    </Box>
                ) : data ? (
                    <Box sx={{ width: '100%', height: '100%' }}>
                        <PDFViewer width="100%" height="100%">
                            <InvoicePDF {...data} />
                        </PDFViewer>
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                {onDownload && (
                    <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={onDownload}>
                        Download
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

interface EditableLineItem {
    localId: string;
    calendar_entry_ids: string[];
    description: string;
    date: string;
    quantity_hours: number;
    unit_price: number;
    project_name: string | null;
}

interface CreateDialogProps {
    open: boolean;
    clients: Client[];
    invoices: Invoice[];
    onClose: () => void;
    onCreate: (invoice: Invoice) => void;
}

function CreateInvoiceDialog({ open, clients, invoices, onClose, onCreate }: CreateDialogProps) {
    const [clientId, setClientId] = useState('');
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
    const [currency, setCurrency] = useState('EUR');
    const [taxRate, setTaxRate] = useState(0);
    const [dueDate, setDueDate] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));
    const [notes, setNotes] = useState('');

    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [editableItems, setEditableItems] = useState<EditableLineItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState<InvoicePdfData | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const canLoad = Boolean(clientId && dateFrom && dateTo);

    useEffect(() => {
        if (!open) return;
        setClientId('');
        setDateFrom(dayjs().startOf('month').format('YYYY-MM-DD'));
        setDateTo(dayjs().format('YYYY-MM-DD'));
        setCurrency('EUR');
        setTaxRate(0);
        setDueDate(dayjs().add(30, 'day').format('YYYY-MM-DD'));
        setNotes('');
        setEntries([]);
        setEditableItems([]);
        setSelectedIds(new Set());
        setError('');
        setPreviewData(null);
        setPreviewOpen(false);
    }, [open]);

    useEffect(() => {
        if (!clientId) return;
        const lastInvoice = invoices
            .filter((inv) => inv.client_id === clientId && inv.line_items && inv.line_items.length > 0)
            .sort((a, b) => dayjs(b.issue_date).diff(dayjs(a.issue_date)))[0];
        if (!lastInvoice) return;
        const dates = (lastInvoice.line_items ?? []).map((li) => li.date).filter(Boolean).sort();
        if (dates.length > 0) {
            setDateFrom(dayjs(dates[dates.length - 1]).add(1, 'day').format('YYYY-MM-DD'));
        }
    }, [clientId, invoices]);

    useEffect(() => {
        if (!canLoad) { setEntries([]); return; }
        let cancelled = false;
        setLoadingEntries(true);
        setError('');
        invoiceService.getBillableEntries(clientId, dateFrom, dateTo)
            .then((data) => {
                if (!cancelled) { setEntries(data); setLoadingEntries(false); }
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Failed to load billable entries:', err);
                setError(err instanceof Error ? err.message : 'Failed to load billable entries.');
                setLoadingEntries(false);
            });
        return () => { cancelled = true; };
    }, [clientId, dateFrom, dateTo, canLoad]);

    useEffect(() => {
        setEditableItems(entries.map((e) => ({
            localId: e.id,
            calendar_entry_ids: [e.id],
            description: e.task?.name ?? 'No task',
            date: dayjs(e.start_time).format('YYYY-MM-DD'),
            quantity_hours: Math.round(durationHours(e) * 100) / 100,
            unit_price: e.task?.project?.hourly_rate ?? 0,
            project_name: e.task?.project?.name ?? null,
        })));
        setSelectedIds(new Set());
    }, [entries]);

    const handleDeleteItem = (localId: string) => {
        setEditableItems((prev) => prev.filter((item) => item.localId !== localId));
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(localId); return next; });
    };

    const handleToggleSelect = (localId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(localId)) next.delete(localId); else next.add(localId);
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? new Set(editableItems.map((i) => i.localId)) : new Set());
    };

    const handleCombineSelected = () => {
        const sel = editableItems.filter((item) => selectedIds.has(item.localId));
        if (sel.length < 2) return;
        const combined: EditableLineItem = {
            localId: sel[0].localId,
            calendar_entry_ids: sel.flatMap((item) => item.calendar_entry_ids),
            description: sel[0].description,
            date: sel.reduce((min, item) => (item.date < min ? item.date : min), sel[0].date),
            quantity_hours: Math.round(sel.reduce((sum, item) => sum + item.quantity_hours, 0) * 100) / 100,
            unit_price: sel[0].unit_price,
            project_name: sel[0].project_name,
        };
        setEditableItems((prev) =>
            prev.reduce<EditableLineItem[]>((acc, item) => {
                if (!selectedIds.has(item.localId)) return [...acc, item];
                if (item.localId === combined.localId) return [...acc, combined];
                return acc;
            }, []),
        );
        setSelectedIds(new Set());
    };

    const handleUpdateDescription = (localId: string, description: string) => {
        setEditableItems((prev) => prev.map((item) => item.localId === localId ? { ...item, description } : item));
    };

    const subtotal = editableItems.reduce((s, i) => s + i.quantity_hours * i.unit_price, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    const currency_symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency;

    const allSelected = editableItems.length > 0 && selectedIds.size === editableItems.length;
    const someSelected = selectedIds.size > 0 && !allSelected;

    const handlePreview = async () => {
        if (!clientId || editableItems.length === 0) return;
        setPreviewLoading(true);
        setPreviewOpen(true);
        try {
            const { clientInfo, billing } = await invoiceService.getPreviewData(clientId);
            setPreviewData({
                invoice: {
                    invoice_number: 'PREVIEW',
                    client_id: clientId,
                    issue_date: dayjs().format('YYYY-MM-DD'),
                    due_date: dueDate || null,
                    currency,
                    tax_rate: taxRate,
                    notes: notes || null,
                    status: 'draft',
                    line_items: editableItems.map((item) => ({
                        calendar_entry_id: item.calendar_entry_ids[0],
                        description: item.description,
                        date: item.date,
                        quantity_hours: item.quantity_hours,
                        unit_price: item.unit_price,
                        project_name: item.project_name,
                    })),
                } as Invoice,
                clientInfo,
                billing,
            });
        } catch (err) {
            console.error('Failed to load preview data:', err);
            setPreviewOpen(false);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!clientId) { setError('Please select a client.'); return; }
        if (editableItems.length === 0) { setError('No billable entries found for the selected client and date range.'); return; }
        setSaving(true);
        setError('');
        try {
            const lineItemsToCreate = editableItems.map((item) => ({
                calendar_entry_id: item.calendar_entry_ids[0],
                description: item.description,
                date: item.date,
                quantity_hours: item.quantity_hours,
                unit_price: item.unit_price,
                project_name: item.project_name,
            }));
            const inv = await invoiceService.create(
                { client_id: clientId, issue_date: dayjs().format('YYYY-MM-DD'), due_date: dueDate || null, currency, tax_rate: taxRate, notes: notes || null },
                lineItemsToCreate,
            );
            onCreate(inv);
        } catch (e) {
            console.error('Failed to create invoice:', e);
            setError(e instanceof Error ? e.message : 'Failed to create invoice.');
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

                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2" fontWeight="bold">
                        Billable Entries {loadingEntries && <CircularProgress size={12} sx={{ ml: 1 }} />}
                    </Typography>
                    {selectedIds.size >= 2 && (
                        <Button size="small" variant="outlined" startIcon={<MergeType />} onClick={handleCombineSelected}>
                            Combine {selectedIds.size} entries
                        </Button>
                    )}
                </Box>

                {!canLoad && (
                    <Typography variant="body2" color="text.secondary">Select a client and date range to load entries.</Typography>
                )}

                {canLoad && !loadingEntries && entries.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No billable entries found.</Typography>
                )}

                {editableItems.length > 0 && (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={allSelected}
                                        indeterminate={someSelected}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Task</TableCell>
                                <TableCell>Project</TableCell>
                                <TableCell align="right">Hours</TableCell>
                                <TableCell align="right">Rate</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell padding="checkbox" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {editableItems.map((item) => (
                                <TableRow key={item.localId} selected={selectedIds.has(item.localId)}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            size="small"
                                            checked={selectedIds.has(item.localId)}
                                            onChange={() => handleToggleSelect(item.localId)}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.date}</TableCell>
                                    <TableCell>
                                        <TextField
                                            variant="standard"
                                            size="small"
                                            value={item.description}
                                            onChange={(e) => handleUpdateDescription(item.localId, e.target.value)}
                                            sx={{ minWidth: 120 }}
                                        />
                                    </TableCell>
                                    <TableCell>{item.project_name ?? '—'}</TableCell>
                                    <TableCell align="right">{item.quantity_hours.toFixed(2)}</TableCell>
                                    <TableCell align="right">{currency_symbol}{item.unit_price.toFixed(2)}</TableCell>
                                    <TableCell align="right">{currency_symbol}{(item.quantity_hours * item.unit_price).toFixed(2)}</TableCell>
                                    <TableCell padding="checkbox">
                                        <IconButton size="small" onClick={() => handleDeleteItem(item.localId)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {editableItems.length > 0 && (
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
                <Button
                    startIcon={<Visibility />}
                    onClick={handlePreview}
                    disabled={!clientId || editableItems.length === 0 || loadingEntries}
                >
                    Preview
                </Button>
                <Button variant="contained" onClick={handleCreate} disabled={saving || loadingEntries}>
                    {saving ? <CircularProgress size={18} /> : 'Create Invoice'}
                </Button>
            </DialogActions>

            <PdfPreviewDialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                data={previewData}
                loading={previewLoading}
            />
        </Dialog>
    );
}

// ─── Invoice List Page ───────────────────────────────────────────────────────

const errorMessage = (err: unknown, fallback: string): string =>
    err instanceof Error ? err.message : fallback;

const INVOICES_QUERY_KEY = ['invoices'] as const;

export default function InvoicesPage() {
    const { showWithAction, showError } = useSnackbar();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
    const [menuInvoice, setMenuInvoice] = useState<Invoice | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewPdfData, setPreviewPdfData] = useState<InvoicePdfData | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useQuery({
        queryKey: INVOICES_QUERY_KEY,
        queryFn: () => invoiceService.list(),
    });
    const { data: clients = [], isLoading: clientsLoading } = useQuery({
        queryKey: ['clients', 'light'],
        queryFn: () => clientService.getClientsLight(),
    });
    const loading = invoicesLoading || clientsLoading;

    useEffect(() => {
        if (invoicesError) {
            console.error('Failed to load invoices:', invoicesError);
            setError(errorMessage(invoicesError, 'Failed to load invoices'));
        }
    }, [invoicesError]);

    const setInvoices = useCallback(
        (updater: (prev: Invoice[]) => Invoice[]) => {
            queryClient.setQueryData<Invoice[]>(INVOICES_QUERY_KEY, (prev) => updater(prev ?? []));
        },
        [queryClient],
    );

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
        const target = menuInvoice;
        const previousStatus = target.status;
        handleMenuClose();
        try {
            await invoiceService.updateStatus(target.id, status);
            setInvoices((prev) => prev.map((inv) => inv.id === target.id ? { ...inv, status } : inv));
            showWithAction(
                `Invoice ${target.invoice_number} marked as ${status}`,
                {
                    label: 'Undo',
                    onClick: async () => {
                        try {
                            await invoiceService.updateStatus(target.id, previousStatus);
                            setInvoices((prev) => prev.map((inv) => inv.id === target.id ? { ...inv, status: previousStatus } : inv));
                        } catch (err) {
                            console.error('Failed to revert invoice status:', err);
                            showError('Failed to revert invoice status', err instanceof Error ? err.message : undefined);
                        }
                    },
                },
                { severity: 'info' },
            );
        } catch (err) {
            console.error('Failed to update invoice status:', err);
            setError(errorMessage(err, 'Failed to update invoice status'));
        }
    };

    const handleDeleteClick = () => {
        if (!menuInvoice) return;
        setInvoiceToDelete(menuInvoice);
        setDeleteDialogOpen(true);
        handleMenuClose();
    };

    const handleConfirmDelete = async () => {
        if (!invoiceToDelete) return;
        const target = invoiceToDelete;
        setDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        try {
            await invoiceService.delete(target.id);
            setInvoices((prev) => prev.filter((inv) => inv.id !== target.id));
        } catch (err) {
            console.error('Failed to delete invoice:', err);
            setError(errorMessage(err, 'Failed to delete invoice'));
        }
    };

    const handlePreviewPdf = async () => {
        if (!menuInvoice) return;
        const id = menuInvoice.id;
        handleMenuClose();
        setPreviewPdfData(null);
        setPreviewLoading(true);
        setPreviewOpen(true);
        try {
            const data = await invoiceService.getForPdf(id);
            setPreviewPdfData(data);
        } catch (err) {
            console.error('Failed to load invoice PDF data:', err);
            setPreviewOpen(false);
            setError(errorMessage(err, 'Failed to load invoice preview'));
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleDownloadFromPreview = async () => {
        if (!previewPdfData) return;
        try {
            const blob = await pdf(<InvoicePDF {...previewPdfData} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${previewPdfData.invoice.invoice_number}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download invoice PDF:', err);
            setError(errorMessage(err, 'Failed to download invoice PDF'));
        }
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
        } catch (err) {
            console.error('Failed to download invoice PDF:', err);
            setError(errorMessage(err, 'Failed to download invoice PDF'));
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

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

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
                <MenuItem onClick={handlePreviewPdf}>
                    <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
                    <ListItemText>Preview PDF</ListItemText>
                </MenuItem>
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
                invoices={invoices}
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

            <PdfPreviewDialog
                open={previewOpen}
                onClose={() => { setPreviewOpen(false); setPreviewPdfData(null); }}
                data={previewPdfData}
                loading={previewLoading}
                onDownload={previewPdfData ? handleDownloadFromPreview : undefined}
            />
        </Box>
    );
}
