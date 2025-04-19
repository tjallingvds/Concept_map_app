import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

interface UserProfileUpdate {
  name?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserProfile: (data: UserProfileUpdate) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/current-user`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        // Ensure we set displayName if available from the backend
        setUser({
          ...data,
          displayName: data.displayName || data.email.split('@')[0],
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    setUser({
      ...data.user,
      displayName: data.user.displayName || data.user.email.split('@')[0],
    });
  };

  const register = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }
  };

  const logout = async () => {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  const deleteAccount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/account`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete account");
      }

      // Clear user data and logout
      setUser(null);
    } catch (error) {
      console.error("Account deletion failed:", error);
      throw error;
    }
  };

  const updateUserProfile = async (data: UserProfileUpdate) => {
    try {
      // In a real application, you would call an API endpoint to update the user profile
      // const response = await fetch(`${API_URL}/api/auth/profile`, {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(data),
      //   credentials: "include",
      // });
      
      // if (!response.ok) {
      //   const error = await response.json();
      //   throw new Error(error.error || "Profile update failed");
      // }

      // const updatedUser = await response.json();
      // setUser(updatedUser);
      
      // For now, just update the local state since backend isn't implemented
      if (user) {
        setUser({
          ...user,
          displayName: data.name || user.displayName,
          email: data.email || user.email,
          bio: data.bio !== undefined ? data.bio : user.bio,
        });
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
        updateUserProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 