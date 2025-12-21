import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { CalendarEntry } from "../../services/calendarService";

interface EntryContextMenuProps {
    contextMenu: { mouseX: number; mouseY: number; entry: CalendarEntry } | null;
    onClose: () => void;
    onDuplicate: (entry: CalendarEntry) => void;
    onDelete: (entryId: string) => void;
}

export default function EntryContextMenu({
    contextMenu,
    onClose,
    onDuplicate,
    onDelete,
}: EntryContextMenuProps) {
    return (
        <Menu
            open={contextMenu !== null}
            onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={
                contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
            }
        >
            <MenuItem
                onClick={() => {
                    if (contextMenu?.entry) {
                        onDuplicate(contextMenu.entry);
                        onClose();
                    }
                }}
            >
                <ListItemIcon>
                    <ContentCopyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Duplicate</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={() => {
                    if (contextMenu?.entry?.id) {
                        onDelete(contextMenu.entry.id);
                        onClose();
                    }
                }}
            >
                <ListItemIcon>
                    <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
            </MenuItem>
        </Menu>
    );
}
