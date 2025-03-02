"use client";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { CircularProgress, Container, Button } from "@mui/material";
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      <html lang="en">
        <body>
          <AppContent>{children}</AppContent>
        </body>
      </html>
    </AuthProvider>
  );
}

function AppContent({ children }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <Container>
        <CircularProgress style={{ display: "block", margin: "50px auto" }} />
      </Container>
    );
  }

  return (
    <>
      {/* Example: display user info if logged in */}
      {user && (
        <Container>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
            <span>
              Welcome, {user.email} ({role})
            </span>
            <Button color="secondary" onClick={() => signOut(auth)}>
              Logout
            </Button>
          </div>
        </Container>
      )}
      {children}
    </>
  );
}
