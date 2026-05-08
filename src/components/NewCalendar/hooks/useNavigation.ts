/**
 * useNavigation - manages the current date, view mode, and visible days.
 *
 * Returns:
 *  • days        - array of DayInfo for the visible columns
 *  • goNext / goPrev / goToday - navigation actions
 *  • viewMode / setViewMode    - day | work_week | week
 *  • loading     - true while timezone is loading
 */
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { dayjs, getBrowserTimezone } from "../../../lib/timezone";
import { useUserTimezone } from "../../../hooks/useUserTimezone";
import type { ViewMode, DayInfo } from "../types";

export function useNavigation() {
    const { timezone, loading: tzLoading } = useUserTimezone();
    // Initialise with browser timezone immediately so the calendar renders without waiting.
    const [date, setDate] = useState(() => dayjs().tz(getBrowserTimezone()));
    const [viewMode, setViewMode] = useState<ViewMode>("week");

    // Once the DB timezone loads, correct the date only if it differs from the browser tz.
    const tzAppliedRef = useRef(false);
    useEffect(() => {
        if (tzLoading || tzAppliedRef.current) return;
        tzAppliedRef.current = true;
        if (timezone !== getBrowserTimezone()) setDate(dayjs().tz(timezone));
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
        loading: false,
    };
}
