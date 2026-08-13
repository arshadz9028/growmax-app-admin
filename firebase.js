import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC9AVubvafZMhziqQPiB4_utoqWdWDfl0g",
  authDomain: "growmax-8c525.firebaseapp.com",
  projectId: "growmax-8c525",
  appId: "1:843614337119:web:c1b69e638b1915b58a43ea",
};

 
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);