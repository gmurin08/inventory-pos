"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/utils/auth";
import {
  CircularProgress,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Select,
  MenuItem,
} from "@mui/material";
import { Edit, Delete, LockReset } from "@mui/icons-material";
import { db, auth } from "@/config/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword } from "firebase/auth";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "viewer",
    phone: "",
  });
  const [newPassword, setNewPassword] = useState(""); // New password state
  const [role, setRole] = useState(null);
  const router = useRouter();

  const usersRef = collection(db, "users");

  // 🔥 Fetch users from Firestore
  useEffect(() => {
    setLoading(true);
    const checkRole = async () => {
      if (auth.currentUser) {
        const userRole = await getUserRole(auth.currentUser.uid);
        setRole(userRole);
        if (userRole !== "admin") {
          router.push("/unauthorized");
        }
      } else {
        router.push("/login");
      }
    };

    checkRole();

    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Open Add/Edit Modal
  const handleOpen = (user = null) => {
    if (user) {
      setEditingUser(user);
      setNewUser({ ...user, password: "" }); // Don't prefill password
    } else {
      setEditingUser(null);
      setNewUser({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "viewer",
        phone: "",
      });
    }
    setOpen(true);
  };

  // 🔥 Handle Adding or Updating User
  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // 🔹 Update existing user in Firestore (but NOT password)
        const userDoc = doc(db, "users", editingUser.id);
        await updateDoc(userDoc, {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          phone: newUser.phone,
        });
      } else {
        // 🔹 Create new user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          newUser.email,
          newUser.password
        );
        const userId = userCredential.user.uid;

        // 🔹 Store user details in Firestore
        await addDoc(usersRef, {
          uid: userId,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          phone: newUser.phone,
        });
      }

      setOpen(false);
      setNewUser({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "viewer",
        phone: "",
      });
    } catch (error) {
      console.error("Error saving user:", error);
      alert(error.message);
    }
  };

  // 🔥 Handle Password Reset (Sends Reset Email)
  const handleSendResetEmail = async (email) => {
    if (!confirm(`Send password reset email to ${email}?`)) return;
    
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      alert("Failed to send reset email.");
    }
  };

  // 🔥 Handle Changing Password Directly
  const handleChangePassword = async () => {
    if (!newPassword) return alert("Please enter a new password.");

    try {
      const user = auth.currentUser;
      await updatePassword(user, newPassword);
      alert("Password updated successfully.");
      setNewPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      alert("Failed to change password. You may need to re-authenticate.");
    }
  };

  // 🔥 Handle Deleting a User
  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "users", userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user.");
    }
  };

  if (loading) return <CircularProgress style={{ display: "block", margin: "50px auto" }} />;
  if (role !== "admin") return null;

  return (
    <Container>
      <Button onClick={() => router.push("/admin")}>Back to Dashboard</Button>

      <Typography variant="h4" gutterBottom>
        Manage Users
      </Typography>

      <Button variant="contained" color="primary" onClick={() => handleOpen()}>
        Add New User
      </Button>

      <TableContainer component={Paper} sx={{ marginTop: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><b>Name</b></TableCell>
              <TableCell><b>Email</b></TableCell>
              <TableCell><b>Role</b></TableCell>
              <TableCell><b>Phone</b></TableCell>
              <TableCell><b>Actions</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.firstName} {user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpen(user)}>
                    <Edit />
                  </IconButton>
                  <IconButton color="secondary" onClick={() => handleSendResetEmail(user.email)}>
                    <LockReset />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDeleteUser(user.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit User Modal */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
        <DialogContent>
          <TextField label="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} fullWidth margin="normal" />
          <TextField label="New Password (Optional)" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained" color="primary">Save</Button>
          {editingUser && <Button onClick={handleChangePassword} variant="contained" color="secondary">Change Password</Button>}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
