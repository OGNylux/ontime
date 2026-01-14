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
import dayjs from 'dayjs';

// Extended Task type with calculated total time
interface TaskWithTime extends Task {
    total_time?: number;
}

// ============ Helpers ============
const formatTotalTime = (minutes?: number) => {
    if (!minutes) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}.${String(Math.round((mins / 60) * 100)).padStart(2, '0')}h`;
};

// ============ Main Component ============
export default function TasksPage() {
    const [tasks, setTasks] = useState<TaskWithTime[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Menu state
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTask, setMenuTask] = useState<Task | null>(null);
    
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    
    // Filter state
    const [projectFilter, setProjectFilter] = useState('');
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tasksData, projectsData] = await Promise.all([
                taskService.getTasks(),
                projectService.getProjects(),
            ]);
            
            // Calculate total time for each task from calendar entries
            const tasksWithTime = tasksData.map(task => {
                const totalMinutes = task.calendar_entries?.reduce((total, entry) => {
                    const start = dayjs(entry.start_time);
                    const end = dayjs(entry.end_time);
                    return total + end.diff(start, 'minute');
                }, 0) || 0;
                
                return {
                    ...task,
                    total_time: Math.round(totalMinutes),
                };
            });
            
            setTasks(tasksWithTime);
            setProjects(projectsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter data - search by task name OR project name
    const filteredTasks = useMemo(() => {
        return tasks
            .filter((task) => {
                const query = searchQuery.toLowerCase();
                const matchesTaskName = task.name.toLowerCase().includes(query);
                const project = projects.find(p => p.id === task.project_id);
                const matchesProjectName = project?.name?.toLowerCase().includes(query);
                const matchesSearch = matchesTaskName || matchesProjectName;
                const matchesProject = !projectFilter || task.project_id === projectFilter;
                return matchesSearch && matchesProject;
            })
            .sort((a, b) => {
                // Pinned items always on top
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0;
            });
    }, [tasks, projects, searchQuery, projectFilter]);

    // Table columns
    const columns: Column<TaskWithTime>[] = useMemo(() => [
        {
            field: 'name',
            label: 'Task',
            render: (row) => <Typography fontWeight="medium">{row.name}</Typography>,
        },
        {
            field: 'project',
            label: 'Project',
            render: (row) => {
                const project = projects.find(p => p.id === row.project_id);
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
    ], [projects]);

    // Menu handlers
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
        if (menuTask && menuTask.id) {
            try {
                const updated = await taskService.togglePin(menuTask.id, !menuTask.pinned);
                setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...updated, total_time: t.total_time } : t)));
            } catch (error) {
                console.error('Failed to toggle pin:', error);
            }
        }
        handleMenuClose();
    };

    const handleConfirmDelete = async () => {
        if (taskToDelete && taskToDelete.id) {
            try {
                await taskService.deleteTask(taskToDelete.id);
                setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
            } catch (error) {
                console.error('Failed to delete task:', error);
            }
        }
        setDeleteDialogOpen(false);
        setTaskToDelete(null);
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selectedIds.map((id) => taskService.deleteTask(id)));
            setTasks((prev) => prev.filter((t) => !selectedIds.includes(t.id!)));
            setSelectedIds([]);
        } catch (error) {
            console.error('Failed to delete tasks:', error);
        }
    };

    const handleBulkPin = async (pinned: boolean) => {
        try {
            await Promise.all(
                selectedIds.map((id) => taskService.togglePin(id, pinned))
            );
            const updatedTasks = await taskService.getTasks();
            const tasksWithTime = updatedTasks.map(task => {
                const totalMinutes = task.calendar_entries?.reduce((total, entry) => {
                    const start = dayjs(entry.start_time);
                    const end = dayjs(entry.end_time);
                    return total + end.diff(start, 'minute');
                }, 0) || 0;
                
                return {
                    ...task,
                    total_time: Math.round(totalMinutes),
                };
            });
            setTasks(tasksWithTime);
            setSelectedIds([]);
        } catch (error) {
            console.error('Failed to pin tasks:', error);
        }
    };

    const handleSaveTask = async (taskData: Task) => {
        if (editingTask && editingTask.id) {
            const updated = await taskService.updateTask(editingTask.id, taskData);
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...updated, total_time: t.total_time } : t)));
        } else {
            const created = await taskService.createTask(taskData);
            setTasks((prev) => [{ ...created, total_time: 0 }, ...prev]);
        }
        setEditingTask(null);
    };

    const handleOpenNewTask = () => {
        setEditingTask(null);
        setDialogOpen(true);
    };

    // Row actions renderer
    const renderRowActions = (task: Task) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, task)}>
            <MoreVert />
        </IconButton>
    );

    return (
        <Box padding={3} height="100%" display="flex" flexDirection="column" borderRadius={2} boxShadow={4} bgcolor="background.default">
            <PageHeader title="Tasks" actionLabel="New Task" onAction={handleOpenNewTask} />

            <Divider sx={{ mb: 2 }} />
            
            {/* Search and Filters */}
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

            {/* Data Table */}
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

            {/* Filter Menu */}
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
                        {menuTask?.pinned ? <PushPinOutlined fontSize="small" /> : <PushPin fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{menuTask?.pinned ? 'Unpin' : 'Pin'}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete}>
                    <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText color="error.main">Delete</ListItemText>
                </MenuItem>
            </Menu>

            {/* Create/Edit Task Dialog */}
            <TaskDialog
                open={dialogOpen}
                onClose={() => { setDialogOpen(false); setEditingTask(null); }}
                onSave={handleSaveTask}
                task={editingTask}
                projects={projects}
            />

            {/* Delete Confirmation Dialog */}
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
