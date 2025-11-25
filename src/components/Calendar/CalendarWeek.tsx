import CalendarDay from "./CalendarDay";
import CalendarTime from "./CalendarTime";
import { useCalendarWeekState } from "./useCalendarWeek";

export default function Calendar() {
    const {
        weekDays,
        entriesByDay,
        moveState,
        handleCreateEntry,
        handleEntryDragStart,
    } = useCalendarWeekState();

    return (
        <div className="w-full h-full overflow-x-auto scrollbar-hide">
            <div className="h-full flex scrollbar-hide">
                <CalendarTime />
                {weekDays.map(day => (
                    <CalendarDay
                        key={day.id}
                        dayIndex={day.id}
                        dayOfTheMonth={day.dayOfTheMonth}
                        dayOfTheWeek={day.dayOfTheWeek}
                        entries={entriesByDay[day.id] ?? []}
                        moveState={moveState}
                        onCreateEntry={handleCreateEntry}
                        onEntryDragStart={handleEntryDragStart}
                    />
                ))}
            </div>
        </div>
    );
}
