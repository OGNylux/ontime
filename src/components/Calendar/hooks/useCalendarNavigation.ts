import { useState, useMemo, useCallback, useEffect } from "react";
import { dayjs } from "../../../lib/timezone";
import { useUserTimezone } from "../../../hooks/useUserTimezone";

export type ViewMode = 'day' | 'work_week' | 'week';

export interface WeekDayInfo {
    id: number;
    dateStr: string; // YYYY-MM-DD
    dayOfTheMonth: string; // DD
    dayOfTheWeek: string; // e.g., Mon, Tue
}

export function useCalendarNavigation() {
    const { timezone, loading: tzLoading } = useUserTimezone();
    const [currentDate, setCurrentDate] = useState(() => dayjs());
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [initialized, setInitialized] = useState(false);

    // Initialize and update currentDate when timezone loads/changes
    useEffect(() => {
        if (!tzLoading) {
            // Get current time in user's timezone
            const now = dayjs().tz(timezone);
            setCurrentDate(now);
            setInitialized(true);
        }
    }, [timezone, tzLoading]);

    const weekDays = useMemo(() => {
        if (viewMode === 'day') {
            return [{
                id: 0,
                dateStr: currentDate.format("YYYY-MM-DD"),
                dayOfTheMonth: currentDate.format("D"),
                dayOfTheWeek: currentDate.format("ddd"),
            }] as WeekDayInfo[];
        }

        // Ensure the calendar week starts on Monday (using ISO week where Monday = day 1)
        const start = currentDate.startOf("isoWeek");
        const length = viewMode === 'work_week' ? 5 : 7;

        return Array.from({ length }).map((_, index) => {
            const day = start.add(index, "day");
            return {
                id: index,
                dateStr: day.format("YYYY-MM-DD"),
                dayOfTheMonth: day.format("D"),
                dayOfTheWeek: day.format("ddd"),
            };
        }) as WeekDayInfo[];
    }, [currentDate, viewMode]);

    const handleNext = useCallback(() => {
        if (viewMode === 'day') {
            setCurrentDate(d => d.add(1, "day"));
        } else {
            setCurrentDate(d => d.add(1, "week"));
        }
    }, [viewMode]);

    const handlePrev = useCallback(() => {
        if (viewMode === 'day') {
            setCurrentDate(d => d.subtract(1, "day"));
        } else {
            setCurrentDate(d => d.subtract(1, "week"));
        }
    }, [viewMode]);

    const goToToday = useCallback(() => setCurrentDate(dayjs().tz(timezone)), [timezone]);

    return {
        currentDate,
        viewMode,
        setViewMode,
        weekDays,
        handleNext,
        handlePrev,
        goToToday,
        loading: !initialized || tzLoading,
    };
}
