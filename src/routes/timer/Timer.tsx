import Calendar from "../../components/Calendar/CalendarWeek";

export default function Timer() {
    return (
        <div className="h">
            <h1 className="text-2xl font-bold mb-4">Timer Page</h1>
            <div className="h-vh overflow-hidden">
                <Calendar />
            </div>
        </div>
    );
}