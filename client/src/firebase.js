import { initializeApp } from "firebase/app";
import {  getDatabase,
  ref,
  set,
  update,
  onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC24mKEo6KJ0Xuvno6oIR6Vfy-L6cciYyY",
  authDomain: "officeoffice-49de2.firebaseapp.com",
  projectId: "officeoffice-49de2",
  storageBucket: "officeoffice-49de2.firebasestorage.app",
  messagingSenderId: "514291258416",
  appId: "1:514291258416:web:77cf3111b7a0a9d84c09f5",
  measurementId: "G-CG1586WHWR"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export {  ref, set, update, onValue };
