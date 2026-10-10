import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { type AuthUser } from "@fintrack/shared";
import {
  loginApi,
  registerApi,
  getMeApi,
  setAuthToken,
} from "../services/api";
import {
  saveStorageItem,
  getStorageItem,
  removeStorageItem,
} from "../utils/storage";

const STORAGE_KEY = "fintrack_auth_session";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  demoLogin: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore stored session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = await getStorageItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.token && parsed.user) {
            setAuthToken(parsed.token);
            setToken(parsed.token);
            setUser(parsed.user);

            // Verify session with server asynchronously
            try {
              const freshUser = await getMeApi();
              setUser(freshUser);
              await saveStorageItem(
                STORAGE_KEY,
                JSON.stringify({ token: parsed.token, user: freshUser })
              );
            } catch (err) {
              console.warn("Session refresh notice:", err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to restore auth session:", err);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginApi(email, password);
    setToken(data.token);
    setUser(data.user);
    setAuthToken(data.token);
    await saveStorageItem(
      STORAGE_KEY,
      JSON.stringify({ token: data.token, user: data.user })
    );
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await registerApi(name, email, password);
      setToken(data.token);
      setUser(data.user);
      setAuthToken(data.token);
      await saveStorageItem(
        STORAGE_KEY,
        JSON.stringify({ token: data.token, user: data.user })
      );
    },
    []
  );

  const demoLogin = useCallback(async () => {
    await login("dandy@example.com", "password123");
  }, [login]);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await removeStorageItem(STORAGE_KEY);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await getMeApi();
      setUser(freshUser);
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        demoLogin,
        logout,
        refreshUser,
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
