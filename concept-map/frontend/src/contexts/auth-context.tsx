import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";

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
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserProfile: (data: UserProfileUpdate) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0();
  const [localUser, setLocalUser] = useState<User | null>(null);

  const checkAuth = async () => {
    if (user) {
      setLocalUser({
        id: user.sub,
        email: user.email,
        displayName: user.name || user.email.split('@')[0],
        avatarUrl: user.picture,
      });
    } else {
      setLocalUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [user]);

  const login = async (email: string, password: string) => {
    await loginWithRedirect({
      redirect_uri: window.location.origin,
      login_hint: email,
      password,
    });
  };

  const register = async (email: string, password: string) => {
    await loginWithRedirect({
      redirect_uri: window.location.origin,
      screen_hint: "signup",
      login_hint: email,
      password,
    });
  };
  const logoutUser = async () => {
    logout({ returnTo: window.location.origin });
    setLocalUser(null);
  };

  const updateUserProfile = async (data: UserProfileUpdate) => {
    // Update user profile logic here
    if (localUser) {
      setLocalUser({
        ...localUser,
        displayName: data.name || localUser.displayName,
        email: data.email || localUser.email,
        bio: data.bio !== undefined ? data.bio : localUser.bio,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: localUser,
        loading: isLoading,
        login,
        register,
        logout: logoutUser,
        checkAuth,
        updateUserProfile,
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