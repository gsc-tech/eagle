import axios from "axios";
import { getToken, signOut } from "@/firebase/authService";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:9002/api",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(async (config) => {
    try {
        const token = await getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch {
        // proceed without token; the server will respond 401 if required
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            signOut();
        }
        return Promise.reject(err);
    }
);

export { api };
