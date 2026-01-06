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


// ============ Helpers ============
const formatTotalTime = (minutes?: number) => {
    if (!minutes) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}.${String(Math.round((mins / 60) * 100)).padStart(2, '0')}h`;
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('MMM D');
};

// ============ Main Component ============
export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Menu state
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [menuProject, setMenuProject] = useState<Project | null>(null);
    
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    
    // Filter state
    const [clientFilter, setClientFilter] = useState('');
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [projectsData, clientsData] = await Promise.all([
                projectService.getProjects(),
                clientService.getClients(),
            ]);
            setProjects(projectsData);
            setClients(clientsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter data
    const filteredProjects = useMemo(() => {
        return projects
            .filter((project) => {
                const matchesSearch =
                    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    project.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesClient = !clientFilter || project.client_id === clientFilter;
                return matchesSearch && matchesClient;
            })
            .sort((a, b) => {
                // Pinned items always on top
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0;
            });
    }, [projects, searchQuery, clientFilter]);

    // Table columns
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
            render: (row) => formatTotalTime(row.total_time),
        },
        {
            field: 'pinned',
            label: 'Pinned',
            sortable: false,
            render: (row) =>
                row.pinned ? (
                    <PushPin color="primary" fontSize="small" />
                ) : null,
            align: 'center',
        },
    ], []);

    // Menu handlers
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
        if (menuProject) {
            try {
                const updated = await projectService.togglePin(menuProject.id!, !menuProject.pinned);
                setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            } catch (error) {
                console.error('Failed to toggle pin:', error);
            }
        }
        handleMenuClose();
    };

    const handleConfirmDelete = async () => {
        if (projectToDelete) {
            try {
                await projectService.deleteProject(projectToDelete.id!);
                setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
            } catch (error) {
                console.error('Failed to delete project:', error);
            }
        }
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selectedIds.map((id) => projectService.deleteProject(id)));
            setProjects((prev) => prev.filter((p) => !selectedIds.includes(p.id!)));
            setSelectedIds([]);
        } catch (error) {
            console.error('Failed to delete projects:', error);
        }
    };

    const handleBulkPin = async (pinned: boolean) => {
        try {
            await Promise.all(
                selectedIds.map((id) => projectService.togglePin(id, pinned))
            );
            const updatedProjects = await projectService.getProjects();
            setProjects(updatedProjects);
            setSelectedIds([]);
        } catch (error) {
            console.error('Failed to pin projects:', error);
        }
    };

    const handleSaveProject = async (projectData: Project) => {
        if (editingProject) {
            const updated = await projectService.updateProject(editingProject.id!, projectData);
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        } else {
            const created = await projectService.createProject(projectData as Project);
            setProjects((prev) => [created, ...prev]);
        }
        setEditingProject(null);
    };

    const handleOpenNewProject = () => {
        setEditingProject(null);
        setDialogOpen(true);
    };

    // Row actions renderer
    const renderRowActions = (project: Project) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, project)}>
            <MoreVert />
        </IconButton>
    );

    return (
        <Box padding={3} height="100%" display="flex" flexDirection="column" borderRadius={2} boxShadow={4} bgcolor="background.default">
            <PageHeader title="Projects" actionLabel="New Project" onAction={handleOpenNewProject} />

            <Divider sx={{ mb: 2 }} />
            {/* Search and Filters */}
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

            {/* Data Table */}
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
                            color="primary"
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

            {/* Filter Menu */}
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

            {/* Row Actions Menu */}
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
                    <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
                </MenuItem>
            </Menu>

            {/* Create/Edit Project Dialog */}
            <ProjectDialog
                open={dialogOpen}
                onClose={() => { setDialogOpen(false); setEditingProject(null); }}
                onSave={handleSaveProject}
                project={editingProject}
                clients={clients}
            />

            {/* Delete Confirmation Dialog */}
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
