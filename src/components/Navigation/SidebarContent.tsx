import { ReactNode } from 'react';
import {
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    Box,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import TreeConnector from './TreeConnector';

export interface NavSubItem {
    label: string;
    path: string;
    pathMatch?: 'exact' | 'startsWith';
}

export interface NavSection {
    label: string;
    icon: ReactNode;
    paths: string[];
    subItems: NavSubItem[];
}

export interface NavItem {
    label: string;
    path: string;
    icon: ReactNode;
}

interface SidebarContentProps {
    navItems: NavItem[];
    navSections: NavSection[];
    currentPath: string;
    collapsed?: boolean;
    sectionStates: Record<string, boolean>;
    onSectionToggle: (label: string) => void;
    onNavigate: (path: string) => void;
}

export default function SidebarContent({
    navItems,
    navSections,
    currentPath,
    collapsed = false,
    sectionStates,
    onSectionToggle,
    onNavigate,
}: SidebarContentProps) {
    const isPathActive = (path: string, match: 'exact' | 'startsWith' = 'exact') => {
        return match === 'exact' ? currentPath === path : currentPath.startsWith(path);
    };

    const isSectionActive = (section: NavSection) => {
        return section.paths.some(path => currentPath.startsWith(path));
    };

    const hasActiveBelow = (section: NavSection, index: number) => {
        return section.subItems.slice(index + 1).some(item =>
            isPathActive(item.path, item.pathMatch)
        );
    };

    return (
        <List>
            {navItems.map((item) => {
                const isActive = isPathActive(item.path);
                return (
                    <ListItem key={item.path} disablePadding>
                        <ListItemButton
                            onClick={() => onNavigate(item.path)}
                            sx={{
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                px: collapsed ? 0 : 2,
                                bgcolor: 'background.default',
                                borderRadius: 2,
                                borderBottom: 3,
                                borderColor: isActive ? 'primary.main' : 'text.secondary',
                                mx: 1,
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: collapsed ? 0 : 56,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    color: 'text.secondary',
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            {!collapsed && (
                                <ListItemText
                                    primary={item.label}
                                    sx={{ color: 'inherit' }}
                                />
                            )}
                        </ListItemButton>
                    </ListItem>
                );
            })}

            {navSections.map((section) => {
                const isActive = isSectionActive(section);
                const isOpen = sectionStates[section.label] ?? false;

                return (
                    <Box key={section.label}>
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => onSectionToggle(section.label)}
                                sx={{
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    px: collapsed ? 0 : 2,
                                    bgcolor: 'background.default',
                                    borderRadius: 2,
                                    mx: 1,
                                    mt: 1,
                                    borderBottom: 3,
                                    borderColor: isActive ? 'primary.main' : 'text.secondary',
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: collapsed ? 0 : 56,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        color: 'text.secondary',
                                    }}
                                >
                                    {section.icon}
                                </ListItemIcon>
                                {!collapsed && (
                                    <>
                                        <ListItemText
                                            primary={section.label}
                                            color='inherit'
                                        />
                                        {isOpen ? (
                                            <ExpandLess color='inherit' />
                                        ) : (
                                            <ExpandMore color='inherit' />
                                        )}
                                    </>
                                )}
                            </ListItemButton>
                        </ListItem>

                        {!collapsed && (
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {section.subItems.map((subItem, index) => {
                                        const subItemActive = isPathActive(subItem.path, subItem.pathMatch);
                                        const isLast = index === section.subItems.length - 1;

                                        return (
                                            <Box
                                                key={subItem.path}
                                                sx={{ display: 'flex', alignItems: 'center', px: 1, my: 0.5 }}
                                            >
                                                <TreeConnector
                                                    isLast={isLast}
                                                    isActive={subItemActive}
                                                    hasActiveBelow={hasActiveBelow(section, index)}
                                                />
                                                <ListItemButton
                                                    sx={{
                                                        flex: 1,
                                                        bgcolor: subItemActive ? 'primary.main' : 'transparent',
                                                        borderRadius: 2,
                                                        mr: 2,
                                                        '&:hover': {
                                                            bgcolor: subItemActive ? 'primary.dark' : 'action.hover',
                                                        },
                                                    }}
                                                    onClick={() => onNavigate(subItem.path)}
                                                >
                                                    <ListItemText
                                                        primary={subItem.label}
                                                        sx={{
                                                            '&:hover': {
                                                                color: subItemActive ? 'primary.contrastText' : 'inherit'
                                                            }
                                                        }}
                                                    />
                                                </ListItemButton>
                                            </Box>
                                        );
                                    })}
                                </List>
                            </Collapse>
                        )}
                    </Box>
                );
            })}
        </List>
    );
}
