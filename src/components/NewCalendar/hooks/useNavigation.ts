/**
 * useNavigation - manages the current date, view mode, and visible days.
 *
 * Returns:
 *  • days        - array of DayInfo for the visible columns
 *  • goNext / goPrev / goToday - navigation actions
 *  • viewMode / setViewMode    - day | work_week | week
 *  • loading     - true while timezone is loading
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { dayjs } from "../../../lib/timezone";
import { useUserTimezone } from "../../../hooks/useUserTimezone";
import type { ViewMode, DayInfo } from "../types";

export function useNavigation() {
    const { timezone, loading: tzLoading } = useUserTimezone();
    const [date, setDate] = useState(() => dayjs());
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!tzLoading) {
            setDate(dayjs().tz(timezone));
            setReady(true);
        }
    }, [timezone, tzLoading]);

    const days: DayInfo[] = useMemo(() => {
        if (viewMode === "day") {
            return [{
                dateStr: date.format("YYYY-MM-DD"),
                dayOfMonth: date.format("D"),
                dayOfWeek: date.format("ddd"),
            }];
        }
        const start = date.startOf("isoWeek");
        const count = viewMode === "work_week" ? 5 : 7;
        return Array.from({ length: count }, (_, i) => {
            const day = start.add(i, "day");
            return {
                dateStr: day.format("YYYY-MM-DD"),
                dayOfMonth: day.format("D"),
                dayOfWeek: day.format("ddd"),
            };
        });
    }, [date, viewMode]);

    const goToday = useCallback(() => setDate(dayjs().tz(timezone)), [timezone]);

    const goNext = useCallback(() => {
        setDate(d => d.add(viewMode === "day" ? 1 : 1, viewMode === "day" ? "day" : "week"));
    }, [viewMode]);
    const goPrev = useCallback(() => {
        setDate(d => d.subtract(viewMode === "day" ? 1 : 1, viewMode === "day" ? "day" : "week"));
    }, [viewMode]);

    return {
        days,
        viewMode,
        setViewMode,
        goNext,
        goPrev,
        goToday,
        loading: !ready || tzLoading,
    };
}
