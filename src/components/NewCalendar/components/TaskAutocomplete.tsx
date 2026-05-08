import { useEffect, useMemo, useState } from "react";
import type { HTMLAttributes } from "react";
import {
    Autocomplete,
    Box,
    ListItemText,
    TextField,
} from "@mui/material";
import { taskService, Task } from "../../../services/taskService";
import { TAILWIND_COLORS } from "../../../services/projectService";

interface Props {
    value: string;
    onValueChange: (value: string) => void;
    onTaskSelect?: (task: Task) => void;
    onTaskClear?: () => void;
    autoFocus?: boolean;
    label?: string;
    placeholder?: string;
    size?: "small" | "medium";
    fullWidth?: boolean;
}

function getTaskSortKey(task: Task) {
    const clientName = task.project?.client?.name?.toLowerCase() ?? "~";
    const projectName = task.project?.name?.toLowerCase() ?? "~";
    const taskName = task.name?.toLowerCase() ?? "";
    return `${clientName}|${projectName}|${taskName}`;
}

function sortTasksWithProjects(tasks: Task[]) {
    return [...tasks].sort((a, b) => getTaskSortKey(a).localeCompare(getTaskSortKey(b)));
}

export default function TaskAutocomplete({
    value,
    onValueChange,
    onTaskSelect,
    onTaskClear,
    autoFocus = false,
    label,
    placeholder,
    size = "small",
    fullWidth = true,
}: Props) {
    const [options, setOptions] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        const t = setTimeout(async () => {
            if (value.length < 3) { if (active) setOptions([]); return; }
            setLoading(true);
            try {
                const results = await taskService.searchTasks(value);
                if (active) setOptions(sortTasksWithProjects(results));
            } catch (err) {
                console.error("Task search failed:", err);
                if (active) setOptions([]);
            } finally {
                if (active) setLoading(false);
            }
        }, 300);
        return () => { active = false; clearTimeout(t); };
    }, [value]);

    const renderOption = useMemo(() => (
        (props: HTMLAttributes<HTMLLIElement>, option: Task) => {
            const colorIdx = option.color ?? option.project?.color ?? 0;
            const color = TAILWIND_COLORS[colorIdx] ?? TAILWIND_COLORS[0];
            const projectName = option.project?.name;
            const clientName = option.project?.client?.name;
            const secondary = clientName ? `${projectName ?? "No Project"}  • ${clientName}` : projectName;

            return (
                <li {...props}>
                    <Box
                        sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: color.value,
                            flexShrink: 0,
                            mr: 1.5,
                            mt: 0.5,
                        }}
                    />
                    <ListItemText
                        primary={option.name}
                        secondary={secondary}
                        secondaryTypographyProps={{ fontSize: "0.75rem" }}
                    />
                </li>
            );
        }
    ), []);

    return (
        <Autocomplete
            freeSolo
            options={options}
            loading={loading}
            fullWidth={fullWidth}
            getOptionLabel={o => (typeof o === "string" ? o : o.name)}
            renderInput={params => (
                <TextField
                    {...params}
                    autoFocus={autoFocus}
                    label={label}
                    placeholder={placeholder}
                    size={size}
                />
            )}
            inputValue={value}
            onInputChange={(_, v) => {
                onValueChange(v);
                onTaskClear?.();
            }}
            onChange={(_, v) => {
                if (v && typeof v === "object") {
                    onValueChange(v.name);
                    onTaskSelect?.(v);
                } else if (typeof v === "string") {
                    onValueChange(v);
                }
            }}
            renderOption={renderOption}
        />
    );
}
