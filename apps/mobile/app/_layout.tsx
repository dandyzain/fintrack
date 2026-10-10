import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { AuthScreen } from "../components/AuthScreen";
import * as SplashScreen from "expo-splash-screen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function RootNavigation() {
  const { isDark, colors } = useTheme();
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <AuthScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
