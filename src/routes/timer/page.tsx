import { Box } from "@mui/material";
import Calendar from "../../components/Calendar/CalendarWeek";

export default function Timer() {
    return (
        <Box width='100%' height='100%'>
            <Box width='100%' height='100%' overflow="hidden" borderRadius={2} boxShadow={4}>
                <Calendar />
            </Box>
        </Box>
    );
}

