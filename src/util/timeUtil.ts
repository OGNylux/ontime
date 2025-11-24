import dayjs from "dayjs";

export function formatTime(hourOrMinute: number, useMinutes: boolean = false) {
    if (useMinutes) {
        const hour = Math.floor(hourOrMinute / 60);
        const minute = hourOrMinute % 60;
        return dayjs().hour(hour).minute(minute).format("h:mm A");
    }
    return dayjs().hour(hourOrMinute).format("h:00 A");
}

export function roundTo15Minutes(minute: number) {
    return Math.round(minute / 15) * 15;
}