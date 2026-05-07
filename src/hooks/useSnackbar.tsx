import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type SnackbarSeverity = "error" | "warning" | "info" | "success";

export interface SnackbarAction {
    label: string;
    onClick: () => void | Promise<void>;
}

export interface SnackbarMessage {
    id: number;
    title: string;
    message?: string;
    severity: SnackbarSeverity;
    duration?: number; // ms, default 4000
    action?: SnackbarAction;
}

export interface ShowOptions {
    message?: string;
    severity?: SnackbarSeverity;
    duration?: number;
    action?: SnackbarAction;
}

interface SnackbarContextValue {
    messages: SnackbarMessage[];
    show: (title: string, options?: ShowOptions) => void;
    dismiss: (id: number) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

let nextId = 0;

export function SnackbarProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<SnackbarMessage[]>([]);

    const show = useCallback((title: string, options: ShowOptions = {}) => {
        const id = ++nextId;
        const { message, severity = "info", duration = 4000, action } = options;
        setMessages(prev => [...prev, { id, title, message, severity, duration, action }]);
    }, []);

    const dismiss = useCallback((id: number) => {
        setMessages(prev => prev.filter(m => m.id !== id));
    }, []);

    return (
        <SnackbarContext.Provider value={{ messages, show, dismiss }}>
            {children}
        </SnackbarContext.Provider>
    );
}

export function useSnackbar() {
    const ctx = useContext(SnackbarContext);
    if (!ctx) throw new Error("useSnackbar must be used within SnackbarProvider");

    const { show } = ctx;

    return {
        showError: useCallback((title: string, message?: string) => show(title, { message, severity: "error", duration: 5000 }), [show]),
        showSuccess: useCallback((title: string, message?: string) => show(title, { message, severity: "success" }), [show]),
        showWarning: useCallback((title: string, message?: string) => show(title, { message, severity: "warning" }), [show]),
        showInfo: useCallback((title: string, message?: string) => show(title, { message, severity: "info" }), [show]),
        showWithAction: useCallback(
            (title: string, action: SnackbarAction, opts: Omit<ShowOptions, "action"> = {}) =>
                show(title, { ...opts, action, duration: opts.duration ?? 6000 }),
            [show],
        ),
    };
}

export function useSnackbarContext() {
    const ctx = useContext(SnackbarContext);
    if (!ctx) throw new Error("useSnackbarContext must be used within SnackbarProvider");
    return ctx;
}
