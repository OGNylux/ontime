import { formatTime } from "../../util/timeUtil";


interface TimeEntry {
    id: string;
    startMinute: number; // minutes since midnight
    endMinute: number;   // minutes since midnight
    title?: string;
    color?: string;
}

interface CalendarEntryOverlayProps {
    entry: TimeEntry;
    hourHeight: number;
}

const MINPERHOUR = 60;

export default function CalendarEntryOverlay({ entry, hourHeight }: CalendarEntryOverlayProps) {
    
    const pxPerMinute = hourHeight / MINPERHOUR;
    return (
        <div
            className="w-11/12 absolute left-0 right-0 bg-blue-500 bg-opacity-80 hover:bg-opacity-90 transition-all p-1 md:p-2 flex flex-col justify-between text-white overflow-hidden rounded-sm pointer-events-auto"
            style={{
                top: `${entry.startMinute * pxPerMinute}px`,
                height: `${(entry.endMinute - entry.startMinute) * pxPerMinute}px`,
            }}
        >
            <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[10px] md:text-sm truncate">
                        {entry.title || 'New Entry'}
                    </p>
                    <p className="text-[8px] md:text-xs opacity-90">
                        {formatTime(entry.startMinute, true)} - {formatTime(entry.endMinute, true)}
                    </p>
                </div>
            </div>
        </div>
    );
}
