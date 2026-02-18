/**
 * layoutEntries.ts - overlap algorithm for calendar entries.
 *
 * Given a list of CalendarEntry objects for one day, returns LayoutEntry[]
 * with pixel positions and widths so overlapping entries sit side-by-side.
 *
 * Algorithm:
 *  1. Sort entries by start time.
 *  2. Greedily assign each entry to the first column whose last entry
 *     ended before this one starts ("column packing").
 *  3. Sweep through all unique time-points to find peak concurrency
 *     for each entry.
 *  4. Use concurrency to compute width%, offset%, and z-index.
 */
import dayjs from "dayjs";
import { CalendarEntry } from "../../../services/calendarService";
import type { LayoutEntry } from "../types";
import {
    ENTRY_MARGIN_PCT,
    ENTRY_OVERLAP_PCT,
    ENTRY_MIN_WIDTH,
    ENTRY_SCALE_FACTOR,
    MINUTES_PER_HOUR,
} from "../constants";

const INNER_SCALE = (100 - ENTRY_MARGIN_PCT * 2) / 100;

//  Internal type with raw minute bounds 

interface Measured {
    entry: CalendarEntry;
    startMin: number;
    endMin: number;
}

export function layoutEntries(
    entries: CalendarEntry[],
    hourHeight: number,
    titleHeightPx: number,
    dateStr: string,
): LayoutEntry[] {
    if (entries.length === 0) return [];

    const measured = measure(entries, dateStr);
    const columnOf = assignColumns(measured);
    const peakOf = peakConcurrency(measured);

    const titleMin = (titleHeightPx / hourHeight) * MINUTES_PER_HOUR;
    return measured.map(m => toLayout(m, columnOf, peakOf, measured, titleMin));
} 

function measure(entries: CalendarEntry[], dateStr: string): Measured[] {
    const dayStart = dayjs(dateStr).startOf("day");
    const dayEnd = dayStart.endOf("day");

    return entries
        .map(entry => {
            const start = dayjs(entry.start_time);
            const end = dayjs(entry.end_time);
            const new_start = start.isBefore(dayStart) ? dayStart : start;
            const new_end = end.isAfter(dayEnd) ? dayEnd : end;
            return {
                entry,
                startMin: new_start.hour() * 60 + new_start.minute() + new_start.second() / 60,
                endMin: new_end.hour() * 60 + new_end.minute() + new_end.second() / 60,
            };
        })
        .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
}

function assignColumns(items: Measured[]): Map<string, number> {
    const colEnds: number[] = [];
    const map = new Map<string, number>();

    for (const item of items) {
        let col = colEnds.findIndex(end => end <= item.startMin);
        if (col === -1) {
            col = colEnds.length;
            colEnds.push(item.endMin);
        } else {
            colEnds[col] = item.endMin;
        }
        map.set(item.entry.id, col);
    }
    return map;
}

function peakConcurrency(items: Measured[]): Map<string, number> {
    const pts = Array.from(
        new Set(items.flatMap(m => [m.startMin, m.endMin])),
    ).sort((a, b) => a - b);

    // For each interval [pts[i], pts[i+1]) count how many entries span it.
    const intervals: { s: number; e: number; c: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const start = pts[i];
        const end = pts[i + 1];
        const count = items.reduce(
            (n, m) => (m.startMin <= start && m.endMin > start ? n + 1 : n),
            0,
        );
        intervals.push({ s: start, e: end, c: count });
    }

    const map = new Map<string, number>();
    for (const item of items) {
        let peak = 1;
        for (const iv of intervals) {
            if (iv.e <= item.startMin) continue;
            if (iv.s >= item.endMin) break;
            peak = Math.max(peak, iv.c);
        }
        map.set(item.entry.id, peak);
    }
    return map;
}

//  Step 4: build LayoutEntry 

function toLayout(
    measured: Measured,
    columnOf: Map<string, number>,
    peakOf: Map<string, number>,
    all: Measured[],
    titleMin: number,
): LayoutEntry {
    const col = columnOf.get(measured.entry.id) ?? 0;
    const conc = peakOf.get(measured.entry.id) ?? 1;

    let width = Math.max(ENTRY_MIN_WIDTH, 100 / conc);
    let offset = col * (100 / conc);

    // When exactly 2 overlap and the second starts below the first's title
    // area, give it more width so it's easier to read.
    if (conc === 2 && col === 1) {
        const other = all.find(
            x => columnOf.get(x.entry.id) === 0 &&
                Math.max(measured.startMin, x.startMin) < Math.min(measured.endMin, x.endMin),
        );
        if (other && measured.startMin >= other.startMin + titleMin) {
            const bigger = width * ENTRY_SCALE_FACTOR;
            offset = Math.max(0, offset - (bigger - width));
            width = bigger;
        }
    }

    if (offset + width > 100) offset = Math.max(0, 100 - width);

    // Scale into the inner area (leave margin on both sides)
    let scaleO = ENTRY_MARGIN_PCT + offset * INNER_SCALE;
    let scaleW = width * INNER_SCALE;

    // Slight overlap between concurrent entries
    if (conc > 1 && ENTRY_OVERLAP_PCT > 0) {
        const shift = (ENTRY_OVERLAP_PCT * (col / Math.max(1, conc))) || 0;
        scaleW = Math.min(100 - ENTRY_MARGIN_PCT - scaleO, scaleW + ENTRY_OVERLAP_PCT);
        scaleO = Math.max(ENTRY_MARGIN_PCT, scaleO - shift);
    }

    // Clamp
    if (scaleO + scaleW > 100) scaleW = Math.max(ENTRY_MIN_WIDTH, 100 - scaleO);
    if (scaleW < ENTRY_MIN_WIDTH) {
        scaleW = ENTRY_MIN_WIDTH;
        if (scaleO + scaleW > 100) scaleO = Math.max(ENTRY_MARGIN_PCT, 100 - scaleW);
    }

    return {
        ...measured.entry,
        widthPct: scaleW,
        offsetPct: scaleO,
        zIndex: 2 + col,
        startMinute: measured.startMin,
        durationMinutes: measured.endMin - measured.startMin,
    };
}
