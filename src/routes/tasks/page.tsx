import React, { useState, useEffect, useMemo } from 'react';
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
import { useSnackbar } from '../../hooks/useSnackbar';
import {
    MoreVert,
    Edit,
    Delete,
    FilterList,
    PushPin,
    PushPinOutlined,
} from '@mui/icons-material';
import { taskService, Task } from '../../services/taskService';
import { projectService, Project } from '../../services/projectService';
import { DataTable, Column } from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/Forms/SearchBar';
import ConfirmDialog from '../../components/Forms/ConfirmDialog';
import TaskDialog from '../../components/TaskDialog';
import { useEntityListState } from '../../hooks/useEntityListState';

const formatTotalTime = (minutes?: number) => {
    if (!minutes) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}.${String(Math.round((mins / 60) * 100)).padStart(2, '0')}h`;
};

const errorMessage = (err: unknown, fallback: string): string =>
    err instanceof Error ? err.message : fallback;

export default function TasksPage() {
    const { showError } = useSnackbar();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTask, setMenuTask] = useState<Task | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

    const [projectFilter, setProjectFilter] = useState('');
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

    const { replaceOne, prependOne, removeOne, removeMany } = useEntityListState(setTasks);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tasksData, projectsData] = await Promise.all([
                taskService.getTasksWithTotals(),
                projectService.getProjectsLight(),
            ]);
            setTasks(tasksData);
            setProjects(projectsData);
        } catch (err) {
            console.error('Failed to load tasks:', err);
            showError('Failed to load tasks', err instanceof Error ? err.message : undefined);
        } finally {
            setLoading(false);
        }
    };

    const projectsById = useMemo(() => {
        const map = new Map<string, Project>();
        projects.forEach((project) => {
            if (project.id) map.set(project.id, project);
        });
        return map;
    }, [projects]);

    const filteredTasks = useMemo(() => {
        return tasks
            .filter((task) => {
                const query = searchQuery.toLowerCase();
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
    }, [tasks, projectsById, searchQuery, projectFilter]);

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
                row.pinned ? (
                    <PushPin color="secondary" fontSize="small" />
                ) : null,
            align: 'center',
        },
    ], [projectsById]);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, task: Task) => {
        setMenuAnchorEl(event.currentTarget);
        setMenuTask(task);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setMenuTask(null);
    };

    const handleEdit = () => {
        if (menuTask) {
            setEditingTask(menuTask);
            setDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleDelete = () => {
        if (menuTask) {
            setTaskToDelete(menuTask);
            setDeleteDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleTogglePin = async () => {
        if (menuTask?.id) {
            try {
                const updated = await taskService.togglePin(menuTask.id, !menuTask.pinned);
                replaceOne(updated as Task, (current, next) => ({ ...next, total_time: current.total_time }));
            } catch (err) {
                console.error('Failed to toggle pin:', err);
                showError('Failed to toggle pin', err instanceof Error ? err.message : undefined);
            }
        }
        handleMenuClose();
    };

    const handleConfirmDelete = async () => {
        if (taskToDelete?.id) {
            try {
                await taskService.deleteTask(taskToDelete.id);
                removeOne(taskToDelete.id);
            } catch (err) {
                console.error('Failed to delete task:', err);
                showError('Failed to delete task', err instanceof Error ? err.message : undefined);
            }
        }
        setDeleteDialogOpen(false);
        setTaskToDelete(null);
    };

    const handleBulkDelete = async () => {
        try {
            await taskService.bulkDeleteTasks(selectedIds);
            removeMany(selectedIds);
            setSelectedIds([]);
        } catch (err) {
            console.error('Failed to delete tasks:', err);
            showError('Failed to delete tasks', err instanceof Error ? err.message : undefined);
        }
    };

    const handleBulkPin = async (pinned: boolean) => {
        try {
            await taskService.bulkSetPinned(selectedIds, pinned);
            const idSet = new Set(selectedIds);
            setTasks((prev) => prev.map((t) => t.id && idSet.has(t.id) ? { ...t, pinned } : t));
            setSelectedIds([]);
        } catch (err) {
            console.error('Failed to pin tasks:', err);
            showError('Failed to pin tasks', err instanceof Error ? err.message : undefined);
        }
    };

    const handleSaveTask = async (taskData: Task) => {
        try {
            if (editingTask?.id) {
                const updated = await taskService.updateTask(editingTask.id, taskData);
                replaceOne(updated as Task, (current, next) => ({ ...next, total_time: current.total_time }));
            } else {
                const created = await taskService.createTask(taskData);
                prependOne({ ...created, total_time: 0 });
            }
            setEditingTask(null);
        } catch (err) {
            console.error('Failed to save task:', err);
            showError('Failed to save task', err instanceof Error ? err.message : undefined);
            throw err;
        }
    };

    const handleOpenNewTask = () => {
        setEditingTask(null);
        setDialogOpen(true);
    };

    const renderRowActions = (task: Task) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, task)}>
            <MoreVert />
        </IconButton>
    );

    return (
        <Box padding={3} height="100%" display="flex" flexDirection="column" borderRadius={2} boxShadow={4} bgcolor="background.default">
            <PageHeader title="Tasks" actionLabel="New Task" onAction={handleOpenNewTask} />

            <Divider sx={{ mb: 2 }} />

            <Box display="flex" gap={2} marginBottom={2} alignItems="center">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
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
                loading={loading}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                defaultSortField="name"
                rowActions={renderRowActions}
                emptyMessage={searchQuery ? 'No tasks match your search' : 'No tasks found'}
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
                        {menuTask?.pinned ? <PushPinOutlined fontSize="small" /> : <PushPin fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{menuTask?.pinned ? 'Unpin' : 'Pin'}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete}>
                    <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText color="error.main">Delete</ListItemText>
                </MenuItem>
            </Menu>

            <TaskDialog
                open={dialogOpen}
                onClose={() => { setDialogOpen(false); setEditingTask(null); }}
                onSave={handleSaveTask}
                task={editingTask}
                projects={projects}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => { setDeleteDialogOpen(false); setTaskToDelete(null); }}
                onConfirm={handleConfirmDelete}
                title="Delete Task"
                message={`Are you sure you want to delete "${taskToDelete?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
            />
        </Box>
    );
}
