// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBdd1QvUqMZebnN4uCI1hSqb0bUgHcATII",
  authDomain: "ryme-revenue.firebaseapp.com",
  projectId: "ryme-revenue",
  storageBucket: "ryme-revenue.firebasestorage.app",
  messagingSenderId: "898242658455",
  appId: "1:898242658455:web:ba16d474146864e3c5a9d2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
