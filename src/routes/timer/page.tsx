import Calendar from "../../components/Calendar/CalendarWeek";

export default function Timer() {
    return (
        <div className="w-full h-full">
            <div className="w-full h-full shadow-lg overflow-hidden rounded-lg">
                <Calendar />
            </div>
        </div>
    );
}