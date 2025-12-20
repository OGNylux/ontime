interface CalendarEntryResizeHandleProps {
    position: "top" | "bottom";
    zIndex?: number;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
}

export default function CalendarEntryResizeHandle({ position, zIndex, onMouseDown, onTouchStart }: CalendarEntryResizeHandleProps) {
    

    return (
        <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            className={`absolute left-0 right-0 h-3 flex items-center justify-center cursor-ns-resize z-${zIndex} pointer-events-auto select-none`}
            style={{ [position]: 0 }}
        >
            <span className="text-xs opacity-70">--</span>
        </div>
    );
}
