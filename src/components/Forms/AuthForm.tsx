import React from "react";
import { Box, Button, Grid, TextField, Typography, useTheme } from "@mui/material";

type AuthFormProps = {
    title: string;
    fields: {
        label: string;
        type: string;
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
        placeholder?: string;
        required?: boolean;
        error?: boolean;
        helperText?: string;
    }[];
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    submitLabel: string;
    extra?: React.ReactNode;
};

export default function AuthForm({ title, fields, onSubmit, submitLabel, extra }: AuthFormProps) {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;

    return (
        <Box sx={{ position: 'relative', width: '100%', maxWidth: 500 }}>
            <Box
                sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '120%',
                    height: '120%',
                    background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
                    filter: 'blur(60px)',
                    opacity: 0.45,
                    zIndex: 0,
                    pointerEvents: 'none',
                    borderRadius: 2,
                }}
            />

            <Box mt={4} p={3} boxShadow={3} borderRadius={2} width="100%" bgcolor="background.paper" sx={{ position: 'relative', zIndex: 1 }}>
                <Typography variant="h4" component="h2" mb={0.5} textAlign="center" fontWeight="bold">
                    {title}
                </Typography>
                <Typography variant="body1" mb={3} textAlign="center" color="text.secondary">
                    Sign into OnTime today & track your time!
                </Typography>
                <form onSubmit={onSubmit}>
                    <Grid container spacing={2} direction="column">
                        {fields.map((field, idx) => (
                            <Grid size={12} key={idx}>
                                <Typography variant="subtitle2" mb={1}>
                                    {field.label}
                                </Typography>
                                <TextField
                                    aria-label={field.label}
                                    placeholder={field.placeholder ?? ''}
                                    type={field.type}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    required={field.required}
                                    error={field.error}
                                    helperText={field.helperText}
                                    fullWidth
                                />
                            </Grid>
                        ))}
                        <Grid size={12}>
                            <Button type="submit" variant="contained" fullWidth>
                                {submitLabel}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
                {extra}
            </Box>
        </Box>
    );
}