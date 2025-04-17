import { useAuth0 } from '@auth0/auth0-react';

// API base URL
export const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const { getAccessTokenSilently } = useAuth0();
    const token = await getAccessTokenSilently();
    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
    };

    return fetch(url, {
        ...options,
        headers,
    });
}

