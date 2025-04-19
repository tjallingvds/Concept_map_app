import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';


const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export const useAuth = () => {
    const {
        loginWithRedirect,
        logout,
        user: auth0User,
        isAuthenticated,
        isLoading,
        getAccessTokenSilently,
    } = useAuth0();

    const [profile, setProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                if (isAuthenticated) {
                    const token = await getAccessTokenSilently();
                    const backendUser = await getUserProfile(token);
                    setProfile(backendUser);
                } else {
                    setProfile(null);
                }
            } catch (error) {
                console.error("Failed to load profile:", error);
            } finally {
                setProfileLoading(false);
            }
        };

        loadProfile();
    }, [isAuthenticated]);

    const getUserProfile = async (token: string) => {
        const res = await fetch(`${API_URL}/api/auth/profile`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            throw new Error("Failed to fetch user profile from backend");
        }

        return await res.json();
    };

    // Add a method to update the user state
    const updateUser = (updatedUser: any) => {
        setProfile((prevProfile) => ({
            ...prevProfile,
            ...updatedUser,
        }));
    };

    return {
        login: loginWithRedirect,
        logout: (options?: any) =>
            logout({ logoutParams: { returnTo: window.location.origin }, ...options }),
        user: profile,
        auth0User,
        isAuthenticated,
        loading: isLoading || profileLoading,
        getToken: getAccessTokenSilently,
        updateUser, // Expose the updateUser method
    };
};