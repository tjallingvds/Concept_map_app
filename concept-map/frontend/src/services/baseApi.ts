
// API base URL
export const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";


import { useAuth } from "../contexts/auth-context";

export function useAuthFetch() {
    const { getToken } = useAuth();

    return async function authFetch(
        url: string,
        options: RequestInit = {}
    ): Promise<Response> {
        const token = await getToken();

        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        };

        return fetch(url, {
            ...options,
            headers,
        });
    };
}


