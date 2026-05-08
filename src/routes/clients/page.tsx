import { useMemo, useState } from 'react';
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
import { useCrudPage } from '../../hooks/useCrudPage';

interface TableRow {
    id: string;
    type: 'client' | 'project';
    client?: Client;
    project?: any;
    name: string;
    projectCount?: number;
    pinned?: boolean;
}

export default function ClientsPage() {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

    const crud = useCrudPage<Client>({
        queryKey: ['clients', 'with-projects'],
        fetcher: () => clientService.getClientsWithProjects(),
        entityLabel: 'client',
        entityLabelPlural: 'clients',
        getName: (c) => c.name,
        mutations: {
            create: (c) => clientService.createClient(c),
            update: (id, c) => clientService.updateClient({ ...c, id }),
            delete: (id) => clientService.deleteClient(id),
            restore: (id) => clientService.restoreClient(id),
            togglePin: (id, pinned) => clientService.togglePin(id, pinned),
            bulkSetPinned: (ids, pinned) => clientService.bulkSetPinned(ids, pinned),
            bulkDelete: (ids) => clientService.bulkDeleteClients(ids),
            bulkRestore: (ids) => clientService.bulkRestoreClients(ids),
        },
    });

    const toggleExpansion = (clientId: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(clientId)) next.delete(clientId);
            else next.add(clientId);
            return next;
        });
    };

    const filteredClients = useMemo(() => {
        if (!crud.searchQuery) return crud.items;
        const query = crud.searchQuery.toLowerCase();
        return crud.items.filter((client) => {
            if (client.name.toLowerCase().includes(query)) return true;
            if (client.projects?.some((project) => project.name.toLowerCase().includes(query))) return true;
            return false;
        });
    }, [crud.items, crud.searchQuery]);

    const tableRows = useMemo(() => {
        const rows: TableRow[] = [];
        filteredClients.forEach((client) => {
            if (!client.id) return;
            rows.push({
                id: client.id,
                type: 'client',
                client,
                name: client.name,
                projectCount: client.projects?.length ?? 0,
                pinned: client.pinned,
            });

            if (expandedIds.has(client.id) && client.projects) {
                client.projects.forEach((project) => {
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
    }, [filteredClients, expandedIds]);

    const columns: Column<TableRow>[] = useMemo(() => [
        {
            field: 'expand',
            label: '',
            sortable: false,
            render: (row) => {
                if (row.type === 'project') return null;
                const projectCount = row.projectCount || 0;
                if (projectCount === 0) return null;
                const isExpanded = row.client?.id ? expandedIds.has(row.client.id) : false;
                return (
                    <IconButton
                        size="small"
                        color="secondary"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpansion(row.id);
                        }}
                    >
                        {isExpanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
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
                        color={projectCount > 0 ? 'secondary' : 'default'}
                        variant={projectCount > 0 ? 'filled' : 'outlined'}
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
                return row.client?.pinned ? <PushPin color="secondary" fontSize="small" /> : null;
            },
            align: 'center',
        },
    ], [expandedIds]);

    const renderRowActions = (row: TableRow) => {
        if (row.type === 'project' || !row.client) return null;
        const client = row.client;
        return (
            <IconButton size="small" onClick={(e) => crud.openMenu(e, client)}>
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
                onAction={crud.openCreate}
            />

            <Divider sx={{ mb: 2 }} />

            <Box display="flex" gap={2} marginBottom={2} alignItems="center">
                <SearchBar
                    value={crud.searchQuery}
                    onChange={crud.setSearchQuery}
                    placeholder="Search clients or projects..."
                />
            </Box>

            <Divider sx={{ mb: 3 }} />

            <DataTable
                data={tableRows}
                columns={columns}
                loading={crud.isLoading}
                selectable
                selectedIds={crud.selectedIds}
                onSelectionChange={crud.setSelectedIds}
                rowActions={renderRowActions}
                emptyMessage={crud.searchQuery ? 'No clients or projects match your search' : 'No clients found'}
                getRowId={(row) => row.id}
                isRowSelectable={(row) => row.type === 'client'}
                defaultSortField="name"
                groupBy={(row) => row.type === 'client' ? row.id : row.client?.id}
                bulkActions={
                    <>
                        <Divider orientation="vertical" flexItem />
                        <IconButton
                            color="secondary"
                            onClick={() => crud.handleBulkPin(true)}
                            title="Pin selected"
                            size="small"
                        >
                            <PushPin />
                        </IconButton>
                        <IconButton
                            color="error"
                            onClick={crud.handleBulkDelete}
                            title="Delete selected"
                            size="small"
                        >
                            <Delete />
                        </IconButton>
                    </>
                }
            />

            <Menu
                anchorEl={crud.menuAnchorEl}
                open={Boolean(crud.menuAnchorEl)}
                onClose={crud.closeMenu}
            >
                <MenuItem onClick={crud.handleEditFromMenu}>
                    <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={crud.handleTogglePinFromMenu}>
                    <ListItemIcon>
                        {crud.menuItem?.pinned ? <PushPinOutlined fontSize="small" /> : <PushPin fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{crud.menuItem?.pinned ? 'Unpin' : 'Pin'}</ListItemText>
                </MenuItem>
                <MenuItem onClick={crud.handleDeleteFromMenu}>
                    <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText color="error.main">Delete</ListItemText>
                </MenuItem>
            </Menu>

            <ConfirmDialog
                open={crud.deleteDialogOpen}
                onClose={crud.closeDeleteDialog}
                onConfirm={crud.handleConfirmDelete}
                title="Delete Client"
                message={`Are you sure you want to delete "${crud.itemToDelete?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
            />

            <ClientDialog
                open={crud.dialogOpen}
                onClose={crud.closeDialog}
                onSave={crud.handleSave}
                client={crud.editingItem}
            />
        </Box>
    );
}
