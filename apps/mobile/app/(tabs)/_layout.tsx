import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
          marginBottom: Platform.OS === "android" ? 6 : 0,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === "android" ? 66 : 82,
          paddingTop: 8,
          paddingBottom: Platform.OS === "android" ? 8 : 24,
          elevation: 15,
          shadowColor: isDark ? "#6366F1" : "#000000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: isDark ? 0.25 : 0.08,
          shadowRadius: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "#EEF2FF" },
              ]}
            >
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                size={20}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan AI",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.scanCenterButton,
                {
                  backgroundColor: isDark ? "#6366F1" : "#0F172A",
                  borderColor: isDark ? "#06B6D4" : "#818CF8",
                },
              ]}
            >
              <Ionicons
                name="scan"
                size={22}
                color="#FFFFFF"
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  scanCenterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
});
