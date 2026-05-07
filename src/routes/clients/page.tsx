import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Chip,
    Divider,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import { useSnackbar } from '../../hooks/useSnackbar';
import {
    KeyboardArrowDown,
    KeyboardArrowRight,
    MoreVert,
    Edit,
    Delete,
    PushPin,
    PushPinOutlined,
} from '@mui/icons-material';
import { clientService, Client } from '../../services/clientService';
import { DataTable, Column } from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/Forms/SearchBar';
import ConfirmDialog from '../../components/Forms/ConfirmDialog';
import ClientDialog from '../../components/ClientDialog';
import { useEntityListState } from '../../hooks/useEntityListState';

interface ClientWithExpansion extends Client {
    _expanded?: boolean;
}

interface TableRow {
    id: string;
    type: 'client' | 'project';
    client?: ClientWithExpansion;
    project?: any;
    name: string;
    projectCount?: number;
    pinned?: boolean;
}

export default function ClientsPage() {
    const { showError, showWithAction } = useSnackbar();
    const [clients, setClients] = useState<ClientWithExpansion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [menuClient, setMenuClient] = useState<Client | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [clientDialogOpen, setClientDialogOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

    const { replaceOne, prependOne, removeOne, removeMany } = useEntityListState(setClients);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const clientsData = await clientService.getClientsWithProjects();
            setClients(clientsData.map(c => ({ ...c, _expanded: false })));
        } catch (err) {
            console.error('Failed to load clients:', err);
            showError('Failed to load clients', err instanceof Error ? err.message : undefined);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = useMemo(() => {
        const filtered = searchQuery
            ? clients.filter((client) => {
                const query = searchQuery.toLowerCase();
                if (client.name.toLowerCase().includes(query)) {
                    return true;
                }
                if (client.projects?.some(project =>
                    project.name.toLowerCase().includes(query)
                )) {
                    return true;
                }
                return false;
            })
            : clients;

        return filtered;
    }, [clients, searchQuery]);

    const toggleExpansion = (clientId: string) => {
        setClients(prev => prev.map(c =>
            c.id === clientId ? { ...c, _expanded: !c._expanded } : c
        ));
    };

    const tableRows = useMemo(() => {
        const rows: TableRow[] = [];

        filteredClients.forEach(client => {
            if (!client.id) return;
            rows.push({
                id: client.id,
                type: 'client',
                client,
                name: client.name,
                projectCount: client.projects?.length ?? 0,
                pinned: client.pinned,
            });

            if (client._expanded && client.projects) {
                client.projects.forEach(project => {
                    rows.push({
                        id: `${client.id}-${project.id}`,
                        type: 'project',
                        project,
                        client,
                        name: project.name,
                    });
                });
            }
        });

        return rows;
    }, [filteredClients]);

    const columns: Column<TableRow>[] = useMemo(() => [
        {
            field: 'expand',
            label: '',
            sortable: false,
            render: (row) => {
                if (row.type === 'project') return null;
                const projectCount = row.projectCount || 0;
                if (projectCount === 0) return null;
                return (
                    <IconButton
                        size="small"
                        color="secondary"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpansion(row.id);
                        }}
                    >
                        {row.client?._expanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                    </IconButton>
                );
            },
        },
        {
            field: 'name',
            label: 'Client Name',
            render: (row) => (
                <Box
                    onClick={() => {
                        if (row.type === 'client' && row.projectCount && row.projectCount > 0) {
                            toggleExpansion(row.id);
                        }
                    }}
                    sx={{
                        cursor: (row.type === 'client' && row.projectCount) ? 'pointer' : row.type === 'project' ? 'pointer' : 'default',
                        pl: row.type === 'project' ? 6 : 0,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {row.type === 'project' && (
                        <Box
                            width={8}
                            height={8}
                            borderRadius="50%"
                            bgcolor={row.project?.color ? `hsl(${row.project.color}, 70%, 50%)` : 'primary.main'}
                            mr={1.5}
                            flexShrink={0}
                        />
                    )}
                    <Typography
                        fontWeight={row.type === 'client' ? 'medium' : 'normal'}
                        color={row.type === 'project' ? 'text.secondary' : 'text.primary'}
                    >
                        {row.name}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'projectCount',
            label: 'Projects',
            align: 'center',
            render: (row) => {
                if (row.type === 'project') return null;
                const projectCount = row.projectCount || 0;
                return (
                    <Chip
                        label={projectCount}
                        size="small"
                        color={projectCount > 0 ? "secondary" : "default"}
                        variant={projectCount > 0 ? "filled" : "outlined"}
                    />
                );
            },
        },
        {
            field: 'pinned',
            label: 'Pinned',
            sortable: false,
            render: (row) => {
                if (row.type === 'project') return null;
                return row.client?.pinned ? (
                    <PushPin color="secondary" fontSize="small" />
                ) : null;
            },
            align: 'center',
        },
    ], []);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: Client) => {
        setMenuAnchorEl(event.currentTarget);
        setMenuClient(client);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setMenuClient(null);
    };

    const handleEdit = () => {
        if (menuClient) {
            setClientToEdit(menuClient);
            setClientDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleDelete = () => {
        if (menuClient) {
            setClientToDelete(menuClient);
            setDeleteDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleTogglePin = async () => {
        if (menuClient && menuClient.id) {
            try {
                const updated = await clientService.togglePin(menuClient.id, !menuClient.pinned);
                replaceOne(updated as ClientWithExpansion, (current, next) => ({ ...next, _expanded: current._expanded }));
            } catch (err) {
                console.error('Failed to toggle pin:', err);
                showError('Failed to toggle pin', err instanceof Error ? err.message : undefined);
            }
        }
        handleMenuClose();
    };

    const handleBulkDelete = async () => {
        const idsToDelete = [...selectedIds];
        try {
            await clientService.bulkDeleteClients(idsToDelete);
            removeMany(idsToDelete);
            setSelectedIds([]);
            showWithAction(
                `Deleted ${idsToDelete.length} client${idsToDelete.length === 1 ? '' : 's'}`,
                {
                    label: 'Undo',
                    onClick: async () => {
                        try {
                            await clientService.bulkRestoreClients(idsToDelete);
                            const restored = await clientService.getClientsWithProjects();
                            setClients(restored.map(c => ({ ...c, _expanded: false })));
                        } catch (err) {
                            console.error('Failed to restore clients:', err);
                            showError('Failed to restore clients', err instanceof Error ? err.message : undefined);
                        }
                    },
                },
                { severity: 'info' },
            );
        } catch (err) {
            console.error('Failed to delete clients:', err);
            showError('Failed to delete clients', err instanceof Error ? err.message : undefined);
        }
    };

    const handleBulkPin = async (pinned: boolean) => {
        try {
            await clientService.bulkSetPinned(selectedIds, pinned);
            const updatedClients = await clientService.getClientsWithProjects();
            setClients(updatedClients.map(c => ({ ...c, _expanded: false })));
            setSelectedIds([]);
        } catch (err) {
            console.error('Failed to pin clients:', err);
            showError('Failed to pin clients', err instanceof Error ? err.message : undefined);
        }
    };

    const handleConfirmDelete = async () => {
        if (clientToDelete && clientToDelete.id) {
            const target = clientToDelete;
            try {
                await clientService.deleteClient(target.id!);
                removeOne(target.id!);
                showWithAction(
                    `Deleted "${target.name}"`,
                    {
                        label: 'Undo',
                        onClick: async () => {
                            try {
                                const restored = await clientService.restoreClient(target.id!);
                                prependOne({ ...(restored as ClientWithExpansion), _expanded: false });
                            } catch (err) {
                                console.error('Failed to restore client:', err);
                                showError('Failed to restore client', err instanceof Error ? err.message : undefined);
                            }
                        },
                    },
                    { severity: 'info' },
                );
            } catch (err) {
                console.error('Failed to delete client:', err);
                showError('Failed to delete client', err instanceof Error ? err.message : undefined);
            }
        }
        setDeleteDialogOpen(false);
        setClientToDelete(null);
    };

    const handleOpenNewClient = () => {
        setClientToEdit(null);
        setClientDialogOpen(true);
    };

    const handleSaveClient = async (client: Client) => {
        try {
            if (clientToEdit && clientToEdit.id) {
                const previous = clientToEdit;
                const updated = await clientService.updateClient({ ...client, id: previous.id });
                replaceOne(updated as ClientWithExpansion, (current, next) => ({ ...next, _expanded: current._expanded }));
                showWithAction(
                    `Updated "${updated.name}"`,
                    {
                        label: 'Undo',
                        onClick: async () => {
                            try {
                                const reverted = await clientService.updateClient(previous);
                                replaceOne(reverted as ClientWithExpansion, (current, next) => ({ ...next, _expanded: current._expanded }));
                            } catch (err) {
                                console.error('Failed to revert client:', err);
                                showError('Failed to revert client', err instanceof Error ? err.message : undefined);
                            }
                        },
                    },
                    { severity: 'info' },
                );
            } else {
                const created = await clientService.createClient(client);
                prependOne({ ...created, _expanded: false });
            }
        } catch (err) {
            console.error('Failed to save client:', err);
            showError('Failed to save client', err instanceof Error ? err.message : undefined);
            throw err;
        }
    };

    const renderRowActions = (row: TableRow) => {
        if (row.type === 'project' || !row.client) return null;
        const client = row.client;
        return (
            <IconButton size="small" onClick={(e) => handleMenuOpen(e, client)}>
                <MoreVert />
            </IconButton>
        );
    };

    return (
        <Box
            padding={3}
            height="100%"
            display="flex"
            flexDirection="column"
            borderRadius={2}
            boxShadow={4}
            bgcolor="background.default"
        >
            <PageHeader
                title="Clients"
                actionLabel="New Client"
                onAction={handleOpenNewClient}
            />

            <Divider sx={{ mb: 2 }} />

            <Box display="flex" gap={2} marginBottom={2} alignItems="center">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search clients or projects..."
                />
            </Box>

            <Divider sx={{ mb: 3 }} />

            <DataTable
                data={tableRows}
                columns={columns}
                loading={loading}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                rowActions={renderRowActions}
                emptyMessage={searchQuery ? 'No clients or projects match your search' : 'No clients found'}
                getRowId={(row) => row.id}
                isRowSelectable={(row) => row.type === 'client'}
                defaultSortField="name"
                groupBy={(row) => row.type === 'client' ? row.id : row.client?.id}
                bulkActions={
                    <>
                        <Divider orientation="vertical" flexItem />
                        <IconButton
                            color="secondary"
                            onClick={() => handleBulkPin(true)}
                            title="Pin selected"
                            size="small"
                        >
                            <PushPin />
                        </IconButton>
                        <IconButton
                            color="error"
                            onClick={handleBulkDelete}
                            title="Delete selected"
                            size="small"
                        >
                            <Delete />
                        </IconButton>
                    </>
                }
            />

            <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleEdit}>
                    <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleTogglePin}>
                    <ListItemIcon>
                        {menuClient?.pinned ? <PushPinOutlined fontSize="small" /> : <PushPin fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{menuClient?.pinned ? 'Unpin' : 'Pin'}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete}>
                    <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText color="error.main">Delete</ListItemText>
                </MenuItem>
            </Menu>

            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setClientToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Client"
                message={`Are you sure you want to delete "${clientToDelete?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
            />

            <ClientDialog
                open={clientDialogOpen}
                onClose={() => {
                    setClientDialogOpen(false);
                    setClientToEdit(null);
                }}
                onSave={handleSaveClient}
                client={clientToEdit}
            />
        </Box>
    );
}
