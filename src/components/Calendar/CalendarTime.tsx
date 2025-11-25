import { formatTime } from "./calendarUtility";

export default function CalendarTime() {
    const hours = Array.from({ length: 23 }).map((_, i) => i);

    return (
        <div className="bg-gray-50 w-16 md:w-20 lg:w-20">
            <h2 className="h-16 px-1 md:px-2 lg:px-4 font-semibold text-center sticky top-0 bg-gray-50 z-30 truncate text-s md:text-base">Time</h2>
            {hours.map((hour) => (
                <div key={hour} className="h-10 md:h-12 bg-white relative group">
                    <p className="z-30 absolute -bottom-1 right-1 md:right-2 text-xs md:text-s">{formatTime(hour+1)}</p>
                </div>
            ))}
        </div>
    );
}
