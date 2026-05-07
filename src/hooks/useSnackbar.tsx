import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type SnackbarSeverity = "error" | "warning" | "info" | "success";

export interface SnackbarMessage {
    id: number;
    title: string;
    message?: string;
    severity: SnackbarSeverity;
    duration?: number; // ms, default 4000
}

interface SnackbarContextValue {
    messages: SnackbarMessage[];
    show: (title: string, message?: string, severity?: SnackbarSeverity, duration?: number) => void;
    dismiss: (id: number) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

let nextId = 0;

export function SnackbarProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<SnackbarMessage[]>([]);

    const show = useCallback((
        title: string,
        message?: string,
        severity: SnackbarSeverity = "info",
        duration = 4000,
    ) => {
        const id = ++nextId;
        setMessages(prev => [...prev, { id, title, message, severity, duration }]);
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
        showError: useCallback((title: string, message?: string) => show(title, message, "error", 5000), [show]),
        showSuccess: useCallback((title: string, message?: string) => show(title, message, "success"), [show]),
        showWarning: useCallback((title: string, message?: string) => show(title, message, "warning"), [show]),
        showInfo: useCallback((title: string, message?: string) => show(title, message, "info"), [show]),
    };
}

export function useSnackbarContext() {
    const ctx = useContext(SnackbarContext);
    if (!ctx) throw new Error("useSnackbarContext must be used within SnackbarProvider");
    return ctx;
}
