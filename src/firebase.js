// Importa las funciones que necesitas de los SDKs que necesitas
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <--- 1. AGREGADO

// PEGA AQUÍ LA CONFIGURACIÓN DE TU PROYECTO DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA5M0UOCZuDvuq_B4tYV5TcFv9eQVvk074",
  authDomain: "distribuidora-1de93.firebaseapp.com",
  projectId: "distribuidora-1de93",
  storageBucket: "distribuidora-1de93.firebasestorage.app",
  messagingSenderId: "491149648147",
  appId: "1:491149648147:web:ddcbdc9955405641667ae6"
};

// Inicializa Firebase y lo exporta
export const app = initializeApp(firebaseConfig);

// Exporta los servicios que usaremos en la aplicación
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // <--- 2. AGREGADO