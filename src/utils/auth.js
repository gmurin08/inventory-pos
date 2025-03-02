import { db, auth } from "@/config/firebase"; // Ensure we import both Firestore and Auth
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

// Function to check if the user exists in Firestore by email and link it to UID
export const ensureUserInFirestore = async (user) => {
  try {
    console.log("Checking Firestore for user with email:", user.email);
    
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // ✅ User exists in Firestore, update their UID to match Firebase Auth
      const userDoc = querySnapshot.docs[0];
      const userRef = doc(db, "users", userDoc.id);
      await setDoc(userRef, { uid: user.uid, ...userDoc.data() }, { merge: true });
      console.log("✅ User found in Firestore. Updated UID:", user.uid);
    } else {
      // ❌ No existing user found in Firestore, create a new one
      console.log("❌ No existing user found. Creating a new user entry...");
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: "viewer", // Default role
      });
      console.log("✅ New user created in Firestore with role: viewer");
    }
  } catch (error) {
    console.error("🔥 Error ensuring user in Firestore:", error);
  }
};

// Login function that ensures Firestore linkage
export const loginUser = async (email, password) => {
  try {
    console.log("Attempting login...");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("✅ Login successful:", user.email);

    // Ensure the user is linked to Firestore based on email
    await ensureUserInFirestore(user);

    return user;
  } catch (error) {
    console.error("🔥 Login error:", error);
    throw error;
  }
};


export const getUserRole = async (uid) => {
    try {
      // 🔥 Query Firestore to find user by `uid` field instead of document ID
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", uid));
      const querySnapshot = await getDocs(q);
  
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        console.log("User document:", userData); // 🔥 Log entire user document
        console.log("User role:", userData.role);
        return userData.role;
      } else {
        console.log("No user found in Firestore for UID:", uid);
        return null;
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

// Logout function
export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log("✅ User logged out.");
  } catch (error) {
    console.error("🔥 Logout error:", error);
  }
};
