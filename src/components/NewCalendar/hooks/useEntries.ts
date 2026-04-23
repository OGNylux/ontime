/**
 * useEntries - fetches calendar entries for the visible date range
 * and provides local-state helpers for optimistic updates.
 *
 * Returns:
 *  • byDate          - { "YYYY-MM-DD": CalendarEntry[] }
 *  • addOrReplace    - upsert one entry locally (optimistic)
 *  • removeLocal     - delete one entry locally (optimistic)
 *  • refetch         - full server round-trip
 *  • prefetch        - background-load a date range into the cache
 */
import { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import { CalendarEntry, calendarService } from "../../../services/calendarService";
import type { DayInfo } from "../types";

export function useEntries(days: DayInfo[]) {
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const cache = useRef<Map<string, CalendarEntry[]>>(new Map());
    const inFlight = useRef<Set<string>>(new Set());

    const cacheKey = useCallback((start: string, end: string) => `${start}|${end}`, []);

    /** Fetch a range, update the cache, and optionally update visible state. */
    const fetchRange = useCallback(async (start: string, end: string, updateState: boolean) => {
        const key = cacheKey(start, end);
        if (inFlight.current.has(key)) return;
        inFlight.current.add(key);
        try {
            const data = await calendarService.getEntries(start, end);
            cache.current.set(key, data);
            if (updateState) setEntries(data);
        } catch (err) {
            console.error("Failed to fetch entries:", err);
        } finally {
            inFlight.current.delete(key);
            if (updateState) setLoading(false);
        }
    }, [cacheKey]);

    const fetch = useCallback(async () => {
        if (days.length === 0) return;
        const start = days[0].dateStr;
        const end = days[days.length - 1].dateStr;
        const key = cacheKey(start, end);

        const cached = cache.current.get(key);
        if (cached) {
            setEntries(cached);
            fetchRange(start, end, true);
        } else {
            setLoading(true);
            await fetchRange(start, end, true);
        }
    }, [days, cacheKey, fetchRange]);

    /** Pre-load a date range into the cache without touching visible state. */
    const prefetch = useCallback((start: string, end: string) => {
        const key = cacheKey(start, end);
        if (cache.current.has(key) || inFlight.current.has(key)) return;
        fetchRange(start, end, false);
    }, [cacheKey, fetchRange]);

    useEffect(() => { fetch(); }, [fetch]);

    // Stable refs so the realtime handler always has the latest callbacks without
    // re-subscribing on every render.
    const addOrReplaceRef = useRef<(e: CalendarEntry) => void>(() => { });
    const removeLocalRef = useRef<(id: string) => void>(() => { });
    const daysRef = useRef(days);

    // Single long-lived Realtime channel – receives INSERT / UPDATE / DELETE
    // events for ontime_calendar_entry and mirrors them into local state.
    useEffect(() => {
        return calendarService.subscribeToChanges({
            onInsertOrUpdate: async (id, startTime, eventType) => {
                cache.current.clear();
                const entryDate   = dayjs(startTime).format('YYYY-MM-DD');
                const currentDays = daysRef.current;
                const inRange     = currentDays.length > 0
                    && entryDate >= currentDays[0].dateStr
                    && entryDate <= currentDays[currentDays.length - 1].dateStr;

                if (inRange) {
                    try {
                        addOrReplaceRef.current(await calendarService.getEntryById(id));
                    } catch {
                        removeLocalRef.current(id);
                    }
                } else if (eventType === 'UPDATE') {
                    removeLocalRef.current(id);
                }
            },
            onDelete: (id) => {
                cache.current.clear();
                removeLocalRef.current(id);
            },
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const byDate = entries.reduce<Record<string, CalendarEntry[]>>((acc, entry) => {
        const start = dayjs(entry.start_time);
        const end = dayjs(entry.end_time);

        if (start.format("YYYY-MM-DD") === end.format("YYYY-MM-DD")) {
            // Single-day entry
            const key = start.format("YYYY-MM-DD");
            (acc[key] ??= []).push(entry);
        } else {
            // Spans multiple days - add to each
            let current = start.startOf("day");
            const last = end.startOf("day");
            while (current.isBefore(last) || current.isSame(last)) {
                (acc[current.format("YYYY-MM-DD")] ??= []).push(entry);
                current = current.add(1, "day");
            }
        }
        return acc;
    }, {});

    //  Optimistic helpers (also keep cache in sync for the current range)
    const addOrReplace = useCallback((entry: CalendarEntry) => {
        setEntries(prev => {
            const next = (() => {
                const idx = prev.findIndex(e => e.id === entry.id);
                if (idx >= 0) {
                    const a = prev.slice();
                    a[idx] = entry;
                    return a;
                }
                return [...prev, entry];
            })();
            // Invalidate cached range so next visit re-fetches fresh data
            if (days.length) {
                cache.current.delete(cacheKey(days[0].dateStr, days[days.length - 1].dateStr));
            }
            return next;
        });
    }, [days, cacheKey]);

    const removeLocal = useCallback((id: string) => {
        setEntries(prev => {
            if (days.length) {
                cache.current.delete(cacheKey(days[0].dateStr, days[days.length - 1].dateStr));
            }
            return prev.filter(e => e.id !== id);
        });
    }, [days, cacheKey]);

    // Keep refs in sync after the callbacks are defined.
    useEffect(() => { addOrReplaceRef.current = addOrReplace; }, [addOrReplace]);
    useEffect(() => { removeLocalRef.current = removeLocal; }, [removeLocal]);
    useEffect(() => { daysRef.current = days; }, [days]);

    return { byDate, loading, refetch: fetch, addOrReplace, removeLocal, prefetch };
}
