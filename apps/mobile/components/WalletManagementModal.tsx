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
import { createWalletApi, deleteWalletApi } from "../services/api";

interface WalletManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wallets: any[];
}

export function WalletManagementModal({
  visible,
  onClose,
  onSuccess,
  wallets,
}: WalletManagementModalProps) {
  const { colors, isDark } = useTheme();

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Perhatian", "Nama kantong wajib diisi.");
      return;
    }

    const numBalance = parseFloat(balance.replace(/[^0-9]/g, "")) || 0;

    try {
      setIsSubmitting(true);
      await createWalletApi(name.trim(), numBalance);
      Alert.alert("Berhasil", `Kantong "${name.trim()}" berhasil dibuat!`);
      setName("");
      setBalance("");
      onSuccess();
    } catch (err) {
      Alert.alert("Gagal", (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (wallet: any) => {
    if (wallets.length <= 1) {
      Alert.alert(
        "Perhatian",
        "Tidak dapat menghapus kantong terakhir. Akun Anda harus memiliki minimal satu kantong."
      );
      return;
    }

    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus kantong "${wallet.name}"? Semua transaksi yang terkait akan ikut dihapus.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(wallet.id);
              await deleteWalletApi(wallet.id);
              Alert.alert("Berhasil", `Kantong "${wallet.name}" telah dihapus.`);
              onSuccess();
            } catch (err) {
              Alert.alert("Gagal", (err as Error).message);
            } finally {
              setDeletingId(null);
            }
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
                <Ionicons name="wallet" size={18} color={colors.brand} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Kelola Kantong Keuangan
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Tambah atau kurangi kantong dompet
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

          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
          >
            {/* Form Tambah Kantong */}
            <View
              style={[
                styles.addBox,
                {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.addBoxTitle, { color: colors.brand }]}>
                + TAMBAH KANTONG BARU
              </Text>

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nama Kantong *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Contoh: Tabungan Liburan, Dana Darurat"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Saldo Awal (Rp)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    fontWeight: "800",
                  },
                ]}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={balance}
                onChangeText={setBalance}
              />

              <TouchableOpacity
                onPress={handleCreate}
                disabled={isSubmitting}
                style={[styles.createBtn, { backgroundColor: colors.brand }]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={17} color="#FFFFFF" />
                    <Text style={styles.createBtnText}>Buat Kantong Baru</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* List Kantong Saat Ini */}
            <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
              DAFTAR KANTONG ANDA ({wallets.length})
            </Text>

            <View style={styles.walletList}>
              {wallets.map((w) => (
                <View
                  key={w.id}
                  style={[
                    styles.walletItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.walletItemLeft}>
                    <View
                      style={[
                        styles.walletIcon,
                        { backgroundColor: colors.brandBg },
                      ]}
                    >
                      <Ionicons
                        name="card-outline"
                        size={16}
                        color={colors.brand}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.walletItemName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {w.name}
                      </Text>
                      <Text
                        style={[
                          styles.walletItemBalance,
                          { color: colors.brand },
                        ]}
                      >
                        Rp {Number(w.balance || 0).toLocaleString("id-ID")}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDelete(w)}
                    disabled={deletingId === w.id || wallets.length <= 1}
                    style={[
                      styles.deleteBtn,
                      {
                        backgroundColor: colors.expenseIconBg,
                        opacity: wallets.length <= 1 ? 0.35 : 1,
                      },
                    ]}
                  >
                    {deletingId === w.id ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.expenseText}
                      />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.expenseText}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
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
    maxHeight: "88%",
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
  formScroll: {
    maxHeight: 520,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  addBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  addBoxTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 5,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  listTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  walletList: {
    gap: 8,
  },
  walletItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  walletItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  walletIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  walletItemName: {
    fontSize: 13,
    fontWeight: "700",
  },
  walletItemBalance: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 1,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
