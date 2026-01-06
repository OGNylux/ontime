import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { Container, Box, Typography, Grid, Alert } from "@mui/material";
import Link from '@mui/material/Link';
import AuthForm from "../../components/Forms/AuthForm";
import { authService, User } from "../../services/authService";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const request: User = {
                email,
                password
            };
            await authService.login(request);

            navigate("/");
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <Container maxWidth="lg" className="h-full flex items-center justify-center">
            <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                width="100%"
            >
                {error && <Alert severity="error" className="mb-2 w-full max-w-96">{error}</Alert>}

                <AuthForm
                    title="Welcome Back!"
                    fields={[
                        {
                            label: "E-Mail",
                            type: "email",
                            placeholder: "user@example.com",
                            value: email,
                            onChange: (e) => setEmail(e.target.value),
                            required: true,
                        },
                        {
                            label: "Password",
                            type: "password",
                            placeholder: "Your password",
                            value: password,
                            onChange: (e) => setPassword(e.target.value),
                            required: true,
                        },
                    ]}
                    onSubmit={handleSubmit}
                    submitLabel="Login"
                    extra={
                        <Grid container justifyContent="center">
                            <Typography variant="body2" mt={2} textAlign="center">
                                Don't have an account? <Link component={RouterLink} to="/register" color="primary">Register here</Link>
                            </Typography>
                        </Grid>
                    }
                />
            </Box>
        </Container>
    );
}
