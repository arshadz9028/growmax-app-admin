import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "../components/animated-icon";
import AppTabs from "../components/app-tabs";
import LoginComponent from "../components/LoginComponent";
import { AdminAuthProvider, useAdminAuth } from "../contexts/AdminAuthContext";
import { AuthProvider } from "../contexts/auth-context";

function AdminAppGate() {
  const { isRestoring, isAuthenticated } = useAdminAuth();

  // Keep this empty while SecureStore restores the previous session.
  if (isRestoring) return null;
  
  return isAuthenticated ? <AppTabs /> : <LoginComponent />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AdminAuthProvider>
        <AuthProvider>
          <AnimatedSplashOverlay />
          <AdminAppGate />
        </AuthProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
