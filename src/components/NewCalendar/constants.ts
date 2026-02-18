/**
 * constants.ts - magic numbers in one place.
 */
import type { ZoomLevel } from "./types";

//  Grid 
export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const SNAP_INTERVAL = 15; // minutes

/** Height (px) of one grid row on large / small screens. */
export const SLOT_HEIGHT_LG = 100;
export const SLOT_HEIGHT_SM = 80;

/** Ordered zoom options (most zoomed-in first). */
export const ZOOM_OPTIONS: ZoomLevel[] = [5, 15, 30, 60, 120];

//  Entry layout 

/** Margin (%) on each side of entry blocks. */
export const ENTRY_MARGIN_PCT = 4;
/** Extra overlap (%) added when entries share time. */
export const ENTRY_OVERLAP_PCT = 4;
/** Minimum width (%) an entry can shrink to. */
export const ENTRY_MIN_WIDTH = 22;
/** Scale factor for the second overlapping entry. */
export const ENTRY_SCALE_FACTOR = 1.3;

//  Interactions 

export const DRAG_THRESHOLD_SQ = 25; // px^2 before mouse-down counts as drag
export const LONG_PRESS_MS = 400; // touch-hold before entry drag starts
export const LONG_PRESS_MOVE_SQ = 100; // px^2 cancel threshold for long press
export const MIN_RESIZE_DURATION = 15; // minutes - entries can't be shorter

//  Recorder 

export const RECORDER_SAVE_INTERVAL = 60_000; // ms - auto-save to DB
export const RECORDER_TICK_INTERVAL = 1_000; // ms - UI timer update
