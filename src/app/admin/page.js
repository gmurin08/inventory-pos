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
  const router = useRouter();

  // Firestore refs
  const inventoryRef = collection(db, "inventory");
  const categoriesRef = collection(db, "categories");

  // State for products & categories
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // State for loading & role checking
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // State for product modal
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    stock: "",
    categoryId: "",
  });

  // State for category modal
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    setLoading(true);

    // Check user role, redirect if not admin
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

    // Real-time listener for inventory
    const unsubscribeProducts = onSnapshot(inventoryRef, (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // Real-time listener for categories
    const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
      setCategories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, [router]);

  // --------------------------------------
  //  PRODUCT LOGIC
  // --------------------------------------

  const handleOpen = (product = null) => {
    // If editing existing product
    if (product) {
      setEditingProduct(product);
      setNewProduct({
        name: product.name,
        price: product.price,
        stock: product.stock,
        categoryId: product.categoryId,
      });
    } else {
      // If adding new
      setEditingProduct(null);
      setNewProduct({ name: "", price: "", stock: "", categoryId: "" });
    }
    setOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.categoryId) {
      alert("A category must be selected.");
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        const productDoc = doc(db, "inventory", editingProduct.id);
        await updateDoc(productDoc, {
          name: newProduct.name,
          price: newProduct.price,
          stock: newProduct.stock,
          categoryId: newProduct.categoryId,
        });
      } else {
        // Add new product
        await addDoc(inventoryRef, {
          name: newProduct.name,
          price: newProduct.price,
          stock: newProduct.stock,
          categoryId: newProduct.categoryId,
        });
      }

      // Reset modal
      setOpen(false);
      setEditingProduct(null);
      setNewProduct({ name: "", price: "", stock: "", categoryId: "" });
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "inventory", id));
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  // --------------------------------------
  //  CATEGORY LOGIC
  // --------------------------------------

  const handleCategoryOpen = () => {
    setCategoryOpen(true);
  };

  // Called when clicking "Edit" on a specific category
  const handleEditCategory = (cat) => {
    setEditingCategory({ ...cat }); // store entire category in state
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        // Update existing category
        const categoryDoc = doc(db, "categories", editingCategory.id);
        await updateDoc(categoryDoc, { name: editingCategory.name });

        // (Optional) If you want to rename across products or do something else, adjust here
      } else {
        // Add new category
        await addDoc(categoriesRef, newCategory);
      }

      // Reset states
      setCategoryOpen(false);
      setEditingCategory(null);
      setNewCategory({ name: "" });
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      // Check if any products exist under this category
      const q = query(inventoryRef, where("categoryId", "==", id));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        alert(
          "Cannot delete category. Please move or delete all products under this category first."
        );
        return;
      }

      // If empty, safe to delete
      await deleteDoc(doc(db, "categories", id));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // --------------------------------------
  //  RENDER
  // --------------------------------------

  if (loading || authLoading)
    return (
      <CircularProgress style={{ display: "block", margin: "50px auto" }} />
    );

  if (role !== "admin") return null;

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Admin Inventory Management (Live Updates)
      </Typography>

      {/* Action Buttons */}
      <Button variant="contained" color="primary" onClick={() => router.push("/pos")}>
        Access POS
      </Button>
      <Button
        variant="contained"
        color="primary"
        style={{ marginLeft: 10 }}
        onClick={() => handleOpen()} // Add new product
      >
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

      {/* Product Table */}
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ marginTop: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <b>Product</b>
                </TableCell>
                <TableCell>
                  <b>Price</b>
                </TableCell>
                <TableCell>
                  <b>Stock</b>
                </TableCell>
                <TableCell>
                  <b>Category</b>
                </TableCell>
                <TableCell>
                  <b>Actions</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>${product.price}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    {
                      categories.find((c) => c.id === product.categoryId)
                        ?.name || "Uncategorized"
                    }
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpen(product)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ------------------------------------------------ */}
      {/*  MODAL: ADD/EDIT PRODUCT                         */}
      {/* ------------------------------------------------ */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>
          {editingProduct ? "Edit Product" : "Add New Product"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Product Name"
            fullWidth
            margin="normal"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct({ ...newProduct, name: e.target.value })
            }
          />

          <TextField
            label="Price"
            fullWidth
            margin="normal"
            type="number"
            value={newProduct.price}
            onChange={(e) =>
              setNewProduct({ ...newProduct, price: e.target.value })
            }
          />

          <TextField
            label="Stock"
            fullWidth
            margin="normal"
            type="number"
            value={newProduct.stock}
            onChange={(e) =>
              setNewProduct({ ...newProduct, stock: e.target.value })
            }
          />

          <Select
            fullWidth
            displayEmpty
            value={newProduct.categoryId}
            onChange={(e) =>
              setNewProduct({ ...newProduct, categoryId: e.target.value })
            }
            style={{ marginTop: 16 }}
          >
            <MenuItem value="" disabled>
              Select Category
            </MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
              setEditingProduct(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveProduct}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------------ */}
      {/*  MODAL: MANAGE CATEGORIES                        */}
      {/* ------------------------------------------------ */}
      <Dialog
        open={categoryOpen}
        onClose={() => {
          setCategoryOpen(false);
          setEditingCategory(null);
          setNewCategory({ name: "" });
        }}
        fullWidth
      >
        <DialogTitle>Manage Categories</DialogTitle>
        <DialogContent>
          {/* Existing Categories Table */}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><b>Category</b></TableCell>
                <TableCell><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>{cat.name}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEditCategory(cat)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteCategory(cat.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Add or Edit Category */}
          <Typography variant="h6" style={{ marginTop: 20 }}>
            {editingCategory ? "Edit Category" : "Add New Category"}
          </Typography>
          <TextField
            label="Category Name"
            fullWidth
            margin="normal"
            value={
              editingCategory
                ? editingCategory.name
                : newCategory.name
            }
            onChange={(e) => {
              if (editingCategory) {
                setEditingCategory({ ...editingCategory, name: e.target.value });
              } else {
                setNewCategory({ name: e.target.value });
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCategoryOpen(false);
              setEditingCategory(null);
              setNewCategory({ name: "" });
            }}
          >
            Close
          </Button>
          <Button variant="contained" onClick={handleSaveCategory}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
