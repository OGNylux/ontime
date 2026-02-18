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
import { Alert } from "@mui/material";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [_, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const checkAvailability = async () => {
    if (!email && !name) return;

    try {
      const result = await authService.checkAvailability(email, name);

      if (email && result.emailExists) {
        setEmailError("Email already registered");
      } else {
        setEmailError(null);
      }

      if (name && result.nameExists) {
        setNameError("Username already taken");
      } else {
        setNameError(null);
      }
    } catch (err) {
      console.error("Failed to check availability", err);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (emailError || nameError) return;

    if (password == passwordRepeat) {
      try {
        const request: User = {
          name,
          email,
          password
        };
        await authService.register(request);
        setSuccess("Registration successful! Please check your email.");
        setError(null);
        navigate("/login", { replace: true });
      } catch (error: any) {
        setError(error.message || "Registration denied with provided credentials");
        setSuccess(null);
      }
    } else {
      setError("Passwords don't match");
      setSuccess(null);
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
        {error && <Alert severity="error" sx={{ marginBottom: 2, width: "100%", maxWidth: 384, zIndex: 100, bgcolor: 'background.default' }}>{error}</Alert>}

        <AuthForm
          title="Register"
          fields={[
            {
              label: "Email",
              type: "email",
              placeholder: "user@example.com",
              value: email,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
              onBlur: checkAvailability,
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
              onBlur: checkAvailability,
              required: true,
              error: !!nameError,
              helperText: nameError || "",
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