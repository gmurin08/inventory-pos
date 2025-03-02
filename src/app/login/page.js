"use client";

import { useState } from "react";
import { loginUser } from "@/utils/auth";
import { useRouter } from "next/navigation";
import { TextField, Button, Container, Typography } from "@mui/material";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    await loginUser(email, password);
    router.push("/pos");
  };

  return (
    <Container>
      <Typography variant="h4">Login</Typography>
      <TextField label="Email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Password" fullWidth margin="normal" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button variant="contained" color="primary" onClick={handleLogin}>Login</Button>
    </Container>
  );
}
