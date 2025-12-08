import { useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { ViewMode, WeekDayInfo } from "../util/calendarTypes";

export function useCalendarNavigation() {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [viewMode, setViewMode] = useState<ViewMode>('week');

    const weekDays = useMemo(() => {
        if (viewMode === 'day') {
            return [{
                id: 0,
                dateStr: currentDate.format("YYYY-MM-DD"),
                dayOfTheMonth: currentDate.format("DD"),
                dayOfTheWeek: currentDate.format("ddd"),
            }] as WeekDayInfo[];
        }

        // Ensure the calendar week starts on Monday.
        const start = currentDate.startOf("week").add(1, "day");
        const length = viewMode === 'work_week' ? 5 : 7;

        return Array.from({ length }).map((_, index) => {
            const day = start.add(index, "day");
            return {
                id: index,
                dateStr: day.format("YYYY-MM-DD"),
                dayOfTheMonth: day.format("DD"),
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

    const goToToday = useCallback(() => setCurrentDate(dayjs()), []);

    return {
        currentDate,
        viewMode,
        setViewMode,
        weekDays,
        handleNext,
        handlePrev,
        goToToday
    };
}
