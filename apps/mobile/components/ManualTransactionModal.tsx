import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { createTransactionApi } from "../services/api";

interface ManualTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wallets: any[];
  categories: any[];
}

export function ManualTransactionModal({
  visible,
  onClose,
  onSuccess,
  wallets,
  categories,
}: ManualTransactionModalProps) {
  const { colors, isDark } = useTheme();

  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState(
    wallets[0]?.id || ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if ((!selectedWalletId || !wallets.some((w) => w.id === selectedWalletId)) && wallets.length > 0) {
      setSelectedWalletId(wallets[0].id);
    }
    if ((!selectedCategoryId || !categories.some((c) => c.id === selectedCategoryId)) && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [wallets, categories, selectedWalletId, selectedCategoryId]);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount.replace(/[^0-9]/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Perhatian", "Masukkan nominal transaksi yang valid.");
      return;
    }
    if (!selectedWalletId) {
      Alert.alert("Perhatian", "Pilih dompet yang digunakan.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createTransactionApi({
        walletId: selectedWalletId,
        categoryId: type === "EXPENSE" ? selectedCategoryId || null : null,
        amount: numAmount,
        type,
        date: new Date().toISOString(),
        merchantName: merchantName.trim() || null,
        notes: notes.trim() || (type === "EXPENSE" ? "Pengeluaran Manual" : "Pemasukan Manual"),
        items: [],
      });

      Alert.alert("Berhasil", "Transaksi baru berhasil disimpan!");
      setAmount("");
      setMerchantName("");
      setNotes("");
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert("Gagal", (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
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
                <Ionicons name="add" size={18} color={colors.brand} />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Catat Transaksi Manual
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight }]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
          >
            {/* Type Selector (Pengeluaran vs Pemasukan) */}
            <View
              style={[
                styles.typeToggleWrapper,
                { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={() => setType("EXPENSE")}
                style={[
                  styles.typeOption,
                  type === "EXPENSE" && {
                    backgroundColor: colors.expenseBg,
                    borderColor: colors.expenseBorder,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={16}
                  color={type === "EXPENSE" ? colors.expenseText : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeText,
                    {
                      color:
                        type === "EXPENSE"
                          ? colors.expenseText
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Pengeluaran
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setType("INCOME")}
                style={[
                  styles.typeOption,
                  type === "INCOME" && {
                    backgroundColor: colors.incomeBg,
                    borderColor: colors.incomeBorder,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={16}
                  color={type === "INCOME" ? colors.incomeText : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeText,
                    {
                      color:
                        type === "INCOME"
                          ? colors.incomeText
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Pemasukan
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nominal (Amount) */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Nominal (Rp) *
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.currencyPrefix,
                  {
                    color:
                      type === "EXPENSE"
                        ? colors.expenseText
                        : colors.incomeText,
                  },
                ]}
              >
                Rp
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    color:
                      type === "EXPENSE"
                        ? colors.expenseText
                        : colors.incomeText,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Merchant / Title */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Nama Toko / Keterangan
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder={type === "EXPENSE" ? "Contoh: Kopi Janji Jiwa, Supermarket" : "Contoh: Gaji Bulanan, Freelance"}
              placeholderTextColor={colors.textMuted}
              value={merchantName}
              onChangeText={setMerchantName}
            />

            {/* Wallet Selector */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Pilih Dompet *
            </Text>
            <View style={styles.chipsWrap}>
              {wallets.map((w) => {
                const isSelected = selectedWalletId === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => setSelectedWalletId(w.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? colors.brandBg
                          : colors.surfaceHighlight,
                        borderColor: isSelected
                          ? colors.brand
                          : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="wallet-outline"
                      size={14}
                      color={isSelected ? colors.brand : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected
                            ? colors.brand
                            : colors.textSecondary,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Category Selector (if Expense) */}
            {type === "EXPENSE" && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Pilih Kategori
                </Text>
                <View style={styles.chipsWrap}>
                  {categories.map((c) => {
                    const isSelected = selectedCategoryId === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setSelectedCategoryId(c.id)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? `${c.color || colors.brand}20`
                              : colors.surfaceHighlight,
                            borderColor: isSelected
                              ? c.color || colors.brand
                              : colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: c.color || colors.brand },
                          ]}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected
                                ? c.color || colors.textPrimary
                                : colors.textSecondary,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Catatan Tambahan */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Catatan (Opsional)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Catatan tambahan transaksi..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[
                styles.submitBtn,
                {
                  backgroundColor:
                    type === "EXPENSE" ? colors.expenseText : colors.incomeText,
                },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    Simpan Transaksi {type === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
                  </Text>
                </>
              )}
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
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: "90%",
    paddingTop: 16,
    paddingBottom: 24,
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
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  formScroll: {
    maxHeight: 520,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  typeToggleWrapper: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: "800",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    padding: 0,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
