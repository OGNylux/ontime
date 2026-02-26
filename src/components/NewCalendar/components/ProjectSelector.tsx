import { useState, useEffect } from "react";
import {
    Box,
    TextField,
    Popover,
    IconButton,
    Tooltip,
    List,
    ListItemButton,
    ListItemText,
    ListSubheader,
    InputAdornment,
} from "@mui/material";
import { Folder, Search } from "@mui/icons-material";
import { Project, projectService } from "../../../services/projectService";

interface ProjectSelectorProps {
    selectedProjectId?: string;
    onSelect: (project: Project | null) => void;
}

export default function ProjectSelector({ selectedProjectId, onSelect }: ProjectSelectorProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        projectService.getProjects().then(setProjects).catch(console.error);
    }, []);

    const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.client?.name || "").toLowerCase().includes(search.toLowerCase())
    );

    const projectsByClient = filteredProjects.reduce((acc, project) => {
        const clientName = project.client?.name || "No Client";
        if (!acc[clientName]) acc[clientName] = [];
        acc[clientName].push(project);
        return acc;
    }, {} as Record<string, typeof projects[0][]>);

    const sortedClients = Object.keys(projectsByClient).sort();

    return (
        <>
            <Tooltip title={selectedProject ? selectedProject.name : "Select Project"}>
                <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    color={selectedProject ? "secondary" : "default"}
                >
                    <Folder />
                </IconButton>
            </Tooltip>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}
            >
                <Box sx={{ p: 2, width: 300, maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
                    <TextField
                        placeholder="Search Project or Client"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        fullWidth
                        autoFocus
                        size="small"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ mb: 1 }}
                    />
                    <List subheader={<li />} sx={{ overflow: 'auto', flex: 1 }}>
                        {sortedClients.map((client) => (
                            <li key={client}>
                                <ul>
                                    <ListSubheader sx={{ bgcolor: "background.default" }}>{client}</ListSubheader>
                                    {projectsByClient[client].map((project) => (
                                        <ListItemButton
                                            key={project.id}
                                            onClick={() => {
                                                onSelect(project);
                                                setAnchorEl(null);
                                            }}
                                            selected={selectedProject?.id === project.id}
                                        >
                                            <ListItemText sx={{ ml: 2 }} primary={project.name} />
                                        </ListItemButton>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </List>
                </Box>
            </Popover>
        </>
    );
}
