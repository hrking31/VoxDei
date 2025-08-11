import firebaseConfig from "./FirebaseConfig";
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const db = getFirestore(app);
