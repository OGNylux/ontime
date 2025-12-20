import { useEffect, RefObject } from "react";

export function useCalendarScroll(containerRef: RefObject<HTMLElement | null>) {
    // Center the current time in the first scrollable ancestor only on initial load.
    //
    // Notes:
    // - We look up the nearest scrollable ancestor so the calendar can be
    //   embedded inside arbitrary containers. The scrollable ancestor is the
    //   element that will receive the scrollTop adjustments. When the page
    //   itself is the scroller we fall back to `document.scrollingElement`.
    const centerNow = (smooth = true) => {
        if (!containerRef.current) return;
        const root = containerRef.current;

        const findScrollableAncestor = (el: HTMLElement | null): HTMLElement | null => {
            let current: HTMLElement | null = el;
            while (current) {
                const style = window.getComputedStyle(current);
                const overflowY = style.overflowY;
                if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
                    return current;
                }
                current = current.parentElement;
            }
            return document.scrollingElement as HTMLElement | null;
        };

        const scrollable = findScrollableAncestor(root);
        if (!scrollable) return;

        const dayColumn = root.querySelector<HTMLElement>('[data-date]');
        if (!dayColumn) return;

        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();

        const hourElem = dayColumn.querySelector<HTMLElement>(`[data-hour="${hour}"]`) || dayColumn.querySelector<HTMLElement>('[data-hour]');
        if (!hourElem) return;

        const containerRect = scrollable.getBoundingClientRect();
        const hourRect = hourElem.getBoundingClientRect();

        const hourTop = hourRect.top - containerRect.top + scrollable.scrollTop;
        const hourHeight = hourRect.height || 1;
        const minuteOffset = (minutes / 60) * hourHeight;

        let targetScrollTop = hourTop + minuteOffset - scrollable.clientHeight / 2;
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, scrollable.scrollHeight - scrollable.clientHeight));

        scrollable.scrollTo({ top: targetScrollTop, behavior: smooth ? 'smooth' : 'auto' });
    };

    useEffect(() => {
        // Retry a couple times if layout isn't ready yet
        let rafId: number | null = null;
        let attempts = 0;
        const tryCenter = () => {
            rafId = requestAnimationFrame(() => {
                attempts += 1;
                centerNow(false);
                // Check if we need to retry (e.g. if scrollHeight is small)
                if (containerRef.current) {
                    // Simple check: just retry a few times to be safe
                    if (attempts < 3) {
                        setTimeout(tryCenter, 50);
                    }
                }
            });
        };

        tryCenter();

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [containerRef]);

    return { centerNow };
}
