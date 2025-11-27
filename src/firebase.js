// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// 1. Importamos enableIndexedDbPersistence para soporte offline
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA5M0UOCZuDvuq_B4tYV5TcFv9eQVvk074",
  authDomain: "distribuidora-1de93.firebaseapp.com",
  projectId: "distribuidora-1de93",
  storageBucket: "distribuidora-1de93.firebasestorage.app",
  messagingSenderId: "491149648147",
  appId: "1:491149648147:web:ddcbdc9955405641667ae6"
};

// Inicializa Firebase
export const app = initializeApp(firebaseConfig);

// Servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- 2. HABILITAR PERSISTENCIA OFFLINE (CACHE EN DISCO) ---
enableIndexedDbPersistence(db)
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn("Persistencia falló: Múltiples pestañas abiertas. Cierre las otras para habilitar el modo offline.");
      } else if (err.code == 'unimplemented') {
          console.warn("El navegador actual no soporta persistencia offline.");
      }
  });