import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Box, Typography, Button, Grid, Alert } from "@mui/material";
import AuthForm from "../../components/AuthForm";
import { authService } from "../../services/authService";
import { UserLoginRequestDto } from "../../dtos/request/UserLogin.request.dto";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const request: UserLoginRequestDto = {
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
        <Container maxWidth="lg">
            <Box
                my={4}
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
            >
                {error && <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 400 }}>{error}</Alert>}

                <AuthForm
                    title="Login"
                    fields={[
                        {
                            label: "E-Mail",
                            type: "email",
                            value: email,
                            onChange: (e) => setEmail(e.target.value),
                            required: true,
                        },
                        {
                            label: "Passwort",
                            type: "password",
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
                                Don't have an account? <Link to="/register">Register here</Link>
                            </Typography>
                        </Grid>
                    }
                />

                <Box maxWidth="sm" mt={2}>
                    <Button variant="contained" component={Link} to="/">
                        Go to the home page
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}
