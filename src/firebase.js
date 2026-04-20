// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// 1. Importamos funciones modernas para base de datos y cache persistente
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyC0JqOWRdkmFjBoAQN7igM_a2qKysYW2Kk",
  authDomain: "noarerp.firebaseapp.com",
  projectId: "noarerp",
  storageBucket: "noarerp.firebasestorage.app",
  messagingSenderId: "249887928589",
  appId: "1:249887928589:web:52105c219280985b4d0044",
  measurementId: "G-85X6HLWZ7W"
};

// Inicializa Firebase App
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Servicios Core con Persistencia Offline Estable (Soporte Multi-Pestaña)
export const auth = getAuth(app);
export const storage = getStorage(app);

// Inicializamos Firestore con el nuevo sistema de Cache (Elimina Assertion Errors)
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});