import dayjs from "dayjs";
import CalendarDay from "./CalendarDay";
import CalendarTime from "./CalendarTime";


export default function Calendar() {
    const startOfWeek = dayjs().startOf("week");

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const dayOfTheMonth: string = startOfWeek.add(i, "day").format("DD");
        const dayOfTheWeek: string = startOfWeek.add(i, "day").format("ddd");

        return {
            id: i,
            dayOfTheMonth: dayOfTheMonth,
            dayOfTheWeek: dayOfTheWeek
        };
    });
    return (
        <div className="w-full h-full overflow-x-auto scrollbar-hide">
            <div className="h-full flex scrollbar-hide">
                <CalendarTime />
                {weekDays.map((day) => (
                    <CalendarDay key={day.id} dayOfTheMonth={day.dayOfTheMonth} dayOfTheWeek={day.dayOfTheWeek} />
                ))}
            </div>
        </div>
    );
}
