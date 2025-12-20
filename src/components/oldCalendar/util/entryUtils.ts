import dayjs from "dayjs";
import { EntriesByDay, CalendarEntry } from "./calendarTypes";

export function addEntryToMap(map: EntriesByDay, entry: CalendarEntry, dateStr: string) {
    // Always create a new array to avoid mutating existing state
    const existing = map[dateStr] || [];
    map[dateStr] = [...existing, entry].sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export function addCalendarEntryToMap(
    map: EntriesByDay, 
    entry: CalendarEntry
) {
    const start = dayjs(entry.start_time);
    const end = dayjs(entry.end_time);
    
    const startDateStr = start.format("YYYY-MM-DD");
    const endDateStr = end.format("YYYY-MM-DD");

    if (startDateStr === endDateStr) {
        addEntryToMap(map, entry, startDateStr);
    } else {
        // Split entry across days
        let current = start.startOf('day');
        const endDay = end.startOf('day');

        while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
            const currentDateStr = current.format("YYYY-MM-DD");
            
            let entryStart = entry.start_time;
            let entryEnd = entry.end_time;

            if (currentDateStr === startDateStr) {
                // First day: start at entry start, end at end of day
                entryEnd = current.endOf('day').toISOString();
            } else if (currentDateStr === endDateStr) {
                // Last day: start at start of day, end at entry end
                entryStart = current.startOf('day').toISOString();
            } else {
                // Middle day: full day
                entryStart = current.startOf('day').toISOString();
                entryEnd = current.endOf('day').toISOString();
            }

            addEntryToMap(map, {
                ...entry,
                start_time: entryStart,
                end_time: entryEnd
            }, currentDateStr);

            current = current.add(1, 'day');
        }
    }
}
