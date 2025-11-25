import dayjs from "dayjs";
import { AssignedEntry, TimeEntry } from "./calendarTypes";

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const HOURS_PER_DAY = 24;
export const INTERVAL_MINUTES = 15;

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

const OVERLAP_PERCENT = 4;
const MIN_WIDTH = 22;
export const ENTRY_MARGIN_PERCENT = 4;
const INNER_SCALE = (100 - ENTRY_MARGIN_PERCENT * 2) / 100;

export function assignEntryLayout(entries: TimeEntry[]): AssignedEntry[] {
    if (!entries.length) return [];

    const sorted = [...entries].sort((a, b) => (a.startMinute - b.startMinute) || (a.endMinute - b.endMinute));
    const groups: TimeEntry[][] = [];
    let currentGroup: TimeEntry[] = [];
    let currentGroupEnd = -1;

    sorted.forEach(entry => {
        if (!currentGroup.length) {
            currentGroup = [entry];
            currentGroupEnd = entry.endMinute;
            return;
        }

        if (entry.startMinute < currentGroupEnd) {
            currentGroup.push(entry);
            currentGroupEnd = Math.max(currentGroupEnd, entry.endMinute);
        } else {
            groups.push(currentGroup);
            currentGroup = [entry];
            currentGroupEnd = entry.endMinute;
        }
    });

    if (currentGroup.length) {
        groups.push(currentGroup);
    }

    const annotated: AssignedEntry[] = [];

    groups.forEach(group => {
        const weights = group.map((_, index) => group.length - index + 1);
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let cumulativeWidth = 0;

        group.forEach((entry, index) => {
            const baseWidth = (weights[index] / totalWeight) * 100;
            const overlapShare = index === 0 ? 0 : Math.min(OVERLAP_PERCENT * index, cumulativeWidth);
            let offsetPercent = Math.max(0, cumulativeWidth - overlapShare);
            let widthPercent = Math.min(100 - offsetPercent, baseWidth + overlapShare);

            if (widthPercent < MIN_WIDTH) {
                widthPercent = MIN_WIDTH;
                if (offsetPercent + widthPercent > 100) {
                    offsetPercent = Math.max(0, 100 - widthPercent);
                }
            }

            if (offsetPercent + widthPercent > 100) {
                widthPercent = Math.max(MIN_WIDTH, 100 - offsetPercent);
            }

            let scaledOffset = ENTRY_MARGIN_PERCENT + offsetPercent * INNER_SCALE;
            let scaledWidth = widthPercent * INNER_SCALE;

            if (scaledOffset + scaledWidth > 100) {
                scaledWidth = Math.max(MIN_WIDTH, 100 - scaledOffset);
            }

            if (scaledWidth < MIN_WIDTH) {
                scaledWidth = MIN_WIDTH;
                if (scaledOffset + scaledWidth > 100) {
                    scaledOffset = Math.max(ENTRY_MARGIN_PERCENT, 100 - scaledWidth);
                }
            }

            const zIndex = 200 + index;
            annotated.push({ ...entry, widthPercent: scaledWidth, offsetPercent: scaledOffset, zIndex });
            cumulativeWidth += baseWidth;
        });
    });

    return annotated;
}


