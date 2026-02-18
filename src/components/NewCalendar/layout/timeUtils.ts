/**
 * timeUtils.ts - pure functions for time math & formatting.
 *
 * No React, no side-effects - easy to unit-test.
 */
import dayjs from "dayjs";
import { MINUTES_PER_HOUR, MINUTES_PER_DAY, SNAP_INTERVAL } from "../constants";

//  Clamping & snapping 

export const clamp    = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const clampMin = (m: number) => clamp(m, 0, MINUTES_PER_DAY);
export const snap     = (m: number) => Math.round(m / SNAP_INTERVAL) * SNAP_INTERVAL;

//  Conversions 

/** "HH:mm" -> total minutes since midnight. */
export function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * MINUTES_PER_HOUR + m;
}

/** Total minutes since midnight -> "HH:mm". */
export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / MINUTES_PER_HOUR);
    const m = minutes % MINUTES_PER_HOUR;
    return dayjs().hour(h).minute(m).format("HH:mm");
}

/** Total minutes -> "H:MM:SS" duration label. */
export function formatDuration(minutes: number): string {
    if (!minutes || minutes <= 0) return "0:00:00";
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hrs}:${mins.toString().padStart(2, "0")}:00`;
}

/** Hour (0-23) or minute (when `useMinutes`) -> "h:mm A" display. */
export function formatTimeLabel(minute: number): string {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return dayjs().hour(h).minute(m).format("h:mm A");
}

//  DOM helpers (used by move / resize) 

/** Walk up from the element at (x,y) until we find one with data-date. */
export function findDayElement(x: number, y: number): HTMLElement | null {
    if (typeof document === "undefined") return null;
    for (const el of document.elementsFromPoint(x, y)) {
        const day = el.closest<HTMLElement>("[data-date]");
        if (day) return day;
    }
    return null;
}

/** Extract clientX/clientY from any pointer-like event. */
export function clientCoords(
    e: MouseEvent | TouchEvent | PointerEvent,
    useTouches = true,
): { clientX: number; clientY: number } {
    if (useTouches && "touches" in e && e.touches.length)
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    if (useTouches && "changedTouches" in e && e.changedTouches.length)
        return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
}

//  Body-scroll lock (move / resize prevent scroll) 

export interface SavedBodyStyles {
    overflow: string;
    touchAction: string;
    userSelect: string;
    webkitUserSelect: string;
}

export function lockBodyScroll(): SavedBodyStyles {
    const saved: SavedBodyStyles = {
        overflow: document.body.style.overflow,
        touchAction: document.body.style.touchAction,
        userSelect: document.body.style.userSelect,
        webkitUserSelect: (document.body.style as any).webkitUserSelect || "",
    };
    Object.assign(document.body.style, {
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        webkitUserSelect: "none",
    });
    return saved;
}

export function unlockBodyScroll(saved: SavedBodyStyles) {
    Object.assign(document.body.style, saved);
}
