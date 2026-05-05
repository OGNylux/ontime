import { useState, useCallback } from "react";

export interface CalendarPreferences {
    startOfWeek: 'monday' | 'sunday';
    timeFormat: '12h' | '24h';
    showWeekBar: boolean;
}

const STORAGE_KEY = 'ontime_calendar_prefs';

const defaults: CalendarPreferences = {
    startOfWeek: 'monday',
    timeFormat: '24h',
    showWeekBar: true,
};

function load(): CalendarPreferences {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaults;
        return { ...defaults, ...JSON.parse(raw) };
    } catch {
        return defaults;
    }
}

export function useCalendarPreferences() {
    const [prefs, setPrefs] = useState<CalendarPreferences>(load);

    const update = useCallback((patch: Partial<CalendarPreferences>) => {
        setPrefs(prev => {
            const next = { ...prev, ...patch };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    return { prefs, update };
}

export function getCalendarPreferences(): CalendarPreferences {
    return load();
}
