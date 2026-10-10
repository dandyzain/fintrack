export type ThemeMode = "light" | "dark";

export const themeColors = {
  light: {
    isDark: false,
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceHighlight: "#F1F5F9",
    border: "#E2E8F0",
    borderSubtle: "#F8FAFC",
    borderFocus: "#6366F1",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#94A3B8",

    // Creative Brand
    brand: "#6366F1",
    brandBg: "#EEF2FF",
    brandBorder: "#C7D2FE",
    brandText: "#4F46E5",

    // Primary CTA Accent
    ctaPrimary: "#6366F1",
    ctaPrimaryText: "#FFFFFF",

    // Semantic Accents
    neonCyan: "#06B6D4",
    neonViolet: "#6366F1",
    neonEmerald: "#10B981",
    neonRose: "#F43F5E",

    // KPI Metrics
    expenseBg: "#FFFFFF",
    expenseBorder: "#E2E8F0",
    expenseText: "#F43F5E",
    expenseIconBg: "#FFE4E6",

    incomeBg: "#FFFFFF",
    incomeBorder: "#E2E8F0",
    incomeText: "#059669",
    incomeIconBg: "#DCFCE7",

    savingsBg: "#FFFFFF",
    savingsBorder: "#E2E8F0",
    savingsText: "#0F172A",
    savingsIconBg: "#EEF2FF",

    wealthBg: "#FFFFFF",
    wealthBorder: "#E2E8F0",
    wealthText: "#0F172A",
    wealthIconBg: "#F1F5F9",

    // Status Badges
    safeBg: "#ECFDF5",
    safeText: "#047857",
    safeBorder: "#A7F3D0",

    warningBg: "#FFFBEB",
    warningText: "#B45309",
    warningBorder: "#FDE68A",

    dangerBg: "#FFF1F2",
    dangerText: "#BE123C",
    dangerBorder: "#FECDD3",

    // Tab Bar
    tabBarBg: "#FFFFFF",
    tabBarBorder: "#E2E8F0",
    tabActive: "#6366F1",
    tabInactive: "#94A3B8",
    tabActiveBg: "#EEF2FF",
  },
  dark: {
    isDark: true,
    background: "#090D16",
    surface: "#121826",
    surfaceHighlight: "#1B2337",
    border: "rgba(255, 255, 255, 0.08)",
    borderSubtle: "#1B2337",
    borderFocus: "#818CF8",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",

    // Creative Brand (Obsidian & Electric Glow)
    brand: "#6366F1",
    brandBg: "#1E1B4B",
    brandBorder: "#3730A3",
    brandText: "#E0E7FF",

    // Primary CTA Accent
    ctaPrimary: "#6366F1",
    ctaPrimaryText: "#FFFFFF",

    // Semantic Accents
    neonCyan: "#06B6D4",
    neonViolet: "#8B5CF6",
    neonEmerald: "#10B981",
    neonRose: "#F43F5E",

    // KPI Metrics
    expenseBg: "#121826",
    expenseBorder: "rgba(255, 255, 255, 0.08)",
    expenseText: "#FB7185",
    expenseIconBg: "#2A101A",

    incomeBg: "#121826",
    incomeBorder: "rgba(255, 255, 255, 0.08)",
    incomeText: "#34D399",
    incomeIconBg: "#064E3B",

    savingsBg: "#121826",
    savingsBorder: "rgba(255, 255, 255, 0.08)",
    savingsText: "#F8FAFC",
    savingsIconBg: "#1E1B4B",

    wealthBg: "#121826",
    wealthBorder: "rgba(255, 255, 255, 0.08)",
    wealthText: "#F8FAFC",
    wealthIconBg: "#1B2337",

    // Status Badges
    safeBg: "#064E3B",
    safeText: "#6EE7B7",
    safeBorder: "#047857",

    warningBg: "#451A03",
    warningText: "#FCD34D",
    warningBorder: "#78350F",

    dangerBg: "#4C0519",
    dangerText: "#FDA4AF",
    dangerBorder: "#881337",

    // Tab Bar
    tabBarBg: "#090D16",
    tabBarBorder: "rgba(255, 255, 255, 0.08)",
    tabActive: "#818CF8",
    tabInactive: "#64748B",
    tabActiveBg: "#1E1B4B",
  },
};
