import React, { useState, useEffect, useMemo } from 'react';
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
import { useSnackbar } from '../../hooks/useSnackbar';
import {
    MoreVert,
    Edit,
    Delete,
    PushPin,
    PushPinOutlined,
    FilterList,
} from '@mui/icons-material';
import { projectService, Project } from '../../services/projectService';
import { clientService, Client } from '../../services/clientService';
import { DataTable, Column } from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/Forms/SearchBar';
import ConfirmDialog from '../../components/Forms/ConfirmDialog';
import ProjectDialog from '../../components/ProjectDialog';
import dayjs from 'dayjs';
import { formatDuration } from '../../components/NewCalendar/layout/timeUtils';
import { useEntityListState } from '../../hooks/useEntityListState';


const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('MMM D');
};

export default function ProjectsPage() {
    const { showError, showWithAction } = useSnackbar();
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [menuProject, setMenuProject] = useState<Project | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    const [clientFilter, setClientFilter] = useState('');
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

    const { replaceOne, prependOne, removeOne, removeMany } = useEntityListState(setProjects);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [projectsData, clientsData] = await Promise.all([
                projectService.getProjectsWithTotals(),
                clientService.getClientsLight(),
            ]);
            setProjects(projectsData);
            setClients(clientsData);
        } catch (err) {
            console.error('Failed to load projects:', err);
            showError('Failed to load projects', err instanceof Error ? err.message : undefined);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return projects
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
    }, [projects, searchQuery, clientFilter]);

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
                row.pinned ? (
                    <PushPin color="secondary" fontSize="small" />
                ) : null,
            align: 'center',
        },
    ], []);

        const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
        setMenuAnchorEl(event.currentTarget);
        setMenuProject(project);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setMenuProject(null);
    };

    const handleEdit = () => {
        if (menuProject) {
            setEditingProject(menuProject);
            setDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleDelete = () => {
        if (menuProject) {
            setProjectToDelete(menuProject);
            setDeleteDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleTogglePin = async () => {
        if (menuProject?.id) {
            try {
                const updated = await projectService.togglePin(menuProject.id, !menuProject.pinned);
                replaceOne(updated, (current, next) => ({ ...next, total_time: current.total_time }));
            } catch (err) {
                console.error('Failed to toggle pin:', err);
                showError('Failed to toggle pin', err instanceof Error ? err.message : undefined);
            }
        }
        handleMenuClose();
    };

    const handleConfirmDelete = async () => {
        if (projectToDelete?.id) {
            const target = projectToDelete;
            try {
                await projectService.deleteProject(target.id!);
                removeOne(target.id!);
                showWithAction(
                    `Deleted "${target.name}"`,
                    {
                        label: 'Undo',
                        onClick: async () => {
                            try {
                                const restored = await projectService.restoreProject(target.id!);
                                prependOne({ ...restored, total_time: target.total_time ?? 0 });
                            } catch (err) {
                                console.error('Failed to restore project:', err);
                                showError('Failed to restore project', err instanceof Error ? err.message : undefined);
                            }
                        },
                    },
                    { severity: 'info' },
                );
            } catch (err) {
                console.error('Failed to delete project:', err);
                showError('Failed to delete project', err instanceof Error ? err.message : undefined);
            }
        }
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
    };

    const handleBulkDelete = async () => {
        const idsToDelete = [...selectedIds];
        try {
            await projectService.bulkDeleteProjects(idsToDelete);
            removeMany(idsToDelete);
            setSelectedIds([]);
            showWithAction(
                `Deleted ${idsToDelete.length} project${idsToDelete.length === 1 ? '' : 's'}`,
                {
                    label: 'Undo',
                    onClick: async () => {
                        try {
                            await projectService.bulkRestoreProjects(idsToDelete);
                            const restored = await projectService.getProjectsWithTotals();
                            setProjects(restored);
                        } catch (err) {
                            console.error('Failed to restore projects:', err);
                            showError('Failed to restore projects', err instanceof Error ? err.message : undefined);
                        }
                    },
                },
                { severity: 'info' },
            );
        } catch (err) {
            console.error('Failed to delete projects:', err);
            showError('Failed to delete projects', err instanceof Error ? err.message : undefined);
        }
    };

    const handleBulkPin = async (pinned: boolean) => {
        try {
            await projectService.bulkSetPinned(selectedIds, pinned);
            const idSet = new Set(selectedIds);
            setProjects((prev) => prev.map((p) => p.id && idSet.has(p.id) ? { ...p, pinned } : p));
            setSelectedIds([]);
        } catch (err) {
            console.error('Failed to pin projects:', err);
            showError('Failed to pin projects', err instanceof Error ? err.message : undefined);
        }
    };

    const handleSaveProject = async (projectData: Project) => {
        try {
            if (editingProject?.id) {
                const previous = editingProject;
                const updated = await projectService.updateProject(previous.id!, projectData);
                replaceOne(updated, (current, next) => ({ ...next, total_time: current.total_time }));
                showWithAction(
                    `Updated "${updated.name}"`,
                    {
                        label: 'Undo',
                        onClick: async () => {
                            try {
                                const reverted = await projectService.updateProject(previous.id!, previous);
                                replaceOne(reverted, (current, next) => ({ ...next, total_time: current.total_time }));
                            } catch (err) {
                                console.error('Failed to revert project:', err);
                                showError('Failed to revert project', err instanceof Error ? err.message : undefined);
                            }
                        },
                    },
                    { severity: 'info' },
                );
            } else {
                const created = await projectService.createProject(projectData);
                prependOne({ ...created, total_time: 0 });
            }
            setEditingProject(null);
        } catch (err) {
            console.error('Failed to save project:', err);
            showError('Failed to save project', err instanceof Error ? err.message : undefined);
            throw err;
        }
    };

    const handleOpenNewProject = () => {
        setEditingProject(null);
        setDialogOpen(true);
    };

        const renderRowActions = (project: Project) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, project)}>
            <MoreVert />
        </IconButton>
    );

    return (
        <Box padding={3} height="100%" display="flex" flexDirection="column" borderRadius={2} boxShadow={4} bgcolor="background.default">
            <PageHeader title="Projects" actionLabel="New Project" onAction={handleOpenNewProject} />

            <Divider sx={{ mb: 2 }} />

            <Box display="flex" gap={2} marginBottom={2} alignItems="center">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
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
                loading={loading}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                defaultSortField="name"
                rowActions={renderRowActions}
                emptyMessage="No projects found"
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
                        {menuProject?.pinned ? <PushPinOutlined fontSize="small" /> : <PushPin fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{menuProject?.pinned ? 'Unpin' : 'Pin'}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete}>
                    <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText color="error.main">Delete</ListItemText>
                </MenuItem>
            </Menu>

                        <ProjectDialog
                open={dialogOpen}
                onClose={() => { setDialogOpen(false); setEditingProject(null); }}
                onSave={handleSaveProject}
                project={editingProject}
                clients={clients}
            />

                        <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => { setDeleteDialogOpen(false); setProjectToDelete(null); }}
                onConfirm={handleConfirmDelete}
                title="Delete Project"
                message={`Are you sure you want to delete "${projectToDelete?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
            />
        </Box>
    );
}
