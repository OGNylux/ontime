//import { useEffect } from "react";
import Calendar from "../../components/Calendar/CalendarWeek";

export default function Timer() {
    // useEffect(() => {
    //     const prev = document.body.style.overflow;
    //     // Prevent the document from scrolling while on the Timer page so
    //     // the calendar's inner scroll handles vertical movement.
    //     document.body.style.overflow = "hidden";
    //     return () => {
    //         document.body.style.overflow = prev || "";
    //     };
    // }, []);

    return (
        <div className="w-full h-full">
            <div className="w-full h-full shadow-lg overflow-hidden rounded-lg">
                <Calendar />
            </div>
        </div>
    );
}