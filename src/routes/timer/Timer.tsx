import Calendar from "../../components/Calendar/CalendarWeek";

export default function Timer() {
    return (
        <div className="h" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <h1 className="text-2xl font-bold mb-4">Timer Page</h1>
            <div style={{ flex: 1, overflowY: "auto" }}>
                <Calendar />
            </div>
        </div>
    );
}