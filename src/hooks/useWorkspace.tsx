import { createContext, useContext } from 'react';

interface WorkspaceContextValue {
    workspaceId: string;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceRoute');
    return {
        workspaceId: ctx.workspaceId,
        /** Prepend /w/:workspaceId to an app-relative path */
        path: (p: string) => `/w/${ctx.workspaceId}${p}`,
    };
}
