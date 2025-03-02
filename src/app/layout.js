"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CircularProgress, Container, Button } from "@mui/material";
import { AuthProvider, useAuth } from "@/context/AuthContext"; // 🔥 Import AuthProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Wrap the entire app inside AuthProvider
export default function RootLayout({ children }) {
  return (
    <AuthProvider> {/* 🔥 Wrap entire app in AuthProvider */}
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          <AppContent>{children}</AppContent> {/* Separate component for logic */}
        </body>
      </html>
    </AuthProvider>
  );
}

// Separate AppContent to handle user auth state
function AppContent({ children }) {
  const { user, role, loading } = useAuth(); // 🔥 Use Auth Context
  const router = useRouter();

  if (loading) {
    return (
      <Container>
        <CircularProgress style={{ display: "block", margin: "50px auto" }} />
      </Container>
    );
  }

  return (
    <Container>
      {/* Show user info and logout button if logged in */}
      {user && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
          <span>Welcome, {user.email} ({role})</span>
          <Button color="secondary" onClick={() => auth.signOut()}>Logout</Button>
        </div>
      )}
      {children}
    </Container>
  );
}
