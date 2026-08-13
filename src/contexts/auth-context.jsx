import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEYS = {
  userName: "userName",
  userToken: "userToken",
  secureToken: "secureToken",
  refreshToken: "refreshToken",
  email: "email",
  userId: "userId",
  photoURL: "photoURL",
};

const normalizeSession = (values = {}) => {
  const username = values[STORAGE_KEYS.userName] || "";
  const userToken = values[STORAGE_KEYS.userToken] || "";
  const secureToken = values[STORAGE_KEYS.secureToken] || "";
  const refreshToken = values[STORAGE_KEYS.refreshToken] || "";
  const email = values[STORAGE_KEYS.email] || "";
  const userId = values[STORAGE_KEYS.userId] || "";
  const photoURL = values[STORAGE_KEYS.photoURL] || "";

  return {
    username,
    userToken,
    secureToken,
    refreshToken,
    email,
    userId,
    photoURL,
  };
};

const normalizeUserIdValue = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    const match = value.match(/ObjectId\(['"]?([0-9a-fA-F]{24})['"]?\)/i);
    if (match?.[1]) {
      return match[1];
    }

    const plainMatch = value.match(/([0-9a-fA-F]{24})/);
    if (plainMatch?.[1]) {
      return plainMatch[1];
    }

    return value;
  }

  if (typeof value === "object") {
    return normalizeUserIdValue(
      value.$oid ?? value.id ?? value._id ?? value.userId ?? value.userid,
    );
  }

  return String(value);
};

const resolveSessionValue = (incomingValue, fallbackValue) => {
  if (incomingValue === undefined || incomingValue === null) {
    return fallbackValue ?? "";
  }

  return incomingValue || fallbackValue || "";
};

const buildSessionPayload = (sessionData = {}, fallback = {}) => ({
  username: resolveSessionValue(
    sessionData.username ?? sessionData.userName,
    fallback.username ?? fallback.userName,
  ),
  userToken: resolveSessionValue(sessionData.userToken, fallback.userToken),
  secureToken: resolveSessionValue(
    sessionData.secureToken,
    fallback.secureToken,
  ),
  refreshToken: resolveSessionValue(
    sessionData.refreshToken,
    fallback.refreshToken,
  ),
  email: resolveSessionValue(sessionData.email, fallback.email),
  userId: normalizeUserIdValue(
    resolveSessionValue(
      sessionData.userId ??
        sessionData.userid ??
        sessionData.id ??
        sessionData._id,
      fallback.userId ?? fallback.userid ?? fallback.id ?? fallback._id,
    ),
  ),
  photoURL: resolveSessionValue(
    sessionData.photoURL ?? sessionData.photoUrl,
    fallback.photoURL ?? fallback.photoUrl,
  ),
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedServiceName, setSelectedServiceName] = useState("");
  const [selectedServiceOption, setSelectedServiceOption] = useState("");

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setIsLoading(true);
      const values = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
      const restoredSession = normalizeSession(Object.fromEntries(values));
      const hasSession = Boolean(
        restoredSession.username ||
        restoredSession.userToken ||
        restoredSession.secureToken ||
        restoredSession.userId ||
        restoredSession.email,
      );

      if (hasSession) {
        setSession(restoredSession);
        setIsAuthenticated(true);
      } else {
        setSession(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Failed to restore auth session:", error);
      setSession(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = async (sessionData = {}) => {
    const nextSession = buildSessionPayload(sessionData);

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.userName, nextSession.username],
      [STORAGE_KEYS.userToken, nextSession.userToken],
      [STORAGE_KEYS.secureToken, nextSession.secureToken],
      [STORAGE_KEYS.refreshToken, nextSession.refreshToken],
      [STORAGE_KEYS.email, nextSession.email],
      [STORAGE_KEYS.userId, nextSession.userId],
      [STORAGE_KEYS.photoURL, nextSession.photoURL],
    ]);

    setSession(nextSession);
    setIsAuthenticated(
      Boolean(
        nextSession.username ||
        nextSession.userToken ||
        nextSession.secureToken ||
        nextSession.userId ||
        nextSession.email,
      ),
    );

    return nextSession;
  };

  const updateSession = async (sessionData = {}) => {
    const nextSession = buildSessionPayload(sessionData, session || {});

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.userName, nextSession.username || ""],
      [STORAGE_KEYS.userToken, nextSession.userToken || ""],
      [STORAGE_KEYS.secureToken, nextSession.secureToken || ""],
      [STORAGE_KEYS.refreshToken, nextSession.refreshToken || ""],
      [STORAGE_KEYS.email, nextSession.email || ""],
      [STORAGE_KEYS.userId, nextSession.userId || ""],
      [STORAGE_KEYS.photoURL, nextSession.photoURL || ""],
    ]);

    setSession(nextSession);
    setIsAuthenticated(
      Boolean(
        nextSession.username ||
        nextSession.userToken ||
        nextSession.secureToken ||
        nextSession.userId ||
        nextSession.email,
      ),
    );

    return nextSession;
  };

  const clearSession = async () => {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    setSession(null);
    setIsAuthenticated(false);
  };

  const value = useMemo(
    () => ({
      session,
      isAuthenticated,
      isLoading,
      restoreSession,
      saveSession,
      updateSession,
      clearSession,
      selectedServiceName,
      setSelectedServiceName,
      selectedServiceOption,
      setSelectedServiceOption,
    }),
    [
      session,
      isAuthenticated,
      isLoading,
      selectedServiceName,
      selectedServiceOption,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
