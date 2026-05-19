import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Chip,
    Menu,
    MenuItem,
    Checkbox,
    ListItemText,
    Radio,
    Divider,
} from '@mui/material';
import { useSnackbar } from '../../hooks/useSnackbar';
import {
    ChevronLeft,
    ChevronRight,
    FilterList,
    AccessTime,
    AttachMoney,
    TrendingUp,
    CalendarMonth,
    CenterFocusStrong,
} from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

import StatCard from '../../components/Overview/StatCard';
import BarChartSection from '../../components/Overview/BarChartSection';
import PieChartSection from '../../components/Overview/PieChartSection';
import ProjectTaskTable from '../../components/Overview/ProjectTaskTable';
import DateRangeDialog from '../../components/Overview/DateRangeDialog';
import ActivityHeatmap from '../../components/Overview/ActivityHeatmap';
import { useOverviewData } from '../../components/Overview/hooks/useOverviewData';
import LoadingBanner from '../../components/Loading/LoadingBanner';
import { formatDuration } from '../../components/NewCalendar/layout/timeUtils';

dayjs.extend(quarterOfYear);

export default function OverviewPage() {
    const { showError } = useSnackbar();
    const [startDate, setStartDate] = useState<Dayjs>(dayjs().startOf('week'));
    const [endDate, setEndDate] = useState<Dayjs>(dayjs().endOf('week'));
    const [dateLabel, setDateLabel] = useState('This Week');
    const [dateDialogOpen, setDateDialogOpen] = useState(false);

    const [clientAnchor, setClientAnchor] = useState<null | HTMLElement>(null);
    const [projectAnchor, setProjectAnchor] = useState<null | HTMLElement>(null);
    const [focusAnchor, setFocusAnchor] = useState<null | HTMLElement>(null);

    const {
        loading,
        error,
        clients,
        projects,
        stats,
        dailyChartData,
        pieChartData,
        projectTableData,
        expandedProjectIds,
        selectedClientIds,
        selectedProjectIds,
        toggleProject,
        toggleClient,
        toggleProjectFilter,
        focusedProjectId,
        setFocusedProjectId,
        focusedChartData,
        activityByDay,
    } = useOverviewData(startDate, endDate);

    const navigate = (direction: 'prev' | 'next') => {
        const diff = endDate.diff(startDate, 'day') + 1;
        const offset = direction === 'prev' ? -diff : diff;
        setStartDate((s) => s.add(offset, 'day'));
        setEndDate((e) => e.add(offset, 'day'));
        setDateLabel('Custom');
    };

    const handleDateSelect = (start: Dayjs, end: Dayjs, label: string) => {
        setStartDate(start);
        setEndDate(end);
        setDateLabel(label);
    };

    useEffect(() => {
        if (error) showError('Failed to load overview', error);
    }, [error, showError]);

    return (
        <Box display="flex" flexDirection="column" gap={2} pb={0.25} flex={1} minHeight={0}>
            {loading ? (
                <Box flex={1} minHeight={0} display="flex" borderRadius={2} boxShadow={4}>
                    <LoadingBanner message="Loading overview..." />
                </Box>
            ) : !error && (
                <>
                                        <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default">
                        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <IconButton onClick={() => navigate('prev')}>
                                    <ChevronLeft />
                                </IconButton>
                                <Button variant="outlined" onClick={() => setDateDialogOpen(true)} sx={{ minWidth: 150 }}>
                                    {dateLabel}
                                </Button>
                                <IconButton onClick={() => navigate('next')}>
                                    <ChevronRight />
                                </IconButton>
                                <Typography variant="body2" color="text.secondary" ml={1}>
                                    {startDate.format('MMM D')} - {endDate.format('MMM D, YYYY')}
                                </Typography>
                            </Box>

                            <Box display="flex" gap={1} flexWrap="wrap">
                                {/* Clients filter */}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<FilterList />}
                                    onClick={(e) => setClientAnchor(e.currentTarget)}
                                    color={selectedClientIds.length > 0 ? 'primary' : 'inherit'}
                                >
                                    Clients {selectedClientIds.length > 0 && `(${selectedClientIds.length})`}
                                </Button>
                                <Menu
                                    anchorEl={clientAnchor}
                                    open={Boolean(clientAnchor)}
                                    onClose={() => setClientAnchor(null)}
                                    PaperProps={{ sx: { bgcolor: 'background.default', width: 260, p: 1 } }}
                                >
                                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                                        {clients.map((c) => (
                                            <MenuItem key={c.id} onClick={() => toggleClient(c.id!)}>
                                                <Checkbox checked={selectedClientIds.includes(c.id!)} />
                                                <ListItemText primary={c.name} />
                                            </MenuItem>
                                        ))}
                                        {clients.length === 0 && (
                                            <MenuItem disabled><ListItemText primary="No clients" /></MenuItem>
                                        )}
                                    </Box>
                                    {selectedClientIds.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', overflowX: 'auto', maxWidth: 260 }}>
                                            {selectedClientIds.map((id) => {
                                                const client = clients.find((c) => c.id === id);
                                                return client ? (
                                                    <Chip key={id} label={client.name} size="small" onDelete={() => toggleClient(id)} sx={{ flexShrink: 0 }} />
                                                ) : null;
                                            })}
                                        </Box>
                                    )}
                                </Menu>

                                {/* Projects filter */}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<FilterList />}
                                    onClick={(e) => setProjectAnchor(e.currentTarget)}
                                    color={selectedProjectIds.length > 0 ? 'primary' : 'inherit'}
                                >
                                    Projects {selectedProjectIds.length > 0 && `(${selectedProjectIds.length})`}
                                </Button>
                                <Menu
                                    anchorEl={projectAnchor}
                                    open={Boolean(projectAnchor)}
                                    onClose={() => setProjectAnchor(null)}
                                    PaperProps={{ sx: { bgcolor: 'background.default', width: 260, p: 1 } }}
                                >
                                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                                        {projects
                                            .filter((p) => selectedClientIds.length === 0 || (p.client_id && selectedClientIds.includes(p.client_id)))
                                            .map((p) => (
                                                <MenuItem key={p.id} onClick={() => toggleProjectFilter(p.id!)}>
                                                    <Checkbox checked={selectedProjectIds.includes(p.id!)} />
                                                    <ListItemText primary={p.name} />
                                                </MenuItem>
                                            ))}
                                        {projects.filter((p) => selectedClientIds.length === 0 || (p.client_id && selectedClientIds.includes(p.client_id))).length === 0 && (
                                            <MenuItem disabled><ListItemText primary={selectedClientIds.length > 0 ? 'No projects in selected clients' : 'No projects'} /></MenuItem>
                                        )}
                                    </Box>
                                    {selectedProjectIds.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', overflowX: 'auto', maxWidth: 260 }}>
                                            {selectedProjectIds.map((id) => {
                                                const project = projects.find((p) => p.id === id);
                                                return project ? (
                                                    <Chip key={id} label={project.name} size="small" onDelete={() => toggleProjectFilter(id)} sx={{ flexShrink: 0 }} />
                                                ) : null;
                                            })}
                                        </Box>
                                    )}
                                </Menu>

                                {/* Task drill-down: focus on a specific project */}
                                <Button
                                    variant={focusedProjectId ? 'contained' : 'outlined'}
                                    size="small"
                                    startIcon={<CenterFocusStrong />}
                                    onClick={(e) => setFocusAnchor(e.currentTarget)}
                                    color={focusedProjectId ? 'primary' : 'inherit'}
                                >
                                    {focusedChartData ? focusedChartData.projectName : 'Task Detail'}
                                </Button>
                                <Menu
                                    anchorEl={focusAnchor}
                                    open={Boolean(focusAnchor)}
                                    onClose={() => setFocusAnchor(null)}
                                    PaperProps={{ sx: { bgcolor: 'background.default', width: 260, p: 1 } }}
                                >
                                    <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 0.5, display: 'block' }}>
                                        Show task breakdown for:
                                    </Typography>
                                    <MenuItem onClick={() => { setFocusedProjectId(null); setFocusAnchor(null); }}>
                                        <Radio checked={focusedProjectId === null} size="small" sx={{ p: 0.5 }} />
                                        <ListItemText primary="All projects" primaryTypographyProps={{ color: 'text.secondary', fontSize: 14 }} />
                                    </MenuItem>
                                    <Divider sx={{ my: 0.5 }} />
                                    <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
                                        {projectTableData.length === 0 && (
                                            <MenuItem disabled><ListItemText primary="No data for this period" /></MenuItem>
                                        )}
                                        {projectTableData.map((p) => (
                                            <MenuItem key={p.projectId} onClick={() => { setFocusedProjectId(p.projectId); setFocusAnchor(null); }}>
                                                <Radio checked={focusedProjectId === p.projectId} size="small" sx={{ p: 0.5 }} />
                                                <Box width={10} height={10} borderRadius="50%" bgcolor={p.projectColor} flexShrink={0} mx={1} />
                                                <ListItemText
                                                    primary={p.projectName}
                                                    secondary={`${p.tasks.length} task${p.tasks.length !== 1 ? 's' : ''}`}
                                                    secondaryTypographyProps={{ fontSize: 12 }}
                                                />
                                            </MenuItem>
                                        ))}
                                    </Box>
                                </Menu>
                            </Box>
                        </Box>
                    </Box>

                                        <Box display="flex" gap={1.5} flexWrap="wrap">
                        <StatCard icon={<AccessTime />} label="Total Hours" value={formatDuration(stats.totalMinutes * 60)} />
                        <StatCard icon={<AttachMoney />} label="Billable Hours" value={formatDuration(stats.billableMinutes * 60)} />
                        <StatCard icon={<TrendingUp />} label="Revenue" value={`€${stats.revenue.toFixed(2)}`} />
                        <StatCard icon={<CalendarMonth />} label="Avg Hours/Day" value={formatDuration(stats.avgMinutesPerDay * 60)} />
                    </Box>

                                        <ActivityHeatmap data={activityByDay} />

                                        <Box display="flex" gap={2} flexWrap="wrap">
                        {focusedChartData ? (
                            <>
                                <BarChartSection
                                    data={focusedChartData.bar.data}
                                    projectIds={focusedChartData.bar.projectIds}
                                    projectNames={focusedChartData.bar.projectNames}
                                    projectColors={focusedChartData.bar.projectColors}
                                    title={`Hours per Day — ${focusedChartData.projectName}`}
                                />
                                <PieChartSection
                                    data={focusedChartData.pieData}
                                    projectNames={focusedChartData.itemNames}
                                    title={`Task Distribution — ${focusedChartData.projectName}`}
                                />
                            </>
                        ) : (
                            <>
                                <BarChartSection
                                    data={dailyChartData.data}
                                    projectIds={dailyChartData.projectIds}
                                    projectNames={dailyChartData.projectNames}
                                    projectColors={dailyChartData.projectColors}
                                />
                                <PieChartSection data={pieChartData} projectNames={dailyChartData.projectNames} />
                            </>
                        )}
                    </Box>

                                        <ProjectTaskTable
                        data={projectTableData}
                        loading={loading}
                        expandedIds={expandedProjectIds}
                        onToggleProject={toggleProject}
                    />

                                        <DateRangeDialog
                        open={dateDialogOpen}
                        onClose={() => setDateDialogOpen(false)}
                        onSelect={handleDateSelect}
                        currentStartDate={startDate}
                        currentEndDate={endDate}
                    />
                </>
            )}
        </Box>
    );
}
