import { auth } from "./config";
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    OAuthProvider, 
    signInWithPopup 
} from "firebase/auth";

export async function login(email: string, password: string) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch {
        throw new Error("Incorrect password or email.");
    }
}

export async function signInWithMicrosoft() {
    const provider = new OAuthProvider('microsoft.com');
    const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID;
    
    provider.setCustomParameters({
        ...(tenantId ? { tenant: tenantId } : {}),
        prompt: "select_account",
    });

    try {
        await signInWithPopup(auth, provider);
    } catch (error: any) {
        console.error("Microsoft sign-in error:", error);
        throw new Error(error.message || "Failed to sign in with Microsoft.");
    }
}

export async function getToken(): Promise<string> {
    const user = auth.currentUser;

    if (user) {
        return user.getIdToken(true);
    }

    return new Promise((resolve, reject) => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            unsub();
            if (!u) {
                reject(new Error("User not signed in"));
                return;
            }
            resolve(await u.getIdToken(true));
        });
    });
}

export function signOut() {
    auth.signOut();
}
