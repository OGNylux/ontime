"use client";

import React, { useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { Link as RouterLink } from "react-router-dom";
import AuthForm from "../../components/AuthForm";
import { authService } from "../../services/authService";
import { UserRegisterRequestDto } from "../../dtos/request/UserRegister.request.dto";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const checkAvailability = async () => {
      // Only check if we have values to check
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
    
    // Don't submit if there are validation errors
    if (emailError || nameError) return;

    if(password == passwordRepeat) {
        try {
            const request: UserRegisterRequestDto = {
                name,
                email,
                password
            };
            await authService.register(request);
            setSuccess("Registration successful! Please check your email.");
            setError(null);
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
    <Container maxWidth="lg">
      <Box my={4} display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          {error ? error : success}
        </Typography>
        <AuthForm
          title="Register"
          fields={[
            {
              label: "Email",
              type: "email",
              value: email,
              onChange: (e) => setEmail(e.target.value),
              onBlur: checkAvailability,
              required: true,
              error: !!emailError,
              helperText: emailError || "",
            },
            {
              label: "Name",
              type: "text",
              value: name,
              onChange: (e) => setName(e.target.value),
              onBlur: checkAvailability,
              required: true,
              error: !!nameError,
              helperText: nameError || "",
            },
            {
              label: "Password",
              type: "password",
              value: password,
              onChange: (e) => setPassword(e.target.value),
              required: true,
            },
            {
              label: "Repeat Password",
              type: "password",
              value: passwordRepeat,
              onChange: (e) => setPasswordRepeat(e.target.value),
              required: true,
            },
          ]}
          onSubmit={handleSubmit}
          submitLabel="Register"
          extra={
            <Grid>
              <Typography variant="body2" mt={2} textAlign="center">
                Already have an account? <RouterLink to="/login">Login here</RouterLink>
              </Typography>
            </Grid>
          }
        />
        <Box maxWidth="sm" mt={2}>
          <Button variant="contained" component={RouterLink} to="/">
            Go to the home page
          </Button>
        </Box>
      </Box>
    </Container>
  );
}