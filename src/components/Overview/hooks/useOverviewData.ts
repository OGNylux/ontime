import { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { projectService, Project, TAILWIND_COLORS } from '../../../services/projectService';
import { clientService, Client } from '../../../services/clientService';
import { analyticsService, OverviewAggregateRow } from '../../../services/analyticsService';
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
    const [aggregateRows, setAggregateRows] = useState<OverviewAggregateRow[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            analyticsService.overviewAggregates(
                startDate.startOf('day').toISOString(),
                endDate.endOf('day').toISOString(),
            ),
            projectService.getProjectsLight(),
            clientService.getClientsLight(),
        ])
            .then(([rows, p, c]) => {
                if (cancelled) return;
                setAggregateRows(rows);
                setProjects(p);
                setClients(c);
            })
            .catch((err) => console.error('Failed to load data:', err))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [startDate, endDate]);

    const filteredRows = useMemo(() => {
        const clientFilter = new Set(selectedClientIds);
        const projectFilter = new Set(selectedProjectIds);
        return aggregateRows.filter((row) => {
            if (projectFilter.size && !projectFilter.has(row.project_id)) return false;
            if (clientFilter.size) {
                const clientId = row.client_id;
                if (!clientId || !clientFilter.has(clientId)) return false;
            }
            return true;
        });
    }, [aggregateRows, selectedClientIds, selectedProjectIds]);

    /**
     * Single pass over SQL-aggregated rows that builds every aggregate the
     * page needs (stats, daily breakdown, pie chart, project/task table).
     */
    const aggregates = useMemo(() => {
        const dayBuckets = new Map<string, Map<string, number>>(); // dayKey -> projectId -> hours
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

        for (const row of filteredRows) {
            const minutes = Number(row.total_minutes ?? 0);
            if (minutes <= 0) continue;

            const rowBillableMinutes = Number(row.billable_minutes ?? 0);
            const rowRevenue = Number(row.revenue ?? 0);
            const projectId = row.project_id;
            const project: Project = {
                id: projectId,
                name: row.project_name,
                color: row.project_color ?? 0,
            };

            totalMinutes += minutes;
            billableMinutes += rowBillableMinutes;
            revenue += rowRevenue;

            const dayBucket = dayBuckets.get(dayjs(row.day).format('YYYY-MM-DD'));
            if (dayBucket) {
                dayBucket.set(projectId, (dayBucket.get(projectId) ?? 0) + minutes / 60);
            }

            let agg = projectAggs.get(projectId);
            if (!agg) {
                agg = { project, totalMinutes: 0, billableMinutes: 0, revenue: 0, tasks: new Map() };
                projectAggs.set(projectId, agg);
            }
            agg.totalMinutes += minutes;
            agg.billableMinutes += rowBillableMinutes;
            agg.revenue += rowRevenue;

            if (row.task_id && row.task_name) {
                const taskAgg = agg.tasks.get(row.task_id);
                if (taskAgg) taskAgg.minutes += minutes;
                else agg.tasks.set(row.task_id, { taskName: row.task_name, minutes });
            }
        }

        return { dayBuckets, projectAggs, totalMinutes, billableMinutes, revenue };
    }, [filteredRows, startDate, endDate]);

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
            prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
        );
    }, []);

    const toggleProjectFilter = useCallback((projectId: string) => {
        setSelectedProjectIds((prev) =>
            prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
        );
    }, []);

    return {
        loading,
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
