import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const displayName = user?.name || "Dandy Zain";
  const displayEmail = user?.email || "dandy@example.com";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Keluar",
      `Apakah Anda yakin ingin keluar dari akun "${displayName}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            onClose();
            await logout();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.headerIconBox,
                  { backgroundColor: colors.brandBg },
                ]}
              >
                <Ionicons name="person" size={18} color={colors.brand} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Profil Pengguna
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Informasi akun & autentikasi
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight }]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* User Profile Card */}
          <View style={styles.content}>
            <View
              style={[
                styles.profileCard,
                {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.largeAvatar,
                  { backgroundColor: colors.brand },
                ]}
              >
                <Text style={styles.largeAvatarText}>{initials}</Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                  {displayName}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                  {displayEmail}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: colors.incomeBg,
                      borderColor: colors.incomeBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={11}
                    color={colors.incomeText}
                  />
                  <Text
                    style={[styles.statusText, { color: colors.incomeText }]}
                  >
                    Akun Publik • Tersinkron
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions / Settings */}
            <View
              style={[
                styles.settingsBox,
                {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Theme toggle row */}
              <TouchableOpacity
                onPress={toggleTheme}
                style={styles.settingRow}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name={isDark ? "sunny-outline" : "moon-outline"}
                    size={18}
                    color={colors.brand}
                  />
                  <Text
                    style={[styles.settingLabel, { color: colors.textPrimary }]}
                  >
                    Mode Tampilan ({isDark ? "Gelap" : "Terang"})
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Logout Action Button */}
            <TouchableOpacity
              onPress={handleLogout}
              style={[
                styles.logoutBtn,
                {
                  backgroundColor: colors.expenseIconBg,
                  borderColor: colors.expenseText,
                },
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color={colors.expenseText}
              />
              <Text
                style={[styles.logoutBtnText, { color: colors.expenseText }]}
              >
                Keluar dari Akun (Logout)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "500",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  largeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  largeAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 15,
    fontWeight: "800",
  },
  userEmail: {
    fontSize: 11,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  settingsBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
