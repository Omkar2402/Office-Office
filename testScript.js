import { ref, set } from "firebase/database";
import { db } from "./firebase.js";

set(ref(db, "test"), {
  message: "Firebase is working 🎉"
});
