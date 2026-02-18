/**
 * pixelScale.ts - derives all pixel measurements from zoom + screen size.
 *
 * Call `makeScale(zoom, isSmall)` once per render cycle and pass the
 * result to any component that needs to convert minutes -> pixels.
 */
import type { ZoomLevel, PixelScale } from "../types";
import { MINUTES_PER_DAY, SLOT_HEIGHT_LG, SLOT_HEIGHT_SM } from "../constants";

export function makeScale(zoom: ZoomLevel, isSmallScreen: boolean): PixelScale {
    const slotHeight = isSmallScreen ? SLOT_HEIGHT_SM : SLOT_HEIGHT_LG;
    const pxPerMin   = slotHeight / zoom;
    const slotCount  = Math.ceil(MINUTES_PER_DAY / zoom);
    return {
        slotHeight,
        pxPerMin,
        pxPerHour: pxPerMin * 60,
        totalHeight: slotHeight * slotCount,
        slotCount,
    };
}
