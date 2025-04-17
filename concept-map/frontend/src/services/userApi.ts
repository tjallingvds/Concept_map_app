import {API_URL, authFetch} from "./baseApi.ts";


const userApi = {
    updateProfile: async (
        token: string,
        updates: {
            displayName?: string;
            bio?: string;
        }
    ) => {
        const res = await authFetch(`${API_URL}/api/auth/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to update profile");
        }

        return await res.json();
    },

    uploadAvatar: async (token: string, avatar: File) => {
        const formData = new FormData();
        formData.append("avatar", avatar);

        const res = await authFetch(`${API_URL}/api/auth/profile/avatar`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to upload avatar");
        }

        return await res.json();
    },
};

export default userApi;
