import {API_URL, authFetch, useAuthFetch} from "./baseApi.ts";


let authFetch: typeof fetch = () => {
    throw new Error("authFetch not initialized");
};

// ✅ One-time setter to be called from useConceptMapsApi
export const setAuthFetch = (fetchFn: typeof fetch) => {
    authFetch = fetchFn;
};


const userApi = {
    updateProfile: async (
        updates: {
            displayName?: string;
            bio?: string;
        }
    ) => {
        const res = await authFetch(`${API_URL}/api/auth/profile/`, {
            method: "PUT",
            body: JSON.stringify(updates),
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to update profile");
        }

        return await res.json();
    },

    uploadAvatar: async (avatar: File) => {
        const formData = new FormData();
        formData.append("avatar", avatar);

        const res = await authFetch(`${API_URL}/api/auth/profile/avatar/`, {
            method: "POST",
            body: formData,
            // Remove the Content-Type header to let the browser set it automatically
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to upload avatar");
        }

        return await res.json();
    },
    updateUserProfile: async (updates: {
        name?: string;
        bio?: string;
        avatar?: File | null;
    }) => {
        console.log(updates)
        console.log('isFile', updates.avatar instanceof File, updates.avatar);

        // Update avatar if provided
        if (updates.avatar instanceof File) {

            await userApi.uploadAvatar(updates.avatar);
        }

        // Update profile fields
        if (updates.name || updates.bio) {
            return await userApi.updateProfile({
                displayName: updates.name,
                bio: updates.bio,
            });
        }
    },
    getUserProfile: async () => {
        const res = await authFetch(`${API_URL}/api/auth/profile/`);

        if (!res.ok) {
            throw new Error("Failed to fetch user profile from backend");
        }

        return await res.json();
    }
};

export function useUserApi() {
    const authFetch = useAuthFetch();
    setAuthFetch(authFetch);
    return userApi;
}

