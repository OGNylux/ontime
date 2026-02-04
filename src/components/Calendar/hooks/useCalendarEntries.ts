import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { CalendarEntry, calendarService } from "../../../services/calendarService";
import { WeekDayInfo } from "./useCalendarNavigation";

export function useCalendarEntries(weekDays: WeekDayInfo[]) {
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchEntries = useCallback(async () => {
        if (weekDays.length === 0) return;

        const startDate = weekDays[0].dateStr;
        const endDate = weekDays[weekDays.length - 1].dateStr;

        setLoading(true);
        setError(null);

        try {
            const data = await calendarService.getEntries(startDate, endDate);
            setEntries(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Failed to fetch entries"));
        } finally {
            setLoading(false);
        }
    }, [weekDays]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const entriesByDate = entries.reduce<Record<string, CalendarEntry[]>>((acc, entry) => {
        const startDate = dayjs(entry.start_time);
        const endDate = dayjs(entry.end_time);
        const startDateStr = startDate.format("YYYY-MM-DD");
        const endDateStr = endDate.format("YYYY-MM-DD");

        if (startDateStr === endDateStr) {
            if (!acc[startDateStr]) {
                acc[startDateStr] = [];
            }
            acc[startDateStr].push(entry);
        } else {
            let currentDate = startDate.startOf('day');
            const endDateMidnight = endDate.startOf('day');

            while (currentDate.isBefore(endDateMidnight) || currentDate.isSame(endDateMidnight)) {
                const dateStr = currentDate.format("YYYY-MM-DD");
                if (!acc[dateStr]) {
                    acc[dateStr] = [];
                }
                acc[dateStr].push(entry);
                currentDate = currentDate.add(1, 'day');
            }
        }
        return acc;
    }, {});

    const addOrReplaceEntry = useCallback((entry: CalendarEntry) => {
        setEntries(prev => {
            const idx = prev.findIndex(e => e.id === entry.id);
            if (idx >= 0) {
                const next = prev.slice();
                next[idx] = entry;
                return next;
            }
            return [...prev, entry];
        });
    }, []);

    const removeEntryLocal = useCallback((id: string) => {
        setEntries(prev => prev.filter(e => e.id !== id));
    }, []);

    return {
        entries,
        entriesByDate,
        loading,
        error,
        refetch: fetchEntries,
        addOrReplaceEntry,
        removeEntryLocal,
    };
}
