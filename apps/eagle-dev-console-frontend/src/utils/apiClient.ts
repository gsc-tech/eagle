import axios from "axios";
import { getToken, signOut } from "@/firebase/authService";

// const navigate = useNavigate();

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
})

api.interceptors.request.use(async (config) => {
    const token = await getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config
})

api.interceptors.request.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            signOut()
            // navigate("/login")
            // handle the navigation to the login page later.
        }

        return Promise.reject(err);
    }
)

export {api}