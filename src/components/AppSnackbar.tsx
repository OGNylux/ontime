import { JSX, useEffect, useRef, useState } from "react";
import {
    Box, Button, IconButton, LinearProgress, Paper, Stack, Typography,
} from "@mui/material";
import {
    Close, CheckCircle, ErrorOutline, InfoOutlined, WarningAmber,
} from "@mui/icons-material";
import { AnimatePresence, motion } from "motion/react";
import { SnackbarMessage, SnackbarSeverity, useSnackbarContext } from "../hooks/useSnackbar";

const ICON: Record<SnackbarSeverity, JSX.Element> = {
    success: <CheckCircle fontSize="small" />,
    error: <ErrorOutline fontSize="small" />,
    warning: <WarningAmber fontSize="small" />,
    info: <InfoOutlined fontSize="small" />,
};

const COLOR: Record<SnackbarSeverity, string> = {
    success: "success.main",
    error: "error.main",
    warning: "warning.main",
    info: "secondary.main",
};

const PROGRESS_INTERVAL = 50; // ms between ticks

function SingleSnackbar({ msg, onDismiss }: { msg: SnackbarMessage; onDismiss: () => void }) {
    const duration = msg.duration ?? 4000;
    const [progress, setProgress] = useState(100);
    const paused = useRef(false);

    useEffect(() => {
        const decrement = (PROGRESS_INTERVAL / duration) * 100;
        const interval = setInterval(() => {
            if (paused.current) return;
            setProgress(prev => {
                const next = prev - decrement;
                if (next <= 0) {
                    clearInterval(interval);
                    onDismiss();
                    return 0;
                }
                return next;
            });
        }, PROGRESS_INTERVAL);
        return () => clearInterval(interval);
    }, [duration, onDismiss]);

    return (
        <Paper
            component={motion.div}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            elevation={6}
            onMouseEnter={() => { paused.current = true; }}
            onMouseLeave={() => { paused.current = false; }}
            sx={{
                borderRadius: 3,
                overflow: "hidden",
                minWidth: 280,
                maxWidth: 420,
                bgcolor: "background.default",
            }}
        >
            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    height: 3,
                    borderRadius: 0,
                    bgcolor: "action.hover",
                    "& .MuiLinearProgress-bar": { bgcolor: COLOR[msg.severity] },
                }}
            />
            <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ p: 1.5, pr: 1 }}>
                <Box color={COLOR[msg.severity]} display="flex" alignItems="center" pt="2px">
                    {ICON[msg.severity]}
                </Box>
                <Box flex={1} minWidth={0}>
                    <Typography variant="subtitle2" fontWeight="bold" lineHeight={1.3}>
                        {msg.title}
                    </Typography>
                    {msg.message && (
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                            {msg.message}
                        </Typography>
                    )}
                </Box>
                {msg.action && (
                    <Button
                        size="small"
                        onClick={async () => {
                            try {
                                await msg.action!.onClick();
                            } finally {
                                onDismiss();
                            }
                        }}
                        sx={{
                            color: COLOR[msg.severity],
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            minWidth: 0,
                            px: 1,
                        }}
                    >
                        {msg.action.label}
                    </Button>
                )}
                <IconButton size="small" onClick={onDismiss} sx={{ mt: "-4px", mr: "-4px" }}>
                    <Close fontSize="small" />
                </IconButton>
            </Stack>
        </Paper>
    );
}

export default function AppSnackbar() {
    const { messages, dismiss } = useSnackbarContext();

    return (
        <Box
            sx={{
                position: "fixed",
                bottom: 24,
                right: 24,
                zIndex: 2000,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                alignItems: "flex-end",
            }}
        >
            <AnimatePresence initial={false}>
                {messages.map(msg => (
                    <SingleSnackbar key={msg.id} msg={msg} onDismiss={() => dismiss(msg.id)} />
                ))}
            </AnimatePresence>
        </Box>
    );
}
