interface CalendarEntryResizeHandleProps {
    position: "top" | "bottom";
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart?: (e: React.TouchEvent) => void;
}

export default function CalendarEntryResizeHandle({ position, onMouseDown }: CalendarEntryResizeHandleProps) {

    return (
        <div
            onPointerDown={(e: React.PointerEvent) => { e.stopPropagation(); if (onMouseDown) onMouseDown(e as any); }}
            className={`resize-handle absolute left-0 right-0 h-3 flex items-center justify-center cursor-ns-resize pointer-events-auto select-none`}
            style={{ [position]: 0 }}
            // aria-hidden since it's purely interactive via pointer
            aria-hidden={false}
        >
            <span style={{ opacity: 0.85, fontSize: 10 }}>--</span>
        </div>
    );
}
