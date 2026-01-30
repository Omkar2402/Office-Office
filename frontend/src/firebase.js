// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC24mKEo6KJ0Xuvno6oIR6Vfy-L6cciYyY",
  authDomain: "officeoffice-49de2.firebaseapp.com",
  projectId: "officeoffice-49de2",
  storageBucket: "officeoffice-49de2.firebasestorage.app",
  messagingSenderId: "514291258416",
  appId: "1:514291258416:web:77cf3111b7a0a9d84c09f5",
  measurementId: "G-CG1586WHWR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);