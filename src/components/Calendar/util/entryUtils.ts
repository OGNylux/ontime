import dayjs from "dayjs";
import { EntriesByDay, TimeEntry } from "./calendarTypes";
import { MINUTES_PER_DAY } from "./calendarUtility";
import { CalendarEntryResponseDTO } from "../../../dtos/response/CalendarEntry.response.dto";

export function addEntryToMap(map: EntriesByDay, entry: TimeEntry, dateStr: string) {
    // Always create a new array to avoid mutating existing state
    const existing = map[dateStr] || [];
    map[dateStr] = [...existing, entry].sort((a, b) => a.startMinute - b.startMinute);
}

export function addTimeEntryToMap(
    map: EntriesByDay, 
    dateStr: string, 
    entry: TimeEntry
) {
    if (entry.endMinute > MINUTES_PER_DAY) {
        const firstPartEnd = MINUTES_PER_DAY;
        const secondPartStart = 0;
        const secondPartEnd = entry.endMinute - MINUTES_PER_DAY;
        const nextDay = dayjs(dateStr).add(1, "day").format("YYYY-MM-DD");

        addEntryToMap(map, {
            ...entry,
            endMinute: firstPartEnd
        }, dateStr);

        addEntryToMap(map, {
            ...entry,
            startMinute: secondPartStart,
            endMinute: secondPartEnd
        }, nextDay);
    } else {
        addEntryToMap(map, entry, dateStr);
    }
}

export function convertDtoToTimeEntry(dbEntry: CalendarEntryResponseDTO): TimeEntry {
    return {
        id: dbEntry.id,
        startMinute: dbEntry.start_minute,
        endMinute: dbEntry.end_minute,
        title: dbEntry.task?.name,
        taskId: dbEntry.task_id,
        task: dbEntry.task,
        projectId: dbEntry.project_id,
        isBillable: dbEntry.is_billable,
        originalStartMinute: dbEntry.start_minute,
        originalEndMinute: dbEntry.end_minute
    };
}
