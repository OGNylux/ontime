import { useMemo } from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material';
import { DataTable, Column } from '../DataTable';
import { formatDuration } from '../Calendar/util/calendarUtility';

interface TaskData {
    taskId: string;
    taskName: string;
    totalMinutes: number;
}

export interface ProjectRowData {
    id: string;
    projectId: string;
    projectName: string;
    projectColor: string;
    totalMinutes: number;
    percentage: number;
    tasks: TaskData[];
    _expanded?: boolean;
}

interface TableRow {
    id: string;
    type: 'project' | 'task';
    projectData?: ProjectRowData;
    taskData?: TaskData;
    name: string;
    totalMinutes: number;
    percentage?: number;
    projectColor?: string;
    taskCount?: number;
}

interface ProjectTaskTableProps {
    data: ProjectRowData[];
    loading: boolean;
    onToggleProject: (projectId: string) => void;
}

export default function ProjectTaskTable({
    data,
    loading,
    onToggleProject,
}: ProjectTaskTableProps) {
    const tableRows = useMemo(() => {
        const rows: TableRow[] = [];

        data.forEach((project) => {
            rows.push({
                id: project.projectId,
                type: 'project',
                projectData: project,
                name: project.projectName,
                totalMinutes: project.totalMinutes,
                percentage: project.percentage,
                projectColor: project.projectColor,
                taskCount: project.tasks.length,
            });

            if (project._expanded && project.tasks.length > 0) {
                project.tasks.forEach((task) => {
                    rows.push({
                        id: `${project.projectId}-${task.taskId}`,
                        type: 'task',
                        taskData: task,
                        projectData: project,
                        name: task.taskName,
                        totalMinutes: task.totalMinutes,
                        projectColor: project.projectColor,
                    });
                });
            }
        });

        return rows;
    }, [data]);

    const columns: Column<TableRow>[] = useMemo(
        () => [
            {
                field: 'expand',
                label: '',
                sortable: false,
                render: (row) => {
                    if (row.type === 'task' || !row.taskCount) return null;
                    return (
                        <IconButton
                            size="small"
                            color="secondary"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleProject(row.id);
                            }}
                        >
                            {row.projectData?._expanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                        </IconButton>
                    );
                },
            },
            {
                field: 'name',
                label: 'Project / Task',
                render: (row) => (
                    <Box
                        onClick={() => {
                            if (row.type === 'project' && row.taskCount) {
                                onToggleProject(row.id);
                            }
                        }}
                        pl={row.type === 'task' ? 6 : 0}
                        display="flex"
                        alignItems="center"
                        sx={{ cursor: row.type === 'project' && row.taskCount ? 'pointer' : 'default' }}
                    >
                        {row.type === 'task' && (
                            <Box
                                width={8}
                                height={8}
                                borderRadius="50%"
                                bgcolor={row.projectColor || 'primary.main'}
                                mr={1.5}
                                flexShrink={0}
                            />
                        )}
                        {row.type === 'project' && row.projectColor && (
                            <Box
                                width={12}
                                height={12}
                                borderRadius="50%"
                                bgcolor={row.projectColor}
                                mr={1.5}
                                flexShrink={0}
                            />
                        )}
                        <Typography
                            fontWeight={row.type === 'project' ? 'medium' : 'normal'}
                            color={row.type === 'task' ? 'text.secondary' : 'text.primary'}
                        >
                            {row.name}
                        </Typography>
                    </Box>
                ),
            },
            {
                field: 'totalMinutes',
                label: 'Duration',
                align: 'right',
                render: (row) => formatDuration(row.totalMinutes),
            },
            {
                field: 'percentage',
                label: 'Percentage',
                align: 'right',
                render: (row) => (row.type === 'task' ? null : `${row.percentage?.toFixed(1)}%`),
            },
            {
                field: 'taskCount',
                label: 'Tasks',
                align: 'center',
                render: (row) => {
                    if (row.type === 'task') return null;
                    const count = row.taskCount || 0;
                    return (
                        <Chip
                            label={count}
                            size="small"
                            color={count > 0 ? 'secondary' : 'default'}
                            variant={count > 0 ? 'filled' : 'outlined'}
                        />
                    );
                },
            },
        ],
        [onToggleProject]
    );

    return (
        <Box
            p={2}
            borderRadius={2}
            minHeight={400}
            display="flex"
            flexDirection="column"
            bgcolor="background.default"
            boxShadow={4}
        >
            <Typography variant="subtitle1" fontWeight="bold">
                Projects & Tasks
            </Typography>
            <Box flex={1} minHeight={300} mt={1} sx={{ overflowY: 'scroll', overflowX: 'auto' }}>
                <DataTable
                    data={tableRows}
                    columns={columns}
                    loading={loading}
                    emptyMessage="No data for this period"
                    getRowId={(row) => row.id}
                    defaultSortField="name"
                    defaultSortOrder='asc'
                    groupBy={(row) => row.type === 'project' ? row.id : row.projectData?.projectId}
                    rowsPerPage={20}
                />
            </Box>
        </Box>
    );
}
