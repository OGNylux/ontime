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

//  Public API 

export function layoutEntries(
    entries: CalendarEntry[],
    hourHeight: number,
    titleHeightPx: number,
    dateStr: string,
): LayoutEntry[] {
    if (entries.length === 0) return [];

    // 1 - measure & sort
    const measured = measure(entries, dateStr);

    // 2 - assign columns
    const columnOf = assignColumns(measured);

    // 3 - peak concurrency per entry
    const peakOf = peakConcurrency(measured);

    // 4 - compute layout
    const titleMin = (titleHeightPx / hourHeight) * MINUTES_PER_HOUR;
    return measured.map(m => toLayout(m, columnOf, peakOf, measured, titleMin));
}

//  Step 1: measure 

function measure(entries: CalendarEntry[], dateStr: string): Measured[] {
    const dayStart = dayjs(dateStr).startOf("day");
    const dayEnd = dayStart.endOf("day");

    return entries
        .map(entry => {
            const s = dayjs(entry.start_time);
            const e = dayjs(entry.end_time);
            const cs = s.isBefore(dayStart) ? dayStart : s;
            const ce = e.isAfter(dayEnd) ? dayEnd : e;
            return {
                entry,
                startMin: cs.hour() * 60 + cs.minute() + cs.second() / 60,
                endMin: ce.hour() * 60 + ce.minute() + ce.second() / 60,
            };
        })
        .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
}

//  Step 2: greedy column packing 

function assignColumns(items: Measured[]): Map<string, number> {
    const colEnds: number[] = [];
    const map = new Map<string, number>();

    for (const m of items) {
        let col = colEnds.findIndex(end => end <= m.startMin);
        if (col === -1) {
            col = colEnds.length;
            colEnds.push(m.endMin);
        } else {
            colEnds[col] = m.endMin;
        }
        map.set(m.entry.id, col);
    }
    return map;
}

//  Step 3: sweep-line peak concurrency 

function peakConcurrency(items: Measured[]): Map<string, number> {
    const pts = Array.from(
        new Set(items.flatMap(m => [m.startMin, m.endMin])),
    ).sort((a, b) => a - b);

    // For each interval [pts[i], pts[i+1]) count how many entries span it.
    const intervals: { s: number; e: number; c: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const s = pts[i];
        const e = pts[i + 1];
        const c = items.reduce(
            (n, m) => (m.startMin <= s && m.endMin > s ? n + 1 : n),
            0,
        );
        intervals.push({ s, e, c });
    }

    const map = new Map<string, number>();
    for (const m of items) {
        let peak = 1;
        for (const iv of intervals) {
            if (iv.e <= m.startMin) continue;
            if (iv.s >= m.endMin) break;
            peak = Math.max(peak, iv.c);
        }
        map.set(m.entry.id, peak);
    }
    return map;
}

//  Step 4: build LayoutEntry 

function toLayout(
    m: Measured,
    columnOf: Map<string, number>,
    peakOf: Map<string, number>,
    all: Measured[],
    titleMin: number,
): LayoutEntry {
    const col = columnOf.get(m.entry.id) ?? 0;
    const conc = peakOf.get(m.entry.id) ?? 1;

    let w = Math.max(ENTRY_MIN_WIDTH, 100 / conc);
    let o = col * (100 / conc);

    // When exactly 2 overlap and the second starts below the first's title
    // area, give it more width so it's easier to read.
    if (conc === 2 && col === 1) {
        const other = all.find(
            x => columnOf.get(x.entry.id) === 0 &&
                Math.max(m.startMin, x.startMin) < Math.min(m.endMin, x.endMin),
        );
        if (other && m.startMin >= other.startMin + titleMin) {
            const bigger = w * ENTRY_SCALE_FACTOR;
            o = Math.max(0, o - (bigger - w));
            w = bigger;
        }
    }

    if (o + w > 100) o = Math.max(0, 100 - w);

    // Scale into the inner area (leave margin on both sides)
    let sO = ENTRY_MARGIN_PCT + o * INNER_SCALE;
    let sW = w * INNER_SCALE;

    // Slight overlap between concurrent entries
    if (conc > 1 && ENTRY_OVERLAP_PCT > 0) {
        const shift = (ENTRY_OVERLAP_PCT * (col / Math.max(1, conc))) || 0;
        sW = Math.min(100 - ENTRY_MARGIN_PCT - sO, sW + ENTRY_OVERLAP_PCT);
        sO = Math.max(ENTRY_MARGIN_PCT, sO - shift);
    }

    // Clamp
    if (sO + sW > 100) sW = Math.max(ENTRY_MIN_WIDTH, 100 - sO);
    if (sW < ENTRY_MIN_WIDTH) {
        sW = ENTRY_MIN_WIDTH;
        if (sO + sW > 100) sO = Math.max(ENTRY_MARGIN_PCT, 100 - sW);
    }

    return {
        ...m.entry,
        widthPct: sW,
        offsetPct: sO,
        zIndex: 2 + col,
        startMinute: m.startMin,
        durationMinutes: m.endMin - m.startMin,
    };
}
