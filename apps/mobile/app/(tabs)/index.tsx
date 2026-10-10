import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAnalyticsApi,
  fetchWalletsApi,
  fetchCategoriesApi,
  fetchTransactionsApi,
} from "../../services/api";
import { ManualTransactionModal } from "../../components/ManualTransactionModal";
import { WalletManagementModal } from "../../components/WalletManagementModal";
import { ProfileModal } from "../../components/ProfileModal";

export default function MobileDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Queries
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    refetch: refetchAnalytics,
    isRefetching: isAnalyticsRefetching,
  } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalyticsApi,
  });

  const {
    data: wallets = [],
    refetch: refetchWallets,
    isRefetching: isWalletsRefetching,
  } = useQuery({
    queryKey: ["wallets"],
    queryFn: fetchWalletsApi,
  });

  const {
    data: categories = [],
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategoriesApi,
  });

  // Filter States for Transactions
  const [txSearch, setTxSearch] = useState("");
  const [txType, setTxType] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL");
  const [txWalletId, setTxWalletId] = useState("");
  const [txCategoryId, setTxCategoryId] = useState("");
  const [txReceiptOnly, setTxReceiptOnly] = useState(false);
  const [txSortBy, setTxSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  const isTxFiltered =
    txSearch.trim() !== "" ||
    txType !== "ALL" ||
    txWalletId !== "" ||
    txCategoryId !== "" ||
    txReceiptOnly ||
    txSortBy !== "date_desc";

  const handleResetTxFilters = () => {
    setTxSearch("");
    setTxType("ALL");
    setTxWalletId("");
    setTxCategoryId("");
    setTxReceiptOnly(false);
    setTxSortBy("date_desc");
  };

  const {
    data: transactions = [],
    refetch: refetchTransactions,
    isRefetching: isTransactionsRefetching,
  } = useQuery({
    queryKey: [
      "transactions",
      txSearch,
      txType,
      txWalletId,
      txCategoryId,
      txReceiptOnly,
      txSortBy,
    ],
    queryFn: () =>
      fetchTransactionsApi({
        limit: 30,
        search: txSearch.trim() || undefined,
        type: txType !== "ALL" ? txType : undefined,
        walletId: txWalletId || undefined,
        categoryId: txCategoryId || undefined,
        hasReceipt: txReceiptOnly ? "true" : undefined,
        sortBy: txSortBy,
      }),
  });

  const isRefreshing =
    isAnalyticsRefetching || isWalletsRefetching || isTransactionsRefetching;

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchAnalytics(),
      refetchWallets(),
      refetchCategories(),
      refetchTransactions(),
    ]);
  };

  const handleTransactionCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
    queryClient.invalidateQueries({ queryKey: ["wallets"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const totalBalance = wallets.reduce(
    (acc: number, w: any) => acc + Number(w.balance || 0),
    0
  );

  const totalExpense = analytics?.summary?.totalExpense || 0;
  const totalIncome = analytics?.summary?.totalIncome || 0;
  const netSavings = analytics?.summary?.netSavings || 0;
  const savingsRate =
    totalIncome > 0
      ? Math.max(0, Math.round((netSavings / totalIncome) * 100))
      : 0;

  const currentMonthName = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  // Virtual Card Background Presets for mobile (Light: Vibrant Jewel, Dark: Deep Obsidian)
  const cardThemes = [
    {
      bg: isDark ? "#121826" : "#4338CA",
      border: isDark ? "#818CF8" : "#6366F1",
      tag: "PLATINUM",
    },
    {
      bg: isDark ? "#063428" : "#047857",
      border: isDark ? "#34D399" : "#10B981",
      tag: "EMERALD",
    },
    {
      bg: isDark ? "#2E1065" : "#6D28D9",
      border: isDark ? "#C4B5FD" : "#8B5CF6",
      tag: "DIGITAL",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Navbar Header */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.brandLogoImage}
            resizeMode="cover"
          />
          <View>
            <View style={styles.brandTitleRow}>
              <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
                FinTrack
              </Text>
              <View
                style={[
                  styles.aiBadge,
                  {
                    backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "#EEF2FF",
                    borderColor: isDark ? "#6366F1" : "#C7D2FE",
                  },
                ]}
              >
                <Text style={[styles.aiBadgeText, { color: isDark ? "#818CF8" : "#4F46E5" }]}>
                  CREATIVE
                </Text>
              </View>
            </View>
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
              {currentMonthName} • {user?.name || "Dandy Zain"}
            </Text>
          </View>
        </View>

        {/* Right Header Controls: Dark Mode, Refresh, Profile Avatar */}
        <View style={styles.headerControls}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceHighlight,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon"}
              size={17}
              color={isDark ? "#FBBF24" : colors.brand}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRefreshAll}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceHighlight,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="refresh"
              size={17}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsProfileModalOpen(true)}
            activeOpacity={0.8}
            style={[
              styles.avatarBox,
              { backgroundColor: colors.brand },
            ]}
          >
            <Text style={styles.avatarText}>
              {(user?.name || "Dandy Zain")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshAll}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
      >
        {/* =========================================================
            BENTO HERO BALANCE CARD (Mobile)
            ========================================================= */}
        <View
          style={[
            styles.heroBentoCard,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? "rgba(99, 102, 241, 0.3)" : colors.border,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={styles.heroIndicatorDot} />
              <Text style={[styles.heroLabel, { color: colors.textMuted }]}>
                TOTAL SALDO KANTONG
              </Text>
            </View>
            <View style={styles.heroGrowthBadge}>
              <Ionicons name="trending-up" size={12} color="#10B981" />
              <Text style={styles.heroGrowthText}>+14.2%</Text>
            </View>
          </View>

          <Text style={[styles.heroBalanceText, { color: colors.textPrimary }]}>
            Rp {totalBalance.toLocaleString("id-ID")}
          </Text>

          <View style={[styles.heroMiniStatsRow, { borderTopColor: colors.border }]}>
            <View style={styles.heroMiniStatCol}>
              <Text style={[styles.heroMiniStatLabel, { color: colors.textMuted }]}>
                Pengeluaran
              </Text>
              <Text style={[styles.heroMiniStatValue, { color: colors.expenseText }]}>
                Rp {totalExpense.toLocaleString("id-ID")}
              </Text>
            </View>
            <View style={[styles.heroMiniStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroMiniStatCol}>
              <Text style={[styles.heroMiniStatLabel, { color: colors.textMuted }]}>
                Pemasukan
              </Text>
              <Text style={[styles.heroMiniStatValue, { color: colors.incomeText }]}>
                Rp {totalIncome.toLocaleString("id-ID")}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Action CTAs */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.push("/(tabs)/scan")}
          >
            <Ionicons
              name="scan"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.primaryActionText}>
              Pindai Struk AI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryActionBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setIsManualModalOpen(true)}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={colors.textPrimary}
            />
            <Text
              style={[
                styles.secondaryActionText,
                { color: colors.textPrimary },
              ]}
            >
              Catat Manual
            </Text>
          </TouchableOpacity>
        </View>

        {/* =========================================================
            SECTION: VIRTUAL CARD DECK (DOMPET KEWANGAN DIGITAL)
            ========================================================= */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="card" size={16} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Virtual Card Deck (Kantong)
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsWalletModalOpen(true)}
            style={[
              styles.kelolaBtn,
              {
                backgroundColor: colors.brandBg,
                borderColor: colors.brandBorder,
              },
            ]}
          >
            <Ionicons name="add" size={13} color={colors.brand} />
            <Text style={[styles.kelolaBtnText, { color: colors.brand }]}>
              Kelola
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.walletsScroll}
        >
          {wallets.map((w: any, index: number) => {
            const cardTheme = cardThemes[index % cardThemes.length];

            return (
              <TouchableOpacity
                key={w.id}
                activeOpacity={0.9}
                onPress={() => setIsWalletModalOpen(true)}
                style={[
                  styles.virtualDebitCard,
                  {
                    backgroundColor: cardTheme.bg,
                    borderColor: cardTheme.border,
                  },
                ]}
              >
                {/* Chip and Contactless row */}
                <View style={styles.vCardTop}>
                  <View style={styles.vCardChip}>
                    <View style={styles.vCardChipInner} />
                  </View>
                  <View style={styles.vCardNfcBox}>
                    <Ionicons name="wifi" size={14} color="#CBD5E1" style={{ transform: [{ rotate: "90deg" }] }} />
                    <Text style={styles.vCardTagText}>{cardTheme.tag}</Text>
                  </View>
                </View>

                {/* Balance display */}
                <View style={styles.vCardMid}>
                  <Text style={styles.vCardBalanceLabel}>SALDO TERSEDIA</Text>
                  <Text style={styles.vCardBalanceVal}>
                    Rp {Number(w.balance || 0).toLocaleString("id-ID")}
                  </Text>
                </View>

                {/* Card footer: wallet name & masked number */}
                <View style={styles.vCardBot}>
                  <Text style={styles.vCardName} numberOfLines={1}>
                    {w.name}
                  </Text>
                  <Text style={styles.vCardNumber}>
                    •••• {1000 + (index * 243) % 9000}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Quick Add Card */}
          <TouchableOpacity
            onPress={() => setIsWalletModalOpen(true)}
            style={[
              styles.addPocketCard,
              {
                backgroundColor: colors.surfaceHighlight,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.addPocketIconCircle, { backgroundColor: colors.brandBg }]}>
              <Ionicons name="add" size={20} color={colors.brand} />
            </View>
            <Text style={[styles.addPocketText, { color: colors.textPrimary }]}>
              Tambah Kantong
            </Text>
            <Text style={[styles.addPocketSub, { color: colors.textMuted }]}>
              Rekening & E-wallet
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Section: Statistik & Wawasan AI */}
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="bar-chart" size={16} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Statistik & Wawasan AI
            </Text>
          </View>
          <View
            style={[
              styles.healthPill,
              {
                backgroundColor:
                  analytics?.financialHealth?.status === "EXCELLENT" ||
                  analytics?.financialHealth?.status === "HEALTHY"
                    ? colors.safeBg
                    : colors.warningBg,
                borderColor:
                  analytics?.financialHealth?.status === "EXCELLENT" ||
                  analytics?.financialHealth?.status === "HEALTHY"
                    ? colors.safeBorder
                    : colors.warningBorder,
              },
            ]}
          >
            <Ionicons
              name={
                analytics?.financialHealth?.status === "EXCELLENT" ||
                analytics?.financialHealth?.status === "HEALTHY"
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={12}
              color={
                analytics?.financialHealth?.status === "EXCELLENT" ||
                analytics?.financialHealth?.status === "HEALTHY"
                  ? colors.safeText
                  : colors.warningText
              }
            />
            <Text
              style={[
                styles.healthPillText,
                {
                  color:
                    analytics?.financialHealth?.status === "EXCELLENT" ||
                    analytics?.financialHealth?.status === "HEALTHY"
                      ? colors.safeText
                      : colors.warningText,
                },
              ]}
            >
              Skor {analytics?.financialHealth?.score ?? 88}/100 • {analytics?.financialHealth?.label ?? "Optimal"}
            </Text>
          </View>
        </View>

        {/* 4 Quick Stat Metric Bento Cards (2x2 Grid) */}
        <View style={styles.statsMetricGrid}>
          {/* 1. Rata-rata Harian */}
          <View
            style={[
              styles.statMetricCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.statMetricHeader}>
              <Text style={[styles.statMetricLabel, { color: colors.textSecondary }]}>
                RERATA / HARI
              </Text>
              <Ionicons name="calendar-outline" size={13} color="#06B6D4" />
            </View>
            <Text
              style={[styles.statMetricValue, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              Rp {(analytics?.metrics?.dailyAverageExpense ?? Math.round(totalExpense / 30)).toLocaleString("id-ID")}
            </Text>
            <Text style={[styles.statMetricSub, { color: colors.textMuted }]}>
              Harian bulan ini
            </Text>
          </View>

          {/* 2. Rerata per Belanja */}
          <View
            style={[
              styles.statMetricCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.statMetricHeader}>
              <Text style={[styles.statMetricLabel, { color: colors.textSecondary }]}>
                RERATA / BELANJA
              </Text>
              <Ionicons name="cash-outline" size={13} color="#8B5CF6" />
            </View>
            <Text
              style={[styles.statMetricValue, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              Rp {(analytics?.metrics?.averageTransactionAmount ?? 0).toLocaleString("id-ID")}
            </Text>
            <Text style={[styles.statMetricSub, { color: colors.textMuted }]}>
              Per transaksi
            </Text>
          </View>

          {/* 3. Pengeluaran Terbesar */}
          <View
            style={[
              styles.statMetricCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.statMetricHeader}>
              <Text style={[styles.statMetricLabel, { color: colors.textSecondary }]}>
                TERBESAR
              </Text>
              <Ionicons name="trending-down" size={13} color={colors.expenseText} />
            </View>
            <Text
              style={[styles.statMetricValue, { color: colors.expenseText }]}
              numberOfLines={1}
            >
              {analytics?.metrics?.largestExpense
                ? `Rp ${Number(analytics.metrics.largestExpense.amount).toLocaleString("id-ID")}`
                : "-"}
            </Text>
            <Text style={[styles.statMetricSub, { color: colors.textMuted }]} numberOfLines={1}>
              {analytics?.metrics?.largestExpense?.merchantName || "Belum ada"}
            </Text>
          </View>

          {/* 4. Struk AI OCR */}
          <View
            style={[
              styles.statMetricCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.statMetricHeader}>
              <Text style={[styles.statMetricLabel, { color: colors.textSecondary }]}>
                STRUK VISION AI
              </Text>
              <Ionicons name="sparkles" size={13} color="#10B981" />
            </View>
            <Text
              style={[styles.statMetricValue, { color: "#10B981" }]}
              numberOfLines={1}
            >
              {analytics?.metrics?.receiptScanCount ?? 0} Struk
            </Text>
            <Text style={[styles.statMetricSub, { color: colors.textMuted }]}>
              Rp {(analytics?.metrics?.receiptScanTotalAmount ?? 0).toLocaleString("id-ID")}
            </Text>
          </View>
        </View>

        {/* AI Advisory Banner */}
        <View
          style={[
            styles.aiAdvisoryCard,
            {
              backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : colors.brandBg,
              borderColor: isDark ? "rgba(99, 102, 241, 0.3)" : colors.brandBorder,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Ionicons name="bulb-outline" size={16} color={colors.brand} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiAdvisoryTitle, { color: colors.brand }]}>
                Wawasan Finansial FinTrack AI
              </Text>
              <Text style={[styles.aiAdvisoryText, { color: colors.textSecondary }]}>
                {analytics?.financialHealth?.message ??
                  `Rasio tabungan Anda bulan ini sebesar ${savingsRate}%. Arus kas berada dalam kondisi positif.`}
              </Text>
            </View>
          </View>
        </View>

        {/* Distribusi Pengeluaran Kategori (Breakdown Bar) */}
        {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 && (
          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.breakdownHeader}>
              <Text style={[styles.breakdownTitle, { color: colors.textPrimary }]}>
                Distribusi Belanja Kategori
              </Text>
              <Text style={[styles.breakdownSub, { color: colors.textMuted }]}>
                {analytics.categoryBreakdown.length} Kategori Aktif
              </Text>
            </View>

            <View style={[styles.breakdownBarTrack, { backgroundColor: colors.surfaceHighlight }]}>
              {analytics.categoryBreakdown.map((cat: any) => (
                <View
                  key={cat.categoryId}
                  style={{
                    height: "100%",
                    width: `${Math.max(3, cat.percentage)}%`,
                    backgroundColor: cat.categoryColor || colors.brand,
                  }}
                />
              ))}
            </View>

            <View style={styles.breakdownChipsRow}>
              {analytics.categoryBreakdown.slice(0, 4).map((cat: any) => (
                <View
                  key={cat.categoryId}
                  style={[
                    styles.miniCatChip,
                    {
                      backgroundColor: colors.surfaceHighlight,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.miniCatDot,
                      { backgroundColor: cat.categoryColor || colors.brand },
                    ]}
                  />
                  <Text style={[styles.miniCatText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {cat.categoryName} ({cat.percentage}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section: Pagu Anggaran Kategori */}
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Pagu Anggaran Kategori
          </Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
            Target bulanan
          </Text>
        </View>

        {isAnalyticsLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />
        ) : (
          analytics?.budgetComparisons?.map((item: any) => {
            const isOver = item.isOverBudget;
            const percentClamped = Math.min(
              100,
              Math.round(item.percentageUsed)
            );
            const isHigh = percentClamped > 80;

            const barColor = isOver
              ? colors.expenseText
              : isHigh
              ? "#F59E0B"
              : "#10B981";

            return (
              <View
                key={item.categoryId}
                style={[
                  styles.budgetItemCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetCategoryRow}>
                    <View
                      style={[
                        styles.catDot,
                        { backgroundColor: item.categoryColor || colors.brand },
                      ]}
                    />
                    <Text
                      style={[styles.budgetName, { color: colors.textPrimary }]}
                    >
                      {item.categoryName}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.statusPill,
                      isOver
                        ? {
                            backgroundColor: colors.dangerBg,
                            borderColor: colors.dangerBorder,
                          }
                        : isHigh
                        ? {
                            backgroundColor: colors.warningBg,
                            borderColor: colors.warningBorder,
                          }
                        : {
                            backgroundColor: colors.safeBg,
                            borderColor: colors.safeBorder,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: isOver
                            ? colors.dangerText
                            : isHigh
                            ? colors.warningText
                            : colors.safeText,
                        },
                      ]}
                    >
                      {isOver
                        ? "Pagu Terlampaui"
                        : isHigh
                        ? "Waspada"
                        : "Aman"}
                    </Text>
                  </View>
                </View>

                {/* Rounded Progress Bar */}
                <View
                  style={[
                    styles.progressBarTrack,
                    { backgroundColor: colors.surfaceHighlight },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${percentClamped}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>

                <View style={styles.budgetFooter}>
                  <Text
                    style={[styles.budgetAmountText, { color: colors.textSecondary }]}
                  >
                    Rp {item.actualExpense.toLocaleString("id-ID")}{" "}
                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                      / Rp {item.limitAmount.toLocaleString("id-ID")}
                    </Text>
                  </Text>
                  <Text
                    style={[
                      styles.budgetRemainingText,
                      {
                        color: isOver
                          ? colors.expenseText
                          : colors.brand,
                      },
                    ]}
                  >
                    {isOver
                      ? `+Rp ${(item.actualExpense - item.limitAmount).toLocaleString("id-ID")}`
                      : `Sisa Rp ${item.remainingBudget.toLocaleString("id-ID")}`}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* Section: Riwayat Transaksi Terakhir */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Riwayat Transaksi Terakhir
          </Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
            {transactions.length} mutasi ditemukan
          </Text>
        </View>

        {/* Mobile Filter Controls */}
        <View style={styles.filterSectionBox}>
          {/* Search Box */}
          <View
            style={[
              styles.searchBarContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={15} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Cari merchant, toko, atau catatan..."
              placeholderTextColor={colors.textMuted}
              value={txSearch}
              onChangeText={setTxSearch}
              returnKeyType="search"
            />
            {txSearch.length > 0 && (
              <TouchableOpacity onPress={() => setTxSearch("")}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Horizontal Chips: Type, Struk, Wallet, Category, Sort */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsScroll}
          >
            {/* Type Chips */}
            <TouchableOpacity
              onPress={() => setTxType("ALL")}
              style={[
                styles.filterChip,
                txType === "ALL"
                  ? { backgroundColor: colors.brand, borderColor: colors.brand }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: txType === "ALL" ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                Semua
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTxType(txType === "EXPENSE" ? "ALL" : "EXPENSE")}
              style={[
                styles.filterChip,
                txType === "EXPENSE"
                  ? { backgroundColor: colors.expenseText, borderColor: colors.expenseText }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.chipDot,
                  { backgroundColor: txType === "EXPENSE" ? "#FFFFFF" : colors.expenseText },
                ]}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: txType === "EXPENSE" ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                Pengeluaran
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTxType(txType === "INCOME" ? "ALL" : "INCOME")}
              style={[
                styles.filterChip,
                txType === "INCOME"
                  ? { backgroundColor: "#06B6D4", borderColor: "#06B6D4" }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.chipDot,
                  { backgroundColor: txType === "INCOME" ? "#FFFFFF" : "#06B6D4" },
                ]}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: txType === "INCOME" ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                Pemasukan
              </Text>
            </TouchableOpacity>

            {/* Struk AI Toggle Chip */}
            <TouchableOpacity
              onPress={() => setTxReceiptOnly(!txReceiptOnly)}
              style={[
                styles.filterChip,
                txReceiptOnly
                  ? { backgroundColor: colors.brandBg, borderColor: colors.brand }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="receipt"
                size={12}
                color={txReceiptOnly ? colors.brand : colors.textMuted}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: txReceiptOnly ? colors.brand : colors.textSecondary },
                ]}
              >
                Struk AI
              </Text>
            </TouchableOpacity>

            {/* Wallet Filter Chips */}
            {wallets.map((w: any) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => setTxWalletId(txWalletId === w.id ? "" : w.id)}
                style={[
                  styles.filterChip,
                  txWalletId === w.id
                    ? { backgroundColor: colors.brandBg, borderColor: colors.brand }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={12}
                  color={txWalletId === w.id ? colors.brand : colors.textMuted}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: txWalletId === w.id ? colors.brand : colors.textSecondary },
                  ]}
                >
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Category Filter Chips */}
            {categories.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setTxCategoryId(txCategoryId === c.id ? "" : c.id)}
                style={[
                  styles.filterChip,
                  txCategoryId === c.id
                    ? { backgroundColor: colors.brandBg, borderColor: colors.brand }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.chipDot,
                    { backgroundColor: c.color || colors.brand },
                  ]}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: txCategoryId === c.id ? colors.brand : colors.textSecondary },
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Sort Order Chip */}
            <TouchableOpacity
              onPress={() => {
                if (txSortBy === "date_desc") setTxSortBy("amount_desc");
                else if (txSortBy === "amount_desc") setTxSortBy("amount_asc");
                else if (txSortBy === "amount_asc") setTxSortBy("date_asc");
                else setTxSortBy("date_desc");
              }}
              style={[
                styles.filterChip,
                txSortBy !== "date_desc"
                  ? { backgroundColor: colors.brandBg, borderColor: colors.brand }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="swap-vertical"
                size={12}
                color={txSortBy !== "date_desc" ? colors.brand : colors.textMuted}
              />
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: txSortBy !== "date_desc" ? colors.brand : colors.textSecondary,
                  },
                ]}
              >
                {txSortBy === "date_desc"
                  ? "Terbaru"
                  : txSortBy === "amount_desc"
                  ? "Nominal ↓"
                  : txSortBy === "amount_asc"
                  ? "Nominal ↑"
                  : "Terlama"}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Filter Status & Reset Action */}
          <View style={styles.filterMetaRow}>
            <Text style={[styles.filterMetaCount, { color: colors.textSecondary }]}>
              {transactions.length} transaksi ditampilkan
            </Text>
            {isTxFiltered && (
              <TouchableOpacity
                onPress={handleResetTxFilters}
                style={[styles.resetBtn, { backgroundColor: colors.dangerBg }]}
              >
                <Ionicons name="refresh" size={11} color={colors.dangerText} />
                <Text style={[styles.resetBtnText, { color: colors.dangerText }]}>
                  Reset Filter
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {transactions.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="receipt-outline"
              size={32}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {isTxFiltered
                ? "Tidak ada transaksi yang cocok dengan filter yang dipilih."
                : "Belum ada transaksi. Pindai struk belanja atau buat transaksi manual pertama Anda!"}
            </Text>
            {isTxFiltered && (
              <TouchableOpacity
                onPress={handleResetTxFilters}
                style={[
                  styles.resetFilterEmptyBtn,
                  { backgroundColor: colors.brandBg, borderColor: colors.brandBorder },
                ]}
              >
                <Text style={[styles.resetFilterEmptyBtnText, { color: colors.brand }]}>
                  Bersihkan Filter
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx: any) => {
              const isExp = tx.type === "EXPENSE";
              const formattedDate = new Date(tx.date).toLocaleDateString(
                "id-ID",
                {
                  day: "numeric",
                  month: "short",
                }
              );

              return (
                <View
                  key={tx.id}
                  style={[
                    styles.txCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.txIconBox,
                      {
                        backgroundColor: isExp
                          ? colors.expenseIconBg
                          : colors.incomeIconBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isExp ? "arrow-down" : "arrow-up"}
                      size={16}
                      color={isExp ? colors.expenseText : colors.incomeText}
                    />
                  </View>

                  <View style={styles.txInfo}>
                    <Text
                      style={[styles.txTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {tx.merchantName || (isExp ? "Pengeluaran" : "Pemasukan")}
                    </Text>
                    <View style={styles.txMetaRow}>
                      <Text style={[styles.txMeta, { color: colors.textMuted }]}>
                        {formattedDate} • {tx.wallet?.name || "Dompet"}
                      </Text>
                      {tx.category && (
                        <View
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: colors.surfaceHighlight,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.catDotSmall,
                              { backgroundColor: tx.category.color || colors.brand },
                            ]}
                          />
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {tx.category.name}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.txAmountCol}>
                    <View
                      style={[
                        styles.amountPill,
                        {
                          backgroundColor: isExp
                            ? colors.expenseBg
                            : colors.incomeBg,
                          borderColor: isExp
                            ? colors.expenseBorder
                            : colors.incomeBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.amountPillText,
                          {
                            color: isExp
                              ? colors.expenseText
                              : colors.incomeText,
                          },
                        ]}
                      >
                        {isExp ? "-" : "+"}Rp{" "}
                        {Number(tx.amount).toLocaleString("id-ID")}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Manual Transaction Modal */}
      <ManualTransactionModal
        visible={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={handleTransactionCreated}
        wallets={wallets}
        categories={categories}
      />

      {/* Wallet Management Modal (Add & Remove Wallets) */}
      <WalletManagementModal
        visible={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSuccess={handleTransactionCreated}
        wallets={wallets}
      />

      {/* User Profile & Logout Modal */}
      <ProfileModal
        visible={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogoImage: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  brandTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },

  /* Hero Bento Card */
  heroBentoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  heroIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#06B6D4",
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroGrowthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  heroGrowthText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
  },
  heroBalanceText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  heroMiniStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  heroMiniStatCol: {
    flex: 1,
  },
  heroMiniStatDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  heroMiniStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  heroMiniStatValue: {
    fontSize: 13,
    fontWeight: "800",
  },

  /* Action Buttons */
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#6366F1",
    elevation: 4,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "800",
  },

  /* Virtual Debit Cards */
  walletsScroll: {
    gap: 12,
    paddingBottom: 6,
  },
  virtualDebitCard: {
    width: 200,
    height: 124,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  vCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vCardChip: {
    width: 24,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#E2B04A",
    borderWidth: 1,
    borderColor: "#B7811F",
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  vCardChipInner: {
    width: 14,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#926312",
  },
  vCardNfcBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  vCardTagText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#CBD5E1",
    letterSpacing: 0.5,
  },
  vCardMid: {
    marginVertical: 2,
  },
  vCardBalanceLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  vCardBalanceVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 1,
  },
  vCardBot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: 5,
  },
  vCardName: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    maxWidth: 90,
  },
  vCardNumber: {
    fontSize: 10,
    fontWeight: "700",
    color: "#CBD5E1",
    letterSpacing: 1,
  },
  addPocketCard: {
    width: 130,
    height: 124,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addPocketIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  addPocketText: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  addPocketSub: {
    fontSize: 8,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
  },

  /* Sections */
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  kelolaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  kelolaBtnText: {
    fontSize: 10,
    fontWeight: "800",
  },

  /* Budget Items */
  budgetItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginBottom: 9,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  budgetName: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 7,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  budgetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetAmountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  budgetRemainingText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* Transaction Items */
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  txList: {
    gap: 8,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 11,
    gap: 10,
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  txMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  txMeta: {
    fontSize: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  catDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryChipText: {
    fontSize: 9,
    fontWeight: "600",
  },
  txAmountCol: {
    alignItems: "flex-end",
  },
  amountPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  amountPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  healthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  healthPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statsMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  statMetricCard: {
    width: "48.5%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  statMetricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statMetricLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statMetricValue: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  statMetricSub: {
    fontSize: 9,
    fontWeight: "500",
  },
  aiAdvisoryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  aiAdvisoryTitle: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  aiAdvisoryText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  breakdownCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  breakdownSub: {
    fontSize: 10,
    fontWeight: "600",
  },
  breakdownBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 10,
  },
  breakdownChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  miniCatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniCatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniCatText: {
    fontSize: 9,
    fontWeight: "600",
  },
  filterSectionBox: {
    marginBottom: 12,
    gap: 8,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 0,
  },
  filterChipsScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  filterMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  filterMetaCount: {
    fontSize: 10,
    fontWeight: "600",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 10,
    fontWeight: "800",
  },
  resetFilterEmptyBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetFilterEmptyBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
