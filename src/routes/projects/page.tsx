import React, { useMemo } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Divider,
} from '@mui/material';
import {
    MoreVert,
    Edit,
    Delete,
    PushPin,
    PushPinOutlined,
    FilterList,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { projectService, Project } from '../../services/projectService';
import { clientService } from '../../services/clientService';
import { DataTable, Column } from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/Forms/SearchBar';
import ConfirmDialog from '../../components/Forms/ConfirmDialog';
import ProjectDialog from '../../components/ProjectDialog';
import dayjs from 'dayjs';
import { formatDuration } from '../../components/NewCalendar/layout/timeUtils';
import { useCrudPage } from '../../hooks/useCrudPage';

const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('MMM D');
};

export default function ProjectsPage() {
    const [clientFilter, setClientFilter] = React.useState('');
    const [filterAnchorEl, setFilterAnchorEl] = React.useState<null | HTMLElement>(null);

    const { data: clients = [] } = useQuery({
        queryKey: ['clients', 'light'],
        queryFn: () => clientService.getClientsLight(),
    });

    const crud = useCrudPage<Project>({
        queryKey: ['projects', 'with-totals'],
        fetcher: () => projectService.getProjectsWithTotals(),
        entityLabel: 'project',
        entityLabelPlural: 'projects',
        getName: (p) => p.name,
        // togglePin / update return a project without joined entries; preserve total_time.
        mergeOnUpdate: (current, next) => ({ ...next, total_time: current.total_time }),
        decorateNew: (p) => ({ ...p, total_time: 0 }),
        mutations: {
            create: (p) => projectService.createProject(p),
            update: (id, p) => projectService.updateProject(id, p),
            delete: (id) => projectService.deleteProject(id),
            restore: (id) => projectService.restoreProject(id),
            togglePin: (id, pinned) => projectService.togglePin(id, pinned),
            bulkSetPinned: (ids, pinned) => projectService.bulkSetPinned(ids, pinned),
            bulkDelete: (ids) => projectService.bulkDeleteProjects(ids),
            bulkRestore: (ids) => projectService.bulkRestoreProjects(ids),
        },
    });

    const filteredProjects = useMemo(() => {
        const query = crud.searchQuery.toLowerCase();
        return crud.items
            .filter((project) => {
                const matchesSearch =
                    project.name.toLowerCase().includes(query) ||
                    (project.client?.name?.toLowerCase().includes(query) ?? false);
                const matchesClient = !clientFilter || project.client_id === clientFilter;
                return matchesSearch && matchesClient;
            })
            .sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0;
            });
    }, [crud.items, crud.searchQuery, clientFilter]);

    const columns: Column<Project>[] = useMemo(() => [
        {
            field: 'name',
            label: 'Project',
            render: (row) => <Typography fontWeight="medium">{row.name}</Typography>,
        },
        {
            field: 'client',
            label: 'Client',
            render: (row) => row.client?.name || '-',
        },
        {
            field: 'start_date',
            label: 'Start Date',
            render: (row) => formatDate(row.start_date),
        },
        {
            field: 'total_time',
            label: 'Total Time',
            render: (row) => formatDuration((row.total_time ?? 0) * 60),
        },
        {
            field: 'pinned',
            label: 'Pinned',
            sortable: false,
            render: (row) =>
                row.pinned ? <PushPin color="secondary" fontSize="small" /> : null,
            align: 'center',
        },
    ], []);

    const renderRowActions = (project: Project) => (
        <IconButton size="small" onClick={(e) => crud.openMenu(e, project)}>
            <MoreVert />
        </IconButton>
    );

    return (
        <Box padding={3} height="100%" display="flex" flexDirection="column" borderRadius={2} boxShadow={4} bgcolor="background.default">
            <PageHeader title="Projects" actionLabel="New Project" onAction={crud.openCreate} />

            <Divider sx={{ mb: 2 }} />

            <Box display="flex" gap={2} marginBottom={2} alignItems="center">
                <SearchBar
                    value={crud.searchQuery}
                    onChange={crud.setSearchQuery}
                    placeholder="Search for Projects..."
                />
                <IconButton
                    onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                    color={clientFilter ? 'primary' : 'default'}
                >
                    <FilterList />
                </IconButton>
                {clientFilter && (
                    <Chip
                        label={`Client: ${clients.find((c) => c.id === clientFilter)?.name}`}
                        onDelete={() => setClientFilter('')}
                        size="small"
                    />
                )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            <DataTable
                data={filteredProjects}
                columns={columns}
                loading={crud.isLoading}
                selectable
                selectedIds={crud.selectedIds}
                onSelectionChange={crud.setSelectedIds}
                defaultSortField="name"
                rowActions={renderRowActions}
                emptyMessage="No projects found"
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
                anchorEl={filterAnchorEl}
                open={Boolean(filterAnchorEl)}
                onClose={() => setFilterAnchorEl(null)}
            >
                <MenuItem disabled>
                    <ListItemText>Filter by Client</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => { setClientFilter(''); setFilterAnchorEl(null); }}
                    selected={!clientFilter}
                >
                    All Clients
                </MenuItem>
                {clients.map((client) => (
                    <MenuItem
                        key={client.id}
                        onClick={() => { setClientFilter(client.id || ''); setFilterAnchorEl(null); }}
                        selected={clientFilter === client.id}
                    >
                        {client.name}
                    </MenuItem>
                ))}
            </Menu>

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

            <ProjectDialog
                open={crud.dialogOpen}
                onClose={crud.closeDialog}
                onSave={crud.handleSave}
                project={crud.editingItem}
                clients={clients}
            />

            <ConfirmDialog
                open={crud.deleteDialogOpen}
                onClose={crud.closeDeleteDialog}
                onConfirm={crud.handleConfirmDelete}
                title="Delete Project"
                message={`Are you sure you want to delete "${crud.itemToDelete?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
            />
        </Box>
    );
}
