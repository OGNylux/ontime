import { useCalendarNavigation } from "./useCalendarNavigation";

export function useCalendarWeekState() {
    const {
        currentDate,
        viewMode,
        setViewMode,
        weekDays,
        handleNext,
        handlePrev,
        goToToday
    } = useCalendarNavigation();
    return {
        weekDays,
        nextWeek: handleNext,
        prevWeek: handlePrev,
        goToToday,
        currentDate,
        viewMode,
        setViewMode
    };
}
