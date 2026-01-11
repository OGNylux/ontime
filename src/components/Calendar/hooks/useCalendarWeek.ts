import { useCalendarNavigation } from "./useCalendarNavigation";

export function useCalendarWeekState() {
    const {
        currentDate,
        viewMode,
        setViewMode,
        weekDays,
        handleNext,
        handlePrev,
        goToToday,
        loading,
    } = useCalendarNavigation();
    return {
        weekDays,
        nextWeek: handleNext,
        prevWeek: handlePrev,
        goToToday,
        currentDate,
        viewMode,
        setViewMode,
        loading,
    };
}
