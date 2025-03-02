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
  MenuItem,
  Select,
} from "@mui/material";
import { Edit, Delete, Category, People } from "@mui/icons-material";
import { db, auth } from "@/config/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    stock: "",
    categoryId: "",
  });
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [editingCategory, setEditingCategory] = useState(null);
  const [role, setRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  const inventoryRef = collection(db, "inventory");
  const categoriesRef = collection(db, "categories");

  // 🔥 Real-time listener for inventory and categories
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
      setAuthLoading(false);
    };

    checkRole();

    const unsubscribeProducts = onSnapshot(inventoryRef, (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
      setCategories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, []);

  // Open modal for adding or editing product
  const handleOpen = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setNewProduct({ ...product });
    } else {
      setEditingProduct(null);
      setNewProduct({ name: "", price: "", stock: "", categoryId: "" });
    }
    setOpen(true);
  };

  // Handle adding or updating a product
  const handleSaveProduct = async () => {
    if (!newProduct.categoryId) {
      alert("A category must be selected.");
      return;
    }

    try {
      if (editingProduct) {
        const productDoc = doc(db, "inventory", editingProduct.id);
        await updateDoc(productDoc, {
          name: newProduct.name,
          price: newProduct.price,
          stock: newProduct.stock,
          categoryId: newProduct.categoryId,
        });
      } else {
        await addDoc(inventoryRef, {
          name: newProduct.name,
          price: newProduct.price,
          stock: newProduct.stock,
          categoryId: newProduct.categoryId,
        });
      }

      setOpen(false);
      setEditingProduct(null);
      setNewProduct({ name: "", price: "", stock: "", categoryId: "" });
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  // Handle deleting a product
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "inventory", id));
  };

  // Open modal for managing categories
  const handleCategoryOpen = () => {
    setCategoryOpen(true);
  };

  // Handle adding or updating a category
  const handleSaveCategory = async () => {
    if (editingCategory) {
      const categoryDoc = doc(db, "categories", editingCategory.id);
      await updateDoc(categoryDoc, editingCategory);

      // Update all products with the new category name
      const q = query(inventoryRef, where("categoryId", "==", editingCategory.id));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (product) => {
        const productRef = doc(db, "inventory", product.id);
        await updateDoc(productRef, { categoryId: editingCategory.id });
      });
    } else {
      await addDoc(categoriesRef, newCategory);
    }

    setCategoryOpen(false);
    setEditingCategory(null);
    setNewCategory({ name: "" });
  };

  // Handle deleting a category (Prevent if products exist under it)
  const handleDeleteCategory = async (id) => {
    const q = query(inventoryRef, where("categoryId", "==", id));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      alert("Cannot delete category. Please move or delete all products under this category first.");
      return;
    }

    await deleteDoc(doc(db, "categories", id));
  };

  if (loading) return <CircularProgress style={{ display: "block", margin: "50px auto" }} />;
  if (role !== "admin") return null;

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Admin Inventory Management (Live Updates)
      </Typography>

      <Button variant="contained" color="primary" onClick={() => handleOpen()}>
        Add New Product
      </Button>
      <Button
        variant="contained"
        color="secondary"
        startIcon={<Category />}
        onClick={handleCategoryOpen}
        style={{ marginLeft: 10 }}
      >
        Manage Categories
      </Button>
      <Button
        variant="contained"
        color="primary"
        startIcon={<People />}
        onClick={() => router.push("/admin/users")}
        style={{ marginLeft: 10 }}
      >
        Manage Users
      </Button>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ marginTop: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><b>Product</b></TableCell>
                <TableCell><b>Price</b></TableCell>
                <TableCell><b>Stock</b></TableCell>
                <TableCell><b>Category</b></TableCell>
                <TableCell><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>${product.price}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>{categories.find(c => c.id === product.categoryId)?.name || "Uncategorized"}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleOpen(product)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(product.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
