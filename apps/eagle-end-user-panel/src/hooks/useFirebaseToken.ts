import { useCallback } from "react";
import { getAuth } from "firebase/auth";

export function useFirebaseToken(): () => Promise<string> {
    return useCallback(async () => {
        try {
            const user = getAuth().currentUser;
            if (user) return await user.getIdToken(false);
        } catch (err) {
            console.error("[useFirebaseToken] Failed to get token:", err);
        }
        return "";
    }, []);
}