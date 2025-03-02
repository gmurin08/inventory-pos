import { NextResponse } from "next/server";
import { db } from "@/config/firebase";
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";

const inventoryRef = collection(db, "inventory");

// GET all products
export async function GET() {
  try {
    const snapshot = await getDocs(inventoryRef);
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST new product
export async function POST(req) {
  try {
    const newProduct = await req.json();
    const docRef = await addDoc(inventoryRef, newProduct);
    return NextResponse.json({ id: docRef.id, ...newProduct }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add product" }, { status: 500 });
  }
}

// PUT (edit product)
export async function PUT(req) {
  try {
    const { id } = new URL(req.url).searchParams;
    const updatedProduct = await req.json();
    const productDoc = doc(db, "inventory", id);
    await updateDoc(productDoc, updatedProduct);
    return NextResponse.json({ id, ...updatedProduct });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(req) {
  try {
    const { id } = new URL(req.url).searchParams;
    await deleteDoc(doc(db, "inventory", id));
    return NextResponse.json({ message: "Product deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
