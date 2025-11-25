import type { MouseEvent } from "react";
import { ENTRY_MARGIN_PERCENT, formatTime, MINUTES_PER_HOUR } from "./calendarUtility";
import { TimeEntry } from "./calendarTypes";

interface CalendarEntryOverlayProps {
    entry: TimeEntry;
    hourHeight: number;
    widthPercent?: number;
    offsetPercent?: number;
    zIndex?: number;
    isPreview?: boolean;
    onDragStart?: (event: MouseEvent<HTMLDivElement>) => void;
}

const MIN_RENDER_WIDTH = 6;

export default function CalendarEntryOverlay({ entry, hourHeight, widthPercent = 100, offsetPercent = 0, zIndex = 100, isPreview = false, onDragStart }: CalendarEntryOverlayProps) {
    const pxPerMinute = hourHeight / MINUTES_PER_HOUR;
    const clampPercent = (value: number) => Math.max(0, Math.min(value, 100));
    const clampedWidth = clampPercent(widthPercent);
    const clampedOffset = clampPercent(offsetPercent);

    let renderOffset = clampedOffset;
    let renderWidth = clampedWidth;

    if (renderWidth >= 100 && renderOffset === 0) {
        renderOffset = ENTRY_MARGIN_PERCENT;
        renderWidth = Math.max(MIN_RENDER_WIDTH, 100 - ENTRY_MARGIN_PERCENT * 2);
    } else {
        if (renderOffset + renderWidth > 100) {
            renderWidth = Math.max(MIN_RENDER_WIDTH, 100 - renderOffset);
        }
        if (renderWidth < MIN_RENDER_WIDTH) {
            renderWidth = MIN_RENDER_WIDTH;
            renderOffset = Math.max(0, Math.min(renderOffset, 100 - renderWidth));
        }
    }

    const baseClasses = "absolute bg-blue-500 bg-opacity-80 transition-all p-1 md:p-2 flex flex-col justify-between text-white overflow-hidden rounded-sm cursor-pointer";
    const interactionClasses = isPreview ? "opacity-90 ring-2 ring-blue-200 ring-offset-1" : "hover:bg-opacity-90";

    return (
        <div
            className={`${baseClasses} ${interactionClasses}`}
            style={{
                top: `${entry.startMinute * pxPerMinute}px`,
                height: `${(entry.endMinute - entry.startMinute) * pxPerMinute}px`,
                width: `${renderWidth}%`,
                left: `${renderOffset}%`,
                zIndex,
                boxShadow: "0 6px 12px rgba(15, 23, 42, 0.18)",
                pointerEvents: isPreview ? "none" : "auto",
            }}
            onMouseDown={onDragStart}
        >
            <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[10px] md:text-sm">
                        {entry.title || 'New Entry'}
                    </p>
                    <p className="text-[8px] md:text-xs opacity-90 truncate">
                        {formatTime(entry.startMinute, true)} - {formatTime(entry.endMinute, true)}
                    </p>
                </div>
            </div>
        </div>
    );
}
