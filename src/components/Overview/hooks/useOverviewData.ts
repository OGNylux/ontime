import { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { calendarService, CalendarEntry } from '../../../services/calendarService';
import { projectService, Project, TAILWIND_COLORS } from '../../../services/projectService';
import { clientService, Client } from '../../../services/clientService';
import { ProjectRowData } from '../ProjectTaskTable';

export interface DailyChartData {
    data: any[];
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

export function useOverviewData(startDate: Dayjs, endDate: Dayjs) {
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

    const [projectDataWithExpansion, setProjectDataWithExpansion] = useState<ProjectRowData[]>([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [e, p, c] = await Promise.all([
                    calendarService.getEntries(startDate.toISOString(), endDate.toISOString()),
                    projectService.getProjects(),
                    clientService.getClients(),
                ]);
                setEntries(e);
                setProjects(p);
                setClients(c);
            } catch (err) {
                console.error('Failed to load data:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [startDate, endDate]);

    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            if (selectedClientIds.length > 0 && entry.project?.client_id) {
                if (!selectedClientIds.includes(entry.project.client_id)) return false;
            }
            if (selectedProjectIds.length > 0 && entry.project_id) {
                if (!selectedProjectIds.includes(entry.project_id)) return false;
            }
            return true;
        });
    }, [entries, selectedClientIds, selectedProjectIds]);

    const stats: Stats = useMemo(() => {
        let totalMinutes = 0;
        let billableMinutes = 0;
        let revenue = 0;

        filteredEntries.forEach((entry) => {
            if (entry.start_time && entry.end_time) {
                const start = dayjs(entry.start_time);
                const end = dayjs(entry.end_time);
                const duration = end.diff(start, 'minute');
                totalMinutes += duration;

                if (entry.is_billable) {
                    billableMinutes += duration;
                    const hourlyRate = (entry.project as Project)?.hourly_rate ?? 0;
                    revenue += (duration / 60) * hourlyRate;
                }
            }
        });

        const daysInRange = endDate.diff(startDate, 'day') + 1;
        return {
            totalMinutes,
            billableMinutes,
            revenue,
            avgMinutesPerDay: totalMinutes / daysInRange,
            daysInRange,
        };
    }, [filteredEntries, startDate, endDate]);

    const dailyChartData: DailyChartData = useMemo(() => {
        const dayMap = new Map<string, Map<string, number>>();
        const projectNames = new Map<string, string>();
        const projectColors = new Map<string, string>();

        let current = startDate;
        while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
            dayMap.set(current.format('YYYY-MM-DD'), new Map());
            current = current.add(1, 'day');
        }

        filteredEntries.forEach((entry) => {
            if (!entry.start_time || !entry.end_time || !entry.project_id) return;
            const project = entry.project || projects.find((p) => p.id === entry.project_id);
            if (!project) return;

            const projectId = project.id || 'unknown';
            projectNames.set(projectId, project.name);
            projectColors.set(projectId, TAILWIND_COLORS[project.color || 0].value);

            const start = dayjs(entry.start_time);
            const end = dayjs(entry.end_time);
            const duration = end.diff(start, 'minute') / 60;
            const dayKey = start.format('YYYY-MM-DD');

            if (dayMap.has(dayKey)) {
                const projectMap = dayMap.get(dayKey)!;
                projectMap.set(projectId, (projectMap.get(projectId) || 0) + duration);
            }
        });

        const data: any[] = [];
        dayMap.forEach((projectMap, dayKey) => {
            const dayData: any = { date: dayjs(dayKey).format('D MMM') };
            projectMap.forEach((hours, projectId) => {
                dayData[projectId] = Number(hours.toFixed(2));
            });
            data.push(dayData);
        });

        return {
            data,
            projectNames: Object.fromEntries(projectNames),
            projectColors: Object.fromEntries(projectColors),
            projectIds: Array.from(projectNames.keys()),
        };
    }, [filteredEntries, projects, startDate, endDate]);

    const pieChartData: PieChartItem[] = useMemo(() => {
        const projectMinutes = new Map<string, { name: string; minutes: number; color: string }>();

        filteredEntries.forEach((entry) => {
            if (!entry.start_time || !entry.end_time || !entry.project_id) return;
            const project = entry.project || projects.find((p) => p.id === entry.project_id);
            if (!project) return;

            const projectId = project.id || 'unknown';
            const start = dayjs(entry.start_time);
            const end = dayjs(entry.end_time);
            const duration = end.diff(start, 'minute');

            if (!projectMinutes.has(projectId)) {
                projectMinutes.set(projectId, {
                    name: project.name,
                    minutes: 0,
                    color: TAILWIND_COLORS[project.color || 0].value,
                });
            }
            projectMinutes.get(projectId)!.minutes += duration;
        });

        return Array.from(projectMinutes.values()).map((p) => ({
            name: p.name,
            value: p.minutes,
            color: p.color,
        }));
    }, [filteredEntries, projects]);

    useEffect(() => {
        const projectMap = new Map<
            string,
            { project: Project; totalMinutes: number; tasks: Map<string, { taskName: string; minutes: number }> }
        >();

        filteredEntries.forEach((entry) => {
            if (!entry.start_time || !entry.end_time || !entry.project_id) return;
            const project = entry.project || projects.find((p) => p.id === entry.project_id);
            if (!project || !project.id) return;

            const start = dayjs(entry.start_time);
            const end = dayjs(entry.end_time);
            const duration = end.diff(start, 'minute');

            if (!projectMap.has(project.id)) {
                projectMap.set(project.id, { project, totalMinutes: 0, tasks: new Map() });
            }

            const pd = projectMap.get(project.id)!;
            pd.totalMinutes += duration;

            if (entry.task) {
                const taskId = entry.task.id || 'unknown';
                if (!pd.tasks.has(taskId)) {
                    pd.tasks.set(taskId, { taskName: entry.task.name, minutes: 0 });
                }
                pd.tasks.get(taskId)!.minutes += duration;
            }
        });

        const totalAll = Array.from(projectMap.values()).reduce((s, p) => s + p.totalMinutes, 0);

        const newData: ProjectRowData[] = Array.from(projectMap.values())
            .map((d) => ({
                id: d.project.id!,
                projectId: d.project.id!,
                projectName: d.project.name,
                projectColor: TAILWIND_COLORS[d.project.color || 0].value,
                totalMinutes: d.totalMinutes,
                percentage: totalAll > 0 ? (d.totalMinutes / totalAll) * 100 : 0,
                tasks: Array.from(d.tasks.entries()).map(([taskId, td]) => ({
                    taskId,
                    taskName: td.taskName,
                    totalMinutes: td.minutes,
                })),
                _expanded: false,
            }))
            .sort((a, b) => b.totalMinutes - a.totalMinutes);

        setProjectDataWithExpansion(newData);
    }, [filteredEntries, projects]);

    const toggleProject = useCallback((projectId: string) => {
        setProjectDataWithExpansion((prev) =>
            prev.map((p) => (p.projectId === projectId ? { ...p, _expanded: !p._expanded } : p))
        );
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
        projectDataWithExpansion,
        selectedClientIds,
        selectedProjectIds,
        toggleProject,
        toggleClient,
        toggleProjectFilter,
    };
}
