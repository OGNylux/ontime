import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { INTERVAL_MINUTES, MINUTES_PER_DAY } from "./calendarUtility";
import type {
    EntryAttributes,
    EntryDragStartPayload,
    MoveState,
    TimeEntry,
} from "./calendarTypes";

export interface WeekDayInfo {
    id: number;
    dayOfTheMonth: string;
    dayOfTheWeek: string;
}

export type EntriesByDay = Record<number, TimeEntry[]>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snapToInterval = (value: number) => Math.round(value / INTERVAL_MINUTES) * INTERVAL_MINUTES;

const generateEntryId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const findDayElement = (clientX: number, clientY: number) => {
    if (typeof document === "undefined") return null;
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const element of elements) {
        const dayElement = element.closest<HTMLElement>("[data-day-index]");
        if (dayElement) return dayElement;
    }
    return null;
};

const buildWeekDays = (): WeekDayInfo[] => {
    const start = dayjs().startOf("week");
    return Array.from({ length: 7 }).map((_, index) => {
        const day = start.add(index, "day");
        return {
            id: index,
            dayOfTheMonth: day.format("DD"),
            dayOfTheWeek: day.format("ddd"),
        };
    });
};

export function useCalendarWeekState() {
    const weekDays = useMemo(buildWeekDays, []);
    const [entriesByDay, setEntriesByDay] = useState<EntriesByDay>({});
    const [moveState, setMoveState] = useState<MoveState | null>(null);

    const addEntry = useCallback((dayIndex: number, attributes: EntryAttributes) => {
        setEntriesByDay(prev => {
            const next: EntriesByDay = { ...prev };
            const nextEntries = next[dayIndex] ? [...next[dayIndex]] : [];
            nextEntries.push({
                id: generateEntryId(),
                startMinute: attributes.startMinute,
                endMinute: attributes.endMinute,
                title: attributes.title,
                color: attributes.color,
            });
            nextEntries.sort((a, b) => a.startMinute - b.startMinute);
            next[dayIndex] = nextEntries;
            return next;
        });
    }, []);

    const calculateMovePosition = useCallback((clientX: number, clientY: number, state: MoveState) => {
        const dayElement = findDayElement(clientX, clientY);
        if (!dayElement) return null;

        const dayIndexAttr = dayElement.getAttribute("data-day-index");
        if (dayIndexAttr === null) return null;

        const targetDayIndex = Number(dayIndexAttr);
        if (Number.isNaN(targetDayIndex)) return null;

        const rect = dayElement.getBoundingClientRect();
        if (rect.height <= 0) return null;

        const offsetY = clamp(clientY - rect.top, 0, rect.height);
        const fractionOfDay = offsetY / rect.height;
        const minutesFromTop = fractionOfDay * MINUTES_PER_DAY;
        const pointerMinute = clamp(snapToInterval(minutesFromTop), 0, MINUTES_PER_DAY);

        let startMinute = pointerMinute - state.pointerOffset;
        startMinute = snapToInterval(startMinute);
        startMinute = clamp(startMinute, 0, MINUTES_PER_DAY - state.duration);
        const endMinute = startMinute + state.duration;
        return { targetDayIndex, startMinute, endMinute };
    }, []);

    const commitMove = useCallback((move: MoveState, target: { dayIndex: number; startMinute: number; endMinute: number }) => {
        setEntriesByDay(prev => {
            const next: EntriesByDay = { ...prev };

            const sourceEntries = (next[move.fromDayIndex] ?? []).filter(entry => entry.id !== move.entry.id);
            if (sourceEntries.length) {
                next[move.fromDayIndex] = sourceEntries;
            } else {
                delete next[move.fromDayIndex];
            }

            const updatedEntry: TimeEntry = {
                ...move.entry,
                startMinute: target.startMinute,
                endMinute: target.endMinute,
            };

            const destinationEntries = next[target.dayIndex] ? [...next[target.dayIndex]] : [];
            const filteredDestination = destinationEntries.filter(entry => entry.id !== move.entry.id);
            filteredDestination.push(updatedEntry);
            filteredDestination.sort((a, b) => a.startMinute - b.startMinute);
            next[target.dayIndex] = filteredDestination;

            return next;
        });
    }, []);

    const beginMove = useCallback((payload: EntryDragStartPayload) => {
        setMoveState(prev => {
            if (prev) return prev;
            const dayEntries = entriesByDay[payload.dayIndex] ?? [];
            const entry = dayEntries.find(item => item.id === payload.entryId);
            if (!entry) return prev;

            const baseState: MoveState = {
                entry,
                fromDayIndex: payload.dayIndex,
                pointerOffset: payload.pointerOffset,
                duration: entry.endMinute - entry.startMinute,
                currentDayIndex: payload.dayIndex,
                startMinute: entry.startMinute,
                endMinute: entry.endMinute,
            };

            if (typeof window === "undefined") {
                return baseState;
            }

            const nextPosition = calculateMovePosition(payload.clientX, payload.clientY, baseState);
            if (nextPosition) {
                return {
                    ...baseState,
                    currentDayIndex: nextPosition.targetDayIndex,
                    startMinute: nextPosition.startMinute,
                    endMinute: nextPosition.endMinute,
                };
            }

            return baseState;
        });
    }, [calculateMovePosition, entriesByDay]);

    useEffect(() => {
        if (!moveState) return;

        const handleMouseMove = (event: globalThis.MouseEvent) => {
            setMoveState(prev => {
                if (!prev) return prev;
                const nextPosition = calculateMovePosition(event.clientX, event.clientY, prev);
                if (!nextPosition) return prev;
                if (
                    nextPosition.targetDayIndex === prev.currentDayIndex &&
                    nextPosition.startMinute === prev.startMinute
                ) {
                    return prev;
                }

                return {
                    ...prev,
                    currentDayIndex: nextPosition.targetDayIndex,
                    startMinute: nextPosition.startMinute,
                    endMinute: nextPosition.endMinute,
                };
            });
        };

        const handleMouseUp = (event: globalThis.MouseEvent) => {
            setMoveState(prev => {
                if (!prev) return prev;
                const nextPosition = calculateMovePosition(event.clientX, event.clientY, prev);
                const targetDayIndex = nextPosition?.targetDayIndex ?? prev.currentDayIndex;
                const startMinute = nextPosition?.startMinute ?? prev.startMinute;
                const endMinute = nextPosition?.endMinute ?? prev.endMinute;

                commitMove(prev, { dayIndex: targetDayIndex, startMinute, endMinute });
                return null;
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [moveState ? moveState.entry.id : null, calculateMovePosition, commitMove]);

    return {
        weekDays,
        entriesByDay,
        moveState,
        handleCreateEntry: addEntry,
        handleEntryDragStart: beginMove,
    };
}
