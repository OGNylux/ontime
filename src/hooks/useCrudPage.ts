import React, { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from './useSnackbar';

interface CrudEntity {
    id?: string;
    pinned?: boolean;
}

export interface CrudMutations<T> {
    create?: (data: T) => Promise<T>;
    update?: (id: string, data: T) => Promise<T>;
    delete?: (id: string) => Promise<void>;
    restore?: (id: string) => Promise<T>;
    togglePin?: (id: string, pinned: boolean) => Promise<T>;
    bulkSetPinned?: (ids: string[], pinned: boolean) => Promise<void>;
    bulkDelete?: (ids: string[]) => Promise<void>;
    bulkRestore?: (ids: string[]) => Promise<void>;
}

export interface UseCrudPageOptions<T extends CrudEntity> {
    queryKey: readonly unknown[];
    fetcher: () => Promise<T[]>;
    entityLabel: string;
    entityLabelPlural: string;
    getName: (item: T) => string;
    mutations: CrudMutations<T>;
    // Some mutation responses lack joined fields (e.g. togglePin returns no
    // calendar_entries → total_time would reset). This merges them back from
    // the cached row.
    mergeOnUpdate?: (current: T, next: T) => T;
    // Apply defaults to items returned by create/restore (e.g. total_time: 0).
    decorateNew?: (item: T) => T;
}

const errorMsg = (err: unknown): string | undefined =>
    err instanceof Error ? err.message : undefined;

export function useCrudPage<T extends CrudEntity>(opts: UseCrudPageOptions<T>) {
    const {
        queryKey,
        fetcher,
        entityLabel,
        entityLabelPlural,
        getName,
        mutations,
        mergeOnUpdate,
        decorateNew,
    } = opts;
    const { showError, showWithAction } = useSnackbar();
    const queryClient = useQueryClient();

    const { data: items = [], isLoading, error, refetch } = useQuery<T[]>({
        queryKey,
        queryFn: fetcher,
    });

    const replaceInCache = useCallback(
        (updated: T) => {
            queryClient.setQueryData<T[]>(queryKey, (prev) =>
                prev?.map((item) => {
                    if (item.id !== updated.id) return item;
                    return mergeOnUpdate ? mergeOnUpdate(item, updated) : updated;
                }),
            );
        },
        [queryClient, queryKey, mergeOnUpdate],
    );

    const prependInCache = useCallback(
        (created: T) => {
            const decorated = decorateNew ? decorateNew(created) : created;
            queryClient.setQueryData<T[]>(queryKey, (prev) =>
                prev ? [decorated, ...prev] : [decorated],
            );
        },
        [queryClient, queryKey, decorateNew],
    );

    const removeFromCache = useCallback(
        (id: string) => {
            queryClient.setQueryData<T[]>(queryKey, (prev) =>
                prev?.filter((item) => item.id !== id),
            );
        },
        [queryClient, queryKey],
    );

    const removeManyFromCache = useCallback(
        (ids: string[]) => {
            const idSet = new Set(ids);
            queryClient.setQueryData<T[]>(queryKey, (prev) =>
                prev?.filter((item) => !item.id || !idSet.has(item.id)),
            );
        },
        [queryClient, queryKey],
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [menuItem, setMenuItem] = useState<T | null>(null);
    const openMenu = useCallback((event: React.MouseEvent<HTMLElement>, item: T) => {
        setMenuAnchorEl(event.currentTarget);
        setMenuItem(item);
    }, []);
    const closeMenu = useCallback(() => {
        setMenuAnchorEl(null);
        setMenuItem(null);
    }, []);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const openCreate = useCallback(() => {
        setEditingItem(null);
        setDialogOpen(true);
    }, []);
    const openEdit = useCallback((item: T) => {
        setEditingItem(item);
        setDialogOpen(true);
    }, []);
    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setEditingItem(null);
    }, []);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<T | null>(null);
    const closeDeleteDialog = useCallback(() => {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
    }, []);

    const handleEditFromMenu = useCallback(() => {
        if (menuItem) openEdit(menuItem);
        closeMenu();
    }, [menuItem, openEdit, closeMenu]);

    const handleDeleteFromMenu = useCallback(() => {
        if (menuItem) {
            setItemToDelete(menuItem);
            setDeleteDialogOpen(true);
        }
        closeMenu();
    }, [menuItem, closeMenu]);

    const handleTogglePinFromMenu = useCallback(async () => {
        if (!menuItem?.id || !mutations.togglePin) {
            closeMenu();
            return;
        }
        const target = menuItem;
        try {
            const updated = await mutations.togglePin(target.id!, !target.pinned);
            replaceInCache(updated);
        } catch (err) {
            console.error('Failed to toggle pin:', err);
            showError('Failed to toggle pin', errorMsg(err));
        }
        closeMenu();
    }, [menuItem, mutations, replaceInCache, closeMenu, showError]);

    const handleConfirmDelete = useCallback(async () => {
        if (!itemToDelete?.id || !mutations.delete) {
            closeDeleteDialog();
            return;
        }
        const target = itemToDelete;
        try {
            await mutations.delete(target.id!);
            removeFromCache(target.id!);
            if (mutations.restore) {
                showWithAction(
                    `Deleted "${getName(target)}"`,
                    {
                        label: 'Undo',
                        onClick: async () => {
                            try {
                                const restored = await mutations.restore!(target.id!);
                                prependInCache({ ...restored, ...preserveFromTarget(target) } as T);
                            } catch (err) {
                                console.error(`Failed to restore ${entityLabel}:`, err);
                                showError(`Failed to restore ${entityLabel}`, errorMsg(err));
                            }
                        },
                    },
                    { severity: 'info' },
                );
            }
        } catch (err) {
            console.error(`Failed to delete ${entityLabel}:`, err);
            showError(`Failed to delete ${entityLabel}`, errorMsg(err));
        }
        closeDeleteDialog();
    }, [
        itemToDelete,
        mutations,
        removeFromCache,
        prependInCache,
        closeDeleteDialog,
        showError,
        showWithAction,
        getName,
        entityLabel,
    ]);

    const handleBulkDelete = useCallback(async () => {
        if (!mutations.bulkDelete) return;
        const idsToDelete = [...selectedIds];
        if (idsToDelete.length === 0) return;
        try {
            await mutations.bulkDelete(idsToDelete);
            removeManyFromCache(idsToDelete);
            setSelectedIds([]);
            if (mutations.bulkRestore) {
                showWithAction(
                    `Deleted ${idsToDelete.length} ${idsToDelete.length === 1 ? entityLabel : entityLabelPlural}`,
                    {
                        label: 'Undo',
                        onClick: async () => {
                            try {
                                await mutations.bulkRestore!(idsToDelete);
                                await refetch();
                            } catch (err) {
                                console.error(`Failed to restore ${entityLabelPlural}:`, err);
                                showError(`Failed to restore ${entityLabelPlural}`, errorMsg(err));
                            }
                        },
                    },
                    { severity: 'info' },
                );
            }
        } catch (err) {
            console.error(`Failed to delete ${entityLabelPlural}:`, err);
            showError(`Failed to delete ${entityLabelPlural}`, errorMsg(err));
        }
    }, [
        selectedIds,
        mutations,
        removeManyFromCache,
        refetch,
        showError,
        showWithAction,
        entityLabel,
        entityLabelPlural,
    ]);

    const handleBulkPin = useCallback(
        async (pinned: boolean) => {
            if (!mutations.bulkSetPinned || selectedIds.length === 0) return;
            try {
                await mutations.bulkSetPinned(selectedIds, pinned);
                const idSet = new Set(selectedIds);
                queryClient.setQueryData<T[]>(queryKey, (prev) =>
                    prev?.map((item) =>
                        item.id && idSet.has(item.id) ? ({ ...item, pinned } as T) : item,
                    ),
                );
                setSelectedIds([]);
            } catch (err) {
                console.error(`Failed to pin ${entityLabelPlural}:`, err);
                showError(`Failed to pin ${entityLabelPlural}`, errorMsg(err));
            }
        },
        [selectedIds, mutations, queryClient, queryKey, showError, entityLabelPlural],
    );

    const handleSave = useCallback(
        async (data: T) => {
            try {
                if (editingItem?.id && mutations.update) {
                    const previous = editingItem;
                    const updated = await mutations.update(previous.id!, data);
                    replaceInCache(updated);
                    showWithAction(
                        `Updated "${getName(updated)}"`,
                        {
                            label: 'Undo',
                            onClick: async () => {
                                try {
                                    const reverted = await mutations.update!(previous.id!, previous);
                                    replaceInCache(reverted);
                                } catch (err) {
                                    console.error(`Failed to revert ${entityLabel}:`, err);
                                    showError(`Failed to revert ${entityLabel}`, errorMsg(err));
                                }
                            },
                        },
                        { severity: 'info' },
                    );
                } else if (mutations.create) {
                    const created = await mutations.create(data);
                    prependInCache(created);
                }
                setEditingItem(null);
            } catch (err) {
                console.error(`Failed to save ${entityLabel}:`, err);
                showError(`Failed to save ${entityLabel}`, errorMsg(err));
                throw err;
            }
        },
        [
            editingItem,
            mutations,
            replaceInCache,
            prependInCache,
            showError,
            showWithAction,
            getName,
            entityLabel,
        ],
    );

    return {
        items,
        isLoading,
        error,
        refetch,

        searchQuery,
        setSearchQuery,
        selectedIds,
        setSelectedIds,

        menuAnchorEl,
        menuItem,
        openMenu,
        closeMenu,

        dialogOpen,
        editingItem,
        openCreate,
        openEdit,
        closeDialog,

        deleteDialogOpen,
        itemToDelete,
        closeDeleteDialog,

        handleEditFromMenu,
        handleDeleteFromMenu,
        handleTogglePinFromMenu,
        handleConfirmDelete,
        handleBulkDelete,
        handleBulkPin,
        handleSave,
    };
}

// Restore endpoints typically return only base columns. Carry forward fields
// that the original row had but the restore response doesn't (e.g. total_time)
// so the restored row visually matches what was deleted.
function preserveFromTarget<T extends CrudEntity>(target: T): Partial<T> {
    const carry: Record<string, unknown> = {};
    if ('total_time' in target) carry.total_time = (target as Record<string, unknown>).total_time ?? 0;
    return carry as Partial<T>;
}
