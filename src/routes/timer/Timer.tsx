import { useEffect } from "react";
import Calendar from "../../components/Calendar/CalendarWeek";

export default function Timer() {
    useEffect(() => {
        const prev = document.body.style.overflow;
        // Prevent the document from scrolling while on the Timer page so
        // the calendar's inner scroll handles vertical movement.
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev || "";
        };
    }, []);

    return (
        <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
            <h1 className="text-2xl font-bold mb-4">Timer Page</h1>
            <div className="scrollbar-hide" style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ height: "100%" }}>
                    <Calendar />
                </div>
            </div>
        </div>
    );
}