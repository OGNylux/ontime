import { useState } from 'react';
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
} from '@mui/material';
import {
    ChevronLeft,
    ChevronRight,
    FilterList,
    AccessTime,
    AttachMoney,
    TrendingUp,
    CalendarMonth,
} from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

import StatCard from '../../components/Overview/StatCard';
import BarChartSection from '../../components/Overview/BarChartSection';
import PieChartSection from '../../components/Overview/PieChartSection';
import ProjectTaskTable from '../../components/Overview/ProjectTaskTable';
import DateRangeDialog from '../../components/Overview/DateRangeDialog';
import { useOverviewData } from '../../components/Overview/hooks/useOverviewData';
import { formatDuration } from '../../components/Calendar/util/calendarUtility';
import LoadingBanner from '../../components/Loading/LoadingBanner';

dayjs.extend(quarterOfYear);

export default function OverviewPage() {
    const [startDate, setStartDate] = useState<Dayjs>(dayjs().startOf('week'));
    const [endDate, setEndDate] = useState<Dayjs>(dayjs().endOf('week'));
    const [dateLabel, setDateLabel] = useState('This Week');
    const [dateDialogOpen, setDateDialogOpen] = useState(false);

    const [clientAnchor, setClientAnchor] = useState<null | HTMLElement>(null);
    const [projectAnchor, setProjectAnchor] = useState<null | HTMLElement>(null);

    const {
        loading,
        clients,
        projects,
        stats,
        dailyChartData,
        pieChartData,
        projectDataWithExpansion,
        selectedClientIds,
        selectedProjectIds,
        toggleProject,
        toggleClient,
        toggleProjectFilter,
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

    return (
        <Box display="flex" flexDirection="column" gap={2} pb={0.25} flex={1} minHeight={0}>
            {loading ? (
                <Box flex={1} minHeight={0} display="flex" borderRadius={2} boxShadow={4}>
                    <LoadingBanner message="Loading overview..." />
                </Box>
            ) : (
                <>
                    {/* Date Selection & Filters */}
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

                            <Box display="flex" gap={1}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<FilterList />}
                                    onClick={(e) => setClientAnchor(e.currentTarget)}
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
                                            <MenuItem disabled>
                                                <ListItemText primary="No clients" />
                                            </MenuItem>
                                        )}
                                    </Box>

                                    {selectedClientIds.length > 0 && (
                                        <Box 
                                            sx={{ 
                                                display: 'flex', 
                                                flexWrap: 'nowrap',
                                                gap: 1, 
                                                mt: 1, 
                                                pt: 1, 
                                                borderTop: 1, 
                                                borderColor: 'divider',
                                                overflowX: 'auto',
                                                maxWidth: 260,
                                                '&::-webkit-scrollbar': {
                                                    height: 6,
                                                },
                                                '&::-webkit-scrollbar-thumb': {
                                                    backgroundColor: 'rgba(0,0,0,.2)',
                                                    borderRadius: 3,
                                                },
                                            }}
                                        >
                                            {selectedClientIds.map((id) => {
                                                const client = clients.find((c) => c.id === id);
                                                return client ? (
                                                    <Chip
                                                        key={id}
                                                        label={client.name}
                                                        size="small"
                                                        onDelete={() => toggleClient(id)}
                                                        sx={{ flexShrink: 0 }}
                                                    />
                                                ) : null;
                                            })}
                                        </Box>
                                    )}
                                </Menu>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<FilterList />}
                                    onClick={(e) => setProjectAnchor(e.currentTarget)}
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
                                        {projects.map((p) => (
                                            <MenuItem key={p.id} onClick={() => toggleProjectFilter(p.id!)}>
                                                <Checkbox checked={selectedProjectIds.includes(p.id!)} />
                                                <ListItemText primary={p.name} />
                                            </MenuItem>
                                        ))}
                                        {projects.length === 0 && (
                                            <MenuItem disabled>
                                                <ListItemText primary="No projects" />
                                            </MenuItem>
                                        )}
                                    </Box>

                                    {selectedProjectIds.length > 0 && (
                                        <Box 
                                            sx={{ 
                                                display: 'flex', 
                                                flexWrap: 'nowrap',
                                                gap: 1, 
                                                mt: 1, 
                                                pt: 1, 
                                                borderTop: 1, 
                                                borderColor: 'divider',
                                                overflowX: 'auto',
                                                maxWidth: 260,
                                                '&::-webkit-scrollbar': {
                                                    height: 6,
                                                },
                                                '&::-webkit-scrollbar-thumb': {
                                                    backgroundColor: 'rgba(0,0,0,.2)',
                                                    borderRadius: 3,
                                                },
                                            }}
                                        >
                                            {selectedProjectIds.map((id) => {
                                                const project = projects.find((p) => p.id === id);
                                                return project ? (
                                                    <Chip
                                                        key={id}
                                                        label={project.name}
                                                        size="small"
                                                        onDelete={() => toggleProjectFilter(id)}
                                                        sx={{ flexShrink: 0 }}
                                                    />
                                                ) : null;
                                            })}
                                        </Box>
                                    )}
                                </Menu>
                            </Box>
                        </Box>
                    </Box>

                    {/* Stats */}
                    <Box display="flex" gap={1.5} flexWrap="wrap">
                        <StatCard icon={<AccessTime />} label="Total Hours" value={formatDuration(stats.totalMinutes)} />
                        <StatCard icon={<AttachMoney />} label="Billable Hours" value={formatDuration(stats.billableMinutes)} />
                        <StatCard icon={<TrendingUp />} label="Revenue" value={`€${stats.revenue.toFixed(2)}`} />
                        <StatCard icon={<CalendarMonth />} label="Avg Hours/Day" value={formatDuration(stats.avgMinutesPerDay)} />
                    </Box>

                    {/* Charts */}
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <BarChartSection
                            data={dailyChartData.data}
                            projectIds={dailyChartData.projectIds}
                            projectNames={dailyChartData.projectNames}
                            projectColors={dailyChartData.projectColors}
                        />
                        <PieChartSection data={pieChartData} projectNames={dailyChartData.projectNames} />
                    </Box>

                    {/* Table */}
                    <ProjectTaskTable
                        data={projectDataWithExpansion}
                        loading={loading}
                        onToggleProject={toggleProject}
                    />

                    {/* Dialog */}
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
