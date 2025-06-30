// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCkVaD4RHLXw1pLnlqM-vqG85fikXUVfsE",
  authDomain: "shopanimal2.firebaseapp.com",
  databaseURL: "https://shopanimal2-default-rtdb.firebaseio.com",
  projectId: "shopanimal2",
  storageBucket: "shopanimal2.appspot.com",
  messagingSenderId: "744797028530",
  appId: "1:744797028530:web:2cf1b77cf91b6fb717c9ab",
  measurementId: "G-FRQVT5WLD1"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const storage = getStorage(app);

export const db = getFirestore(app);
export { auth };
