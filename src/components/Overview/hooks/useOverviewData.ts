import { useMemo, useCallback, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { calendarService } from '../../../services/calendarService';
import { projectService, Project, TAILWIND_COLORS } from '../../../services/projectService';
import { clientService } from '../../../services/clientService';
import { ProjectRowData } from '../ProjectTaskTable';

export interface DailyChartPoint {
    date: string;
    [projectId: string]: string | number;
}

export interface DailyChartData {
    data: DailyChartPoint[];
    projectNames: Record<string, string>;
    projectColors: Record<string, string>;
    projectIds: string[];
}

export interface PieChartItem {
    name: string;
    value: number;
    color: string;
    [key: string]: string | number;
}

export interface Stats {
    totalMinutes: number;
    billableMinutes: number;
    revenue: number;
    avgMinutesPerDay: number;
    daysInRange: number;
}

interface ProjectAggregate {
    project: Project;
    totalMinutes: number;
    billableMinutes: number;
    revenue: number;
    tasks: Map<string, { taskName: string; minutes: number }>;
}

const projectColor = (project: Project) => TAILWIND_COLORS[project.color ?? 0].value;

export function useOverviewData(startDate: Dayjs, endDate: Dayjs) {
    const startIso = startDate.startOf('day').toISOString();
    const endIso = endDate.endOf('day').toISOString();

    const yearStart = dayjs().subtract(51, 'week').startOf('week').add(1, 'day').startOf('day').toISOString();
    const yearEnd = dayjs().endOf('day').toISOString();

    const { data: entries = [], isLoading: entriesLoading, error: entriesError } = useQuery({
        queryKey: ['overview', 'entries', startIso, endIso],
        queryFn: () => calendarService.getEntries(startIso, endIso),
    });

    const { data: yearlyEntries = [] } = useQuery({
        queryKey: ['overview', 'yearly', yearStart],
        queryFn: () => calendarService.getEntries(yearStart, yearEnd),
        staleTime: 5 * 60 * 1000,
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['projects', 'light'],
        queryFn: () => projectService.getProjectsLight(),
    });

    const { data: clients = [] } = useQuery({
        queryKey: ['clients', 'light'],
        queryFn: () => clientService.getClientsLight(),
    });

    const loading = entriesLoading;
    const error = entriesError
        ? (entriesError instanceof Error ? entriesError.message : 'Failed to load overview data')
        : null;

    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
    const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);

    const filteredEntries = useMemo(() => {
        const clientFilter = new Set(selectedClientIds);
        const projectFilter = new Set(selectedProjectIds);
        return entries.filter((entry) => {
            const projectId = entry.task?.project?.id;
            if (projectFilter.size && (!projectId || !projectFilter.has(projectId))) return false;
            if (clientFilter.size) {
                const clientId = entry.task?.project?.client_id;
                if (!clientId || !clientFilter.has(clientId)) return false;
            }
            return true;
        });
    }, [entries, selectedClientIds, selectedProjectIds]);

    const aggregates = useMemo(() => {
        const dayBuckets = new Map<string, Map<string, number>>();
        const projectAggs = new Map<string, ProjectAggregate>();

        let current = startDate.startOf('day');
        const last = endDate.startOf('day');
        while (current.isBefore(last) || current.isSame(last)) {
            dayBuckets.set(current.format('YYYY-MM-DD'), new Map());
            current = current.add(1, 'day');
        }

        let totalMinutes = 0;
        let billableMinutes = 0;
        let revenue = 0;

        // projectId → day → taskId → hours
        const taskDayBuckets = new Map<string, Map<string, Map<string, number>>>();

        for (const entry of filteredEntries) {
            if (!entry.start_time || !entry.end_time) continue;
            const project = entry.task?.project;
            if (!project?.id) continue;

            const minutes = dayjs(entry.end_time).diff(dayjs(entry.start_time), 'minute', true);
            if (minutes <= 0) continue;

            const isBillable = entry.is_billable === true;
            const entryBillableMinutes = isBillable ? minutes : 0;
            const entryRevenue = isBillable ? (minutes / 60) * (project.hourly_rate ?? 0) : 0;
            const projectId = project.id;

            totalMinutes += minutes;
            billableMinutes += entryBillableMinutes;
            revenue += entryRevenue;

            const dayKey = dayjs(entry.start_time).format('YYYY-MM-DD');
            const dayBucket = dayBuckets.get(dayKey);
            if (dayBucket) {
                dayBucket.set(projectId, (dayBucket.get(projectId) ?? 0) + minutes / 60);
            }

            let agg = projectAggs.get(projectId);
            if (!agg) {
                agg = { project, totalMinutes: 0, billableMinutes: 0, revenue: 0, tasks: new Map() };
                projectAggs.set(projectId, agg);
            }
            agg.totalMinutes += minutes;
            agg.billableMinutes += entryBillableMinutes;
            agg.revenue += entryRevenue;

            const task = entry.task;
            if (task?.id && task.name) {
                const taskId = task.id;
                const taskAgg = agg.tasks.get(taskId);
                if (taskAgg) taskAgg.minutes += minutes;
                else agg.tasks.set(taskId, { taskName: task.name, minutes });

                // Track per-day task hours for drill-down
                let ptBuckets = taskDayBuckets.get(projectId);
                if (!ptBuckets) { ptBuckets = new Map(); taskDayBuckets.set(projectId, ptBuckets); }
                let dtBucket = ptBuckets.get(dayKey);
                if (!dtBucket) { dtBucket = new Map(); ptBuckets.set(dayKey, dtBucket); }
                dtBucket.set(taskId, (dtBucket.get(taskId) ?? 0) + minutes / 60);
            }
        }

        return { dayBuckets, taskDayBuckets, projectAggs, totalMinutes, billableMinutes, revenue };
    }, [filteredEntries, startDate, endDate]);

    const stats: Stats = useMemo(() => {
        const daysInRange = endDate.diff(startDate, 'day') + 1;
        return {
            totalMinutes: aggregates.totalMinutes,
            billableMinutes: aggregates.billableMinutes,
            revenue: aggregates.revenue,
            avgMinutesPerDay: daysInRange > 0 ? aggregates.totalMinutes / daysInRange : 0,
            daysInRange,
        };
    }, [aggregates, startDate, endDate]);

    const dailyChartData: DailyChartData = useMemo(() => {
        const projectNames: Record<string, string> = {};
        const projectColors: Record<string, string> = {};

        aggregates.projectAggs.forEach((agg, id) => {
            projectNames[id] = agg.project.name;
            projectColors[id] = projectColor(agg.project);
        });

        const data: DailyChartPoint[] = [];
        aggregates.dayBuckets.forEach((projectMap, dayKey) => {
            const point: DailyChartPoint = { date: dayjs(dayKey).format('D MMM') };
            projectMap.forEach((hours, pid) => { point[pid] = Number(hours.toFixed(2)); });
            data.push(point);
        });

        return { data, projectNames, projectColors, projectIds: Object.keys(projectNames) };
    }, [aggregates]);

    const pieChartData: PieChartItem[] = useMemo(() => {
        return Array.from(aggregates.projectAggs.values()).map((agg) => ({
            name: agg.project.name,
            value: agg.totalMinutes,
            color: projectColor(agg.project),
        }));
    }, [aggregates]);

    const projectTableData: ProjectRowData[] = useMemo(() => {
        const total = aggregates.totalMinutes;
        return Array.from(aggregates.projectAggs.values())
            .map<ProjectRowData>((agg) => ({
                id: agg.project.id!,
                projectId: agg.project.id!,
                projectName: agg.project.name,
                projectColor: projectColor(agg.project),
                totalMinutes: agg.totalMinutes,
                percentage: total > 0 ? (agg.totalMinutes / total) * 100 : 0,
                tasks: Array.from(agg.tasks.entries()).map(([taskId, t]) => ({
                    taskId,
                    taskName: t.taskName,
                    totalMinutes: t.minutes,
                })),
            }))
            .sort((a, b) => b.totalMinutes - a.totalMinutes);
    }, [aggregates]);

    const focusedChartData = useMemo(() => {
        if (!focusedProjectId) return null;
        const agg = aggregates.projectAggs.get(focusedProjectId);
        if (!agg) return null;

        const taskList = Array.from(agg.tasks.entries()).sort((a, b) => b[1].minutes - a[1].minutes);
        const itemNames: Record<string, string> = {};
        const itemColors: Record<string, string> = {};
        const itemIds: string[] = [];
        taskList.forEach(([taskId, task], i) => {
            itemNames[taskId] = task.taskName;
            itemColors[taskId] = TAILWIND_COLORS[i % TAILWIND_COLORS.length].value;
            itemIds.push(taskId);
        });

        const projectTaskDayBuckets = aggregates.taskDayBuckets.get(focusedProjectId);
        const barData: DailyChartPoint[] = [];
        aggregates.dayBuckets.forEach((_, dayKey) => {
            const point: DailyChartPoint = { date: dayjs(dayKey).format('D MMM') };
            projectTaskDayBuckets?.get(dayKey)?.forEach((hours, taskId) => {
                if (itemNames[taskId]) point[taskId] = Number(hours.toFixed(2));
            });
            barData.push(point);
        });

        const pieData: PieChartItem[] = taskList.map(([taskId, task]) => ({
            name: taskId,
            value: task.minutes,
            color: itemColors[taskId],
        }));

        return {
            projectName: agg.project.name,
            bar: { data: barData, projectIds: itemIds, projectNames: itemNames, projectColors: itemColors },
            pieData,
            itemNames,
        };
    }, [focusedProjectId, aggregates]);

    const toggleProject = useCallback((projectId: string) => {
        setExpandedProjectIds((prev) => {
            const next = new Set(prev);
            if (next.has(projectId)) next.delete(projectId);
            else next.add(projectId);
            return next;
        });
    }, []);

    const toggleClient = useCallback((clientId: string) => {
        setSelectedClientIds((prev) =>
            prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId],
        );
    }, []);

    const toggleProjectFilter = useCallback((projectId: string) => {
        setSelectedProjectIds((prev) =>
            prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
        );
    }, []);

    const activityByDay: Record<string, number> = useMemo(() => {
        const map: Record<string, number> = {};
        for (const entry of yearlyEntries) {
            if (!entry.start_time || !entry.end_time) continue;
            const minutes = dayjs(entry.end_time).diff(dayjs(entry.start_time), 'minute', true);
            if (minutes <= 0) continue;
            const key = dayjs(entry.start_time).format('YYYY-MM-DD');
            map[key] = (map[key] ?? 0) + minutes;
        }
        return map;
    }, [yearlyEntries]);

    return {
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
    };
}
