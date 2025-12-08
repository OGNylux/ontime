import { CSSProperties } from "react";

interface CalendarEntryResizeHandleProps {
    position: "top" | "bottom";
    zIndex?: number;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
}

export default function CalendarEntryResizeHandle({ position, zIndex, onMouseDown, onTouchStart }: CalendarEntryResizeHandleProps) {
    const style: CSSProperties = {
        position: "absolute",
        [position]: 0,
        left: 0,
        right: 0,
        height: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "ns-resize",
        zIndex: zIndex,
        pointerEvents: "auto",
        userSelect: "none",
    };

    return (
        <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={style}
        >
            <span className="text-xs opacity-70">--</span>
        </div>
    );
}
