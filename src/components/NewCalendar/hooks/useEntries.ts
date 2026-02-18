/**
 * useEntries - fetches calendar entries for the visible date range
 * and provides local-state helpers for optimistic updates.
 *
 * Returns:
 *  • byDate          - { "YYYY-MM-DD": CalendarEntry[] }
 *  • addOrReplace    - upsert one entry locally (optimistic)
 *  • removeLocal     - delete one entry locally (optimistic)
 *  • refetch         - full server round-trip
 */
import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { CalendarEntry, calendarService } from "../../../services/calendarService";
import type { DayInfo } from "../types";

export function useEntries(days: DayInfo[]) {
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(false);

    //  Fetch when visible range changes 
    const fetch = useCallback(async () => {
        if (days.length === 0) return;
        const start = days[0].dateStr;
        const end   = days[days.length - 1].dateStr;
        setLoading(true);
        try {
            setEntries(await calendarService.getEntries(start, end));
        } catch (err) {
            console.error("Failed to fetch entries:", err);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { fetch(); }, [fetch]);

    //  Group by date (multi-day entries appear on each day) 
    const byDate = entries.reduce<Record<string, CalendarEntry[]>>((acc, entry) => {
        const s = dayjs(entry.start_time);
        const e = dayjs(entry.end_time);

        if (s.format("YYYY-MM-DD") === e.format("YYYY-MM-DD")) {
            // Single-day entry
            const key = s.format("YYYY-MM-DD");
            (acc[key] ??= []).push(entry);
        } else {
            // Spans multiple days - add to each
            let cur = s.startOf("day");
            const last = e.startOf("day");
            while (cur.isBefore(last) || cur.isSame(last)) {
                (acc[cur.format("YYYY-MM-DD")] ??= []).push(entry);
                cur = cur.add(1, "day");
            }
        }
        return acc;
    }, {});

    //  Optimistic helpers 
    const addOrReplace = useCallback((entry: CalendarEntry) => {
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

    const removeLocal = useCallback((id: string) => {
        setEntries(prev => prev.filter(e => e.id !== id));
    }, []);

    return { byDate, loading, refetch: fetch, addOrReplace, removeLocal };
}
