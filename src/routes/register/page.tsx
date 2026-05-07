"use client";

import React, { useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Link from '@mui/material/Link';
import AuthForm from "../../components/Forms/AuthForm";
import { authService, User } from "../../services/authService";
import { useSnackbar } from "../../hooks/useSnackbar";

export default function RegisterPage() {
  const { showError } = useSnackbar();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [name, setName] = useState("");

  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const checkEmailAvailability = async () => {
    if (!email) return;
    try {
      const { emailExists } = await authService.checkAvailability(email);
      setEmailError(emailExists ? "Email already registered" : null);
    } catch (err) {
      console.error("Failed to check availability", err);
      setEmailError("Could not verify email availability");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (emailError) return;

    if (password !== passwordRepeat) {
      showError("Passwords don't match");
      return;
    }

    try {
      const request: User = { name, email, password };
      await authService.register(request);
      navigate("/login", { replace: true });
    } catch (err) {
      showError("Registration failed", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        width="100%"
      >
        <AuthForm
          title="Register"
          fields={[
            {
              label: "Email",
              type: "email",
              placeholder: "user@example.com",
              value: email,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
              onBlur: checkEmailAvailability,
              required: true,
              error: !!emailError,
              helperText: emailError || "",
            },
            {
              label: "Username",
              type: "text",
              placeholder: "Choose a username",
              value: name,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
              required: true,
            },
            {
              label: "Password",
              type: "password",
              placeholder: "Create a password",
              value: password,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
              required: true,
            },
            {
              label: "Repeat Password",
              type: "password",
              placeholder: "Repeat your password",
              value: passwordRepeat,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPasswordRepeat(e.target.value),
              required: true,
            },
          ]}
          onSubmit={handleSubmit}
          submitLabel="Register"
          extra={
            <Grid>
              <Typography variant="body2" mt={2} textAlign="center">
                Already have an account? <Link component={RouterLink} to="/login" color="primary">Login here</Link>
              </Typography>
            </Grid>
          }
        />
      </Box>
    </Container>
  );
}
