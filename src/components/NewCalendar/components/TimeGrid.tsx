/**
 * TimeGrid - horizontal grid lines for a day column.
 * One line per zoom-level slot.
 */
import { Box } from "@mui/material";
import { MINUTES_PER_DAY } from "../constants";
import type { ZoomLevel } from "../types";

interface Props {
    slotHeight: number;
    zoom: ZoomLevel;
}

export default function TimeGrid({ slotHeight, zoom }: Props) {
    const slots: number[] = [];
    for (let m = 0; m < MINUTES_PER_DAY; m += zoom) slots.push(m);

    return (
        <>
            {slots.map(m => (
                <Box
                    key={m}
                    position="absolute"
                    top={slots.indexOf(m) * slotHeight}
                    left={0}
                    right={0}
                    height={slotHeight}
                    borderBottom={t => `1px solid ${t.palette.divider}`}
                    sx={{ pointerEvents: "none" }}
                />
            ))}
        </>
    );
}
