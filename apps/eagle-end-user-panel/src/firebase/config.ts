import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAzzuMbRLcPmxDNiYJEGw47lQ9tNNvszCI",
    authDomain: "eagle-e263b.firebaseapp.com",
    projectId: "eagle-e263b",
    storageBucket: "eagle-e263b.firebasestorage.app",
    messagingSenderId: "1070621403039",
    appId: "1:1070621403039:web:a954162facd7ea33da3faa",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
