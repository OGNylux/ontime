/**
 * ContextMenu - right-click menu on an entry (duplicate / delete).
 */
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { Delete, ContentCopy } from "@mui/icons-material";
import type { ContextMenuState } from "../types";
import { CalendarEntry } from "../../../services/calendarService";

interface Props {
    state: ContextMenuState | null;
    onClose: () => void;
    onDuplicate: (entry: CalendarEntry) => void;
    onDelete: (id: string) => void;
}

export default function ContextMenu({ state, onClose, onDuplicate, onDelete }: Props) {
    return (
        <Menu open={state !== null} onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={state ? { top: state.mouseY, left: state.mouseX } : undefined}>
            <MenuItem onClick={() => { if (state) { onDuplicate(state.entry); onClose(); } }}>
                <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
                <ListItemText>Duplicate</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { if (state?.entry?.id) { onDelete(state.entry.id); onClose(); } }}>
                <ListItemIcon><Delete fontSize="small" /></ListItemIcon>
                <ListItemText>Delete</ListItemText>
            </MenuItem>
        </Menu>
    );
}
