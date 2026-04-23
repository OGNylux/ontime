import { Dispatch, SetStateAction, useCallback } from 'react';

interface EntityWithId {
    id?: string;
}

/**
 * Shared immutable list updates for entity table pages.
 */
export function useEntityListState<T extends EntityWithId>(
    setItems: Dispatch<SetStateAction<T[]>>,
) {
    const replaceOne = useCallback((updated: T, merge?: (current: T, next: T) => T) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== updated.id) return item;
                return merge ? merge(item, updated) : updated;
            }),
        );
    }, [setItems]);

    const prependOne = useCallback((created: T) => {
        setItems((prev) => [created, ...prev]);
    }, [setItems]);

    const removeOne = useCallback((id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }, [setItems]);

    const removeMany = useCallback((ids: string[]) => {
        const idSet = new Set(ids);
        setItems((prev) => prev.filter((item) => !item.id || !idSet.has(item.id)));
    }, [setItems]);

    return { replaceOne, prependOne, removeOne, removeMany };
}
