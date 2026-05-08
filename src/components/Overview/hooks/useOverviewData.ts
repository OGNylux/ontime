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

    const { data: entries = [], isLoading: entriesLoading, error: entriesError } = useQuery({
        queryKey: ['overview', 'entries', startIso, endIso],
        queryFn: () => calendarService.getEntries(startIso, endIso),
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
                const taskAgg = agg.tasks.get(task.id);
                if (taskAgg) taskAgg.minutes += minutes;
                else agg.tasks.set(task.id, { taskName: task.name, minutes });
            }
        }

        return { dayBuckets, projectAggs, totalMinutes, billableMinutes, revenue };
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
    };
}
