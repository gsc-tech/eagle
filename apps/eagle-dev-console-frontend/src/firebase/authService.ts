import { auth } from './config';
import { signInWithEmailAndPassword, onAuthStateChanged } from '@firebase/auth';

export async function login(email: string, password: string) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
            console.log("User signed in");
        }
    } catch (error) {
        throw new Error("Incorrect Password or Email");
    }
}

export function getUser() {
    return auth.currentUser;
}


export async function getToken() {
    const user = auth.currentUser;

    if (user) {
        return user.getIdToken(true);
    }

    return new Promise((resolve, reject) => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            unsub();

            if (!user) {
                reject(new Error("User not signed in"));
                return;
            }

            resolve(await user.getIdToken(true));
        });
    });
}


export function signOut() {
    auth.signOut()
}