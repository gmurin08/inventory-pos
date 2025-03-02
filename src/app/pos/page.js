"use client";

import { useState, useEffect } from "react";
import {useRouter} from "next/navigation"
import {
  CircularProgress,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
} from "@mui/material";
import { Delete, Search, Clear } from "@mui/icons-material";
import { db,auth } from "@/config/firebase";
import { collection, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { getUserRole } from "@/utils/auth"; // ✅ Import getUserRole
import { useAuth } from "@/context/AuthContext";
export default function POS() {
  const router = useRouter(); // ✅ Initialize router
  const {user,role,loading} = useAuth()
  //const [user,setUser] = useState(null)
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editQuantity, setEditQuantity] = useState(null);
  const [quantityInput, setQuantityInput] = useState(1);
  //const [role,setRole] = useState(null)
  //const [loading, setLoading] = useState(true)
  const inventoryRef = collection(db, "inventory");
  const categoriesRef = collection(db, "categories");

 // 🔥 Track User Authentication & Role
 useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (user) {
      setUser(user);
      const userRole = await getUserRole(user.uid);
      setRole(userRole);
    } else {
      setUser(null);
      setRole(null);
      router.push("/login");
    }
    setLoading(false);
  });

  return () => unsubscribe();
}, []);

// 🔥 Enforce Role-Based Access Control (RBAC)
useEffect(() => {
  if (!loading) {
    if (!user) router.push("/login");
    else if (role !== "admin" && role !== "cashier") router.push("/unauthorized");
  }
}, [user, role, loading, router]);

// 🔥 Fetch Inventory & Categories when User is Authenticated
useEffect(() => {
  if (!user || !role) return;

  const unsubscribeProducts = onSnapshot(inventoryRef, (snapshot) => {
    setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  });

  const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
    setCategories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    if (!selectedCategory && snapshot.docs.length > 0) {
      setSelectedCategory(snapshot.docs[0].id);
    }
  });

  return () => {
    unsubscribeProducts();
    unsubscribeCategories();
  };
}, [user, role, selectedCategory]);

  // Add product to cart
  const addToCart = (product) => {
    if (product.stock === 0) return;
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(cart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Remove product from cart
  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // Clear the entire cart
  const clearCart = () => {
    setCart([]);
  };

  // Handle checkout: deduct stock and clear cart
  const handleCheckout = async () => {
    for (let item of cart) {
      const productRef = doc(db, "inventory", item.id);
      await updateDoc(productRef, {
        stock: item.stock - item.quantity,
      });
    }
    setCart([]);
    setCheckoutOpen(false);
    alert("Transaction Complete! Stock Updated.");
  };

  // Filter products based on category and search query
  const filteredProducts = products.filter((product) =>
    product.categoryId === selectedCategory &&
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open quantity edit modal
  const openQuantityEditor = (item) => {
    setEditQuantity(item);
    setQuantityInput(item.quantity);
  };

  // Save new quantity
  const saveQuantity = () => {
    setCart(cart.map((item) =>
      item.id === editQuantity.id ? { ...item, quantity: quantityInput } : item
    ));
    setEditQuantity(null);
  };

  if (loading) {
    return (
      <Container style={{ textAlign: "center", marginTop: 50 }}>
        <CircularProgress />
      </Container>
    );
  }
  
  if (!role || (role !== "admin" && role !== "cashier")) {
    return null; // Prevent unauthorized users from seeing the POS system
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        POS System (Live Updates)
      </Typography>

      <Button variant="contained" color="primary" onClick={()=>router.push('/admin')}>
        Access Admin
      </Button>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onChange={(e, newValue) => setSelectedCategory(newValue)}
        indicatorColor="primary"
        textColor="primary"
      >
        {categories.map((category) => (
          <Tab key={category.id} label={category.name} value={category.id} />
        ))}
      </Tabs>

      {/* Search Bar */}
      <TextField
        label="Search Products"
        fullWidth
        margin="normal"
        variant="outlined"
        InputProps={{
          startAdornment: <Search />,
        }}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <Grid container spacing={2} style={{ marginTop: 10 }}>
        {/* Product List */}
        <Grid item xs={8}>
          <Paper style={{ padding: 16 }}>
            <Typography variant="h6">Products</Typography>
            <List>
              {filteredProducts.map((product) => (
                <ListItem key={product.id} button onClick={() => addToCart(product)}>
                  <ListItemText
                    primary={`${product.name} - $${product.price}`}
                    secondary={`Stock: ${product.stock}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Cart Section */}
        <Grid item xs={4}>
          <Paper style={{ padding: 16 }}>
            <Typography variant="h6">Cart</Typography>
            {cart.length === 0 ? (
              <Typography>No items in cart.</Typography>
            ) : (
              <>
                <List>
                  {cart.map((item) => (
                    <ListItem key={item.id}>
                      <ListItemText
                        primary={`${item.name} x${item.quantity}`}
                        secondary={`$${item.price * item.quantity}`}
                        onClick={() => openQuantityEditor(item)} // Click to edit quantity
                        style={{ cursor: "pointer" }}
                      />
                      <IconButton color="error" onClick={() => removeFromCart(item.id)}>
                        <Delete />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>

                {/* Total Price */}
                <Typography variant="h6" align="right" style={{ marginTop: 10 }}>
                  Total: ${cart.reduce((acc, item) => acc + item.price * item.quantity, 0)}
                </Typography>

                {/* Cart Controls */}
                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={clearCart}
                  startIcon={<Clear />}
                  style={{ marginTop: 10 }}
                >
                  Clear Cart
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => setCheckoutOpen(true)}
                  disabled={cart.length === 0}
                  style={{ marginTop: 10 }}
                >
                  Checkout
                </Button>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)}>
        <DialogTitle>Confirm Checkout</DialogTitle>
        <DialogContent>
          <Typography>
            Total: ${cart.reduce((acc, item) => acc + item.price * item.quantity, 0)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleCheckout} variant="contained" color="primary">
            Confirm Sale
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quantity Editor Dialog */}
      <Dialog open={Boolean(editQuantity)} onClose={() => setEditQuantity(null)}>
        <DialogTitle>Edit Quantity</DialogTitle>
        <DialogContent>
          <TextField
            label="Quantity"
            type="number"
            fullWidth
            value={quantityInput}
            onChange={(e) => setQuantityInput(Math.max(1, Number(e.target.value)))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditQuantity(null)} color="secondary">
            Cancel
          </Button>
          <Button onClick={saveQuantity} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
