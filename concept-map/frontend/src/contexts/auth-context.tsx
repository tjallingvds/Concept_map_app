import { useAuth0 } from '@auth0/auth0-react';
import userApi from "../services/userApi.ts";

export const useAuth = () => {
    const {
        loginWithRedirect,
        logout,
        user,
        isAuthenticated,
        isLoading,
        getAccessTokenSilently,
    } = useAuth0();

    const updateUserProfile = async (updates: {
        displayName?: string;
        bio?: string;
        avatar?: File | null;
    }) => {
        const token = await getAccessTokenSilently();

        // Update avatar if provided
        if (updates.avatar instanceof File) {
            await userApi.uploadAvatar(token, updates.avatar);
        }

        // Update profile fields
        if (updates.displayName || updates.bio) {
            return await userApi.updateProfile(token, {
                displayName: updates.displayName,
                bio: updates.bio,
            });
        }
    };

    return {
        login: loginWithRedirect,
        logout: (options?: any) =>
            logout({ logoutParams: { returnTo: window.location.origin }, ...options }),
        user: isAuthenticated ? user : null,
        loading: isLoading,
        isAuthenticated,
        getToken: getAccessTokenSilently,
        updateUserProfile,
    };
};


