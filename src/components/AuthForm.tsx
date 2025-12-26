import React from "react";
import { Box, Button, Grid, TextField, Typography } from "@mui/material";

type AuthFormProps = {
    title: string;
    fields: {
        label: string;
        type: string;
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
        required?: boolean;
        error?: boolean;
        helperText?: string;
    }[];
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    submitLabel: string;
    extra?: React.ReactNode;
};

export default function AuthForm({ title, fields, onSubmit, submitLabel, extra }: AuthFormProps) {
    return (
        <Box mt={4} p={3} boxShadow={3} borderRadius={2} maxWidth={400} width="100%" bgcolor="background.paper">
            <Typography variant="h5" component="h2" mb={3} textAlign="center">
                {title}
            </Typography>
            <form onSubmit={onSubmit}>
                <Grid container spacing={2} direction="column">
                    {fields.map((field, idx) => (
                        <Grid size={12} key={idx}>
                            <TextField
                                label={field.label}
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
    );
}