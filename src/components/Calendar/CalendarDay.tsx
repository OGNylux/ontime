import CalendarEntryOverlay from "./CalendarEntry";
import { HOURS_PER_DAY } from "./calendarUtility";
import {
    EntryAttributes,
    EntryDragStartPayload,
    MoveState,
    TimeEntry,
} from "./calendarTypes";
import { useCalendarDay } from "./useCalendarDay";

interface CalendarDayProps {
    dayIndex: number;
    dayOfTheMonth: string;
    dayOfTheWeek: string;
    entries: TimeEntry[];
    moveState: MoveState | null;
    onCreateEntry: (dayIndex: number, attributes: EntryAttributes) => void;
    onEntryDragStart: (payload: EntryDragStartPayload) => void;
}

const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);

export default function CalendarDay({
    dayIndex,
    dayOfTheMonth,
    dayOfTheWeek,
    entries,
    moveState,
    onCreateEntry,
    onEntryDragStart,
}: CalendarDayProps) {
    const {
        containerRef,
        hourHeight,
        handleMouseDown,
        handleEntryDragStart,
        renderedEntries,
        dragOverlayEntry,
    } = useCalendarDay({
        dayIndex,
        entries,
        moveState,
        onCreateEntry,
        onEntryDragStart,
    });

    return (
        <div
            className="bg-gray-50 flex-1 md:min-w-24"
            data-day-index={dayIndex}
        >
            <h2 className="h-16 sticky bg-gray-50 z-30 truncate font-semibold text-center text-s md:text-base">
                <p>{dayOfTheWeek}</p>
                <p>{dayOfTheMonth}</p>
            </h2>
            <div ref={containerRef} className="relative" data-day-index={dayIndex}>
                {/* Hour slots grid */}
                {HOURS.map(hour => (
                    <div
                        key={hour}
                        data-hour={hour}
                        className="h-10 md:h-12 border border-gray-200 last:border-b-0 relative select-none transition-all bg-white hover:bg-gray-50 cursor-pointer"
                        onMouseDown={handleMouseDown(hour)}
                    />
                ))}
                {/* Overlays for entries and drag */}
                {renderedEntries.map(({ entry, isPreview }) => (
                    <CalendarEntryOverlay
                        key={`${entry.id}${isPreview ? "-preview" : ""}`}
                        entry={entry}
                        hourHeight={hourHeight}
                        widthPercent={entry.widthPercent}
                        offsetPercent={entry.offsetPercent}
                        zIndex={isPreview ? entry.zIndex + 50 : entry.zIndex}
                        isPreview={isPreview}
                        onDragStart={!isPreview ? (event) => handleEntryDragStart(entry, event) : undefined}
                    />
                ))}
                {dragOverlayEntry && (
                    <CalendarEntryOverlay
                        key="drag"
                        entry={dragOverlayEntry}
                        hourHeight={hourHeight}
                        widthPercent={100}
                        offsetPercent={0}
                        zIndex={200}
                        isPreview
                    />
                )}
            </div>
        </div>
    );
}
