import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ADMIN_TOKEN_KEY = "growmax_admin_token";
const ADMIN_PROFILE_KEY = "growmax_admin_profile";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [isRestoring, setIsRestoring] = useState(true);
  const [token, setToken] = useState("");
  const [admin, setAdmin] = useState(null);
  const router = useRouter();

  // Restore session on app load
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const [savedToken, savedProfile] = await Promise.all([
          SecureStore.getItemAsync(ADMIN_TOKEN_KEY),
          SecureStore.getItemAsync(ADMIN_PROFILE_KEY),
        ]);

        if (!active || !savedToken) return;

        setToken(savedToken);
        setAdmin(savedProfile ? JSON.parse(savedProfile) : null);
      } catch {
        // Corrupted session - clear it
        await SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(ADMIN_PROFILE_KEY).catch(() => {});
      } finally {
        if (active) setIsRestoring(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async ({ username, password }) => {
      // Get credentials from environment
      const validUsername = process.env.EXPO_PUBLIC_ADMIN_USERNAME || "Admin";
      const validPassword = process.env.EXPO_PUBLIC_ADMIN_PASSWORD || "admin@123";

      // Validate credentials
      if (username !== validUsername || password !== validPassword) {
        throw new Error("Invalid username or password");
      }

      // Create admin session
      const adminProfile = {
        username: validUsername,
        role: "admin",
        loginTime: new Date().toISOString(),
      };

      const sessionToken = `admin_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Save to secure storage
      await Promise.all([
        SecureStore.setItemAsync(ADMIN_TOKEN_KEY, sessionToken),
        SecureStore.setItemAsync(
          ADMIN_PROFILE_KEY,
          JSON.stringify(adminProfile),
        ),
      ]);

      // Update state
      setToken(sessionToken);
      setAdmin(adminProfile);

      // Navigate to home
      router.replace("/");

      return { token: sessionToken, admin: adminProfile };
    },
    [router],
  );

  const logout = useCallback(async () => {
    // Clear secure storage
    await Promise.all([
      SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY),
      SecureStore.deleteItemAsync(ADMIN_PROFILE_KEY),
    ]);

    // Clear state
    setToken("");
    setAdmin(null);

    // Navigate to login
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      isRestoring,
      isAuthenticated: Boolean(token),
      token,
      admin,
      login,
      logout,
    }),
    [isRestoring, token, admin, login, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }
  return context;
}
