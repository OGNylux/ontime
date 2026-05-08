import React, { useMemo } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Chip,
} from '@mui/material';
import {
    MoreVert,
    Edit,
    Delete,
    FilterList,
    PushPin,
    PushPinOutlined,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { taskService, Task } from '../../services/taskService';
import { projectService, Project } from '../../services/projectService';
import { DataTable, Column } from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/Forms/SearchBar';
import ConfirmDialog from '../../components/Forms/ConfirmDialog';
import TaskDialog from '../../components/TaskDialog';
import { useCrudPage } from '../../hooks/useCrudPage';

const formatTotalTime = (minutes?: number) => {
    if (!minutes) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}.${String(Math.round((mins / 60) * 100)).padStart(2, '0')}h`;
};

export default function TasksPage() {
    const [projectFilter, setProjectFilter] = React.useState('');
    const [filterAnchorEl, setFilterAnchorEl] = React.useState<null | HTMLElement>(null);

    const { data: projects = [] } = useQuery({
        queryKey: ['projects', 'light'],
        queryFn: () => projectService.getProjectsLight(),
    });

    const crud = useCrudPage<Task>({
        queryKey: ['tasks', 'with-totals'],
        fetcher: () => taskService.getTasksWithTotals(),
        entityLabel: 'task',
        entityLabelPlural: 'tasks',
        getName: (t) => t.name,
        mergeOnUpdate: (current, next) => ({ ...next, total_time: current.total_time }),
        decorateNew: (t) => ({ ...t, total_time: 0 }),
        mutations: {
            create: (t) => taskService.createTask(t),
            update: (id, t) => taskService.updateTask(id, t),
            delete: (id) => taskService.deleteTask(id),
            restore: (id) => taskService.restoreTask(id),
            togglePin: (id, pinned) => taskService.togglePin(id, pinned),
            bulkSetPinned: (ids, pinned) => taskService.bulkSetPinned(ids, pinned),
            bulkDelete: (ids) => taskService.bulkDeleteTasks(ids),
            bulkRestore: (ids) => taskService.bulkRestoreTasks(ids),
        },
    });

    const projectsById = useMemo(() => {
        const map = new Map<string, Project>();
        projects.forEach((project) => {
            if (project.id) map.set(project.id, project);
        });
        return map;
    }, [projects]);

    const filteredTasks = useMemo(() => {
        const query = crud.searchQuery.toLowerCase();
        return crud.items
            .filter((task) => {
                const matchesTaskName = task.name.toLowerCase().includes(query);
                const project = task.project_id ? projectsById.get(task.project_id) : undefined;
                const matchesProjectName = project?.name?.toLowerCase().includes(query) ?? false;
                const matchesSearch = matchesTaskName || matchesProjectName;
                const matchesProject = !projectFilter || task.project_id === projectFilter;
                return matchesSearch && matchesProject;
            })
            .sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0;
            });
    }, [crud.items, projectsById, crud.searchQuery, projectFilter]);

    const columns: Column<Task>[] = useMemo(() => [
        {
            field: 'name',
            label: 'Task',
            render: (row) => <Typography fontWeight="medium">{row.name}</Typography>,
        },
        {
            field: 'project',
            label: 'Project',
            render: (row) => {
                const project = row.project_id ? projectsById.get(row.project_id) : undefined;
                return project?.name || '-';
            },
        },
        {
            field: 'total_time',
            label: 'Hours',
            render: (row) => formatTotalTime(row.total_time),
        },
        {
            field: 'pinned',
            label: 'Pinned',
            sortable: false,
            render: (row) =>
                row.pinned ? <PushPin color="secondary" fontSize="small" /> : null,
            align: 'center',
        },
    ], [projectsById]);

    const renderRowActions = (task: Task) => (
        <IconButton size="small" onClick={(e) => crud.openMenu(e, task)}>
            <MoreVert />
        </IconButton>
    );

    return (
        <Box padding={3} height="100%" display="flex" flexDirection="column" borderRadius={2} boxShadow={4} bgcolor="background.default">
            <PageHeader title="Tasks" actionLabel="New Task" onAction={crud.openCreate} />

            <Divider sx={{ mb: 2 }} />

            <Box display="flex" gap={2} marginBottom={2} alignItems="center">
                <SearchBar
                    value={crud.searchQuery}
                    onChange={crud.setSearchQuery}
                    placeholder="Search tasks or projects..."
                />
                <IconButton
                    onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                    color={projectFilter ? 'primary' : 'default'}
                >
                    <FilterList />
                </IconButton>
                {projectFilter && (
                    <Chip
                        label={`Project: ${projects.find((p) => p.id === projectFilter)?.name}`}
                        onDelete={() => setProjectFilter('')}
                        size="small"
                    />
                )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            <DataTable
                data={filteredTasks}
                columns={columns}
                loading={crud.isLoading}
                selectable
                selectedIds={crud.selectedIds}
                onSelectionChange={crud.setSelectedIds}
                defaultSortField="name"
                rowActions={renderRowActions}
                emptyMessage={crud.searchQuery ? 'No tasks match your search' : 'No tasks found'}
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
                    <ListItemText>Filter by Project</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => { setProjectFilter(''); setFilterAnchorEl(null); }}
                    selected={!projectFilter}
                >
                    All Projects
                </MenuItem>
                {projects.map((project) => (
                    <MenuItem
                        key={project.id}
                        onClick={() => { setProjectFilter(project.id || ''); setFilterAnchorEl(null); }}
                        selected={projectFilter === project.id}
                    >
                        {project.name}
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

            <TaskDialog
                open={crud.dialogOpen}
                onClose={crud.closeDialog}
                onSave={crud.handleSave}
                task={crud.editingItem}
                projects={projects}
            />

            <ConfirmDialog
                open={crud.deleteDialogOpen}
                onClose={crud.closeDeleteDialog}
                onConfirm={crud.handleConfirmDelete}
                title="Delete Task"
                message={`Are you sure you want to delete "${crud.itemToDelete?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
            />
        </Box>
    );
}
