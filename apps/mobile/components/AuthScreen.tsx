import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export function AuthScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { login, register, demoLogin } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (mode === "register" && !name.trim()) {
      setErrorMessage("Nama lengkap wajib diisi.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Alamat email tidak valid.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage("Kata sandi minimal 6 karakter.");
      return;
    }

    try {
      setIsLoading(true);
      if (mode === "login") {
        await login(email.trim().toLowerCase(), password);
      } else {
        await register(name.trim(), email.trim().toLowerCase(), password);
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = async () => {
    setErrorMessage(null);
    try {
      setIsLoading(true);
      await demoLogin();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Controls: Theme Toggle */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.themeBtn,
              {
                backgroundColor: colors.surfaceHighlight,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon"}
              size={18}
              color={isDark ? "#FBBF24" : colors.brand}
            />
          </TouchableOpacity>
        </View>

        {/* Hero Branding */}
        <View style={styles.heroSection}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.brandLogoHero}
            resizeMode="cover"
          />
          <View style={styles.brandTitleRow}>
            <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
              FinTrack
            </Text>
            <View
              style={[
                styles.aiBadge,
                {
                  backgroundColor: colors.brandBg,
                  borderColor: colors.brandBorder,
                },
              ]}
            >
              <Ionicons name="sparkles" size={10} color={colors.brand} />
              <Text style={[styles.aiBadgeText, { color: colors.brand }]}>
                CREATIVE
              </Text>
            </View>
          </View>
          <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
            Kelola Keuangan & Ekstraksi Struk Cerdas
          </Text>
        </View>

        {/* Auth Card */}
        <View
          style={[
            styles.authCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Mode Switcher Tabs */}
          <View
            style={[
              styles.tabBar,
              { backgroundColor: colors.surfaceHighlight },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setMode("login");
                setErrorMessage(null);
              }}
              style={[
                styles.tabBtn,
                mode === "login" && [
                  styles.tabBtnActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
            >
              <Ionicons
                name="log-in-outline"
                size={16}
                color={mode === "login" ? colors.textPrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      mode === "login" ? colors.textPrimary : colors.textMuted,
                    fontWeight: mode === "login" ? "800" : "600",
                  },
                ]}
              >
                Masuk
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode("register");
                setErrorMessage(null);
              }}
              style={[
                styles.tabBtn,
                mode === "register" && [
                  styles.tabBtnActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
                color={mode === "register" ? colors.textPrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      mode === "register" ? colors.textPrimary : colors.textMuted,
                    fontWeight: mode === "register" ? "800" : "600",
                  },
                ]}
              >
                Daftar Akun
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message Box */}
          {errorMessage && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.expenseIconBg,
                  borderColor: colors.expenseText,
                },
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={16}
                color={colors.expenseText}
              />
              <Text style={[styles.errorText, { color: colors.expenseText }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formArea}>
            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Nama Lengkap *
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.surfaceHighlight,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Contoh: Dandy Zain"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Alamat Email *
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="nama@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Kata Sandi *
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.brand,
                  shadowColor: colors.brand,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 4,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={mode === "login" ? "log-in" : "checkmark-circle"}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text
                    style={[
                      styles.submitBtnText,
                      { color: "#FFFFFF" },
                    ]}
                  >
                    {mode === "login" ? "Masuk ke Akun" : "Buat Akun Baru"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: colors.borderSubtle },
                ]}
              />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>
                atau coba langsung
              </Text>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: colors.borderSubtle },
                ]}
              />
            </View>

            {/* 1-Click Instant Demo Login */}
            <TouchableOpacity
              onPress={handleDemo}
              disabled={isLoading}
              style={[
                styles.demoBtn,
                {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="flash" size={16} color={colors.neonCyan} />
              <Text style={[styles.demoBtnText, { color: colors.textPrimary }]}>
                Masuk Instan (Akun Demo: Dandy Zain)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={14}
            color={colors.incomeText}
          />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            FinTrack aman, privat & tersinkronisasi
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 50,
    paddingBottom: 40,
    minHeight: "100%",
    justifyContent: "center",
  },
  topBar: {
    alignItems: "flex-end",
    marginBottom: 10,
  },
  themeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  brandLogoHero: {
    width: 68,
    height: 68,
    borderRadius: 22,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  brandTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  authCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  formArea: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    height: "100%",
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 16,
    marginTop: 6,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "600",
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 22,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
