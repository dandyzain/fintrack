import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ReceiptBoundingOverlay } from "../../components/ReceiptBoundingOverlay";
import { useTheme } from "../../context/ThemeContext";
import {
  scanReceiptApi,
  createTransactionApi,
  fetchWalletsApi,
  fetchCategoriesApi,
  type UploadReceiptResponse,
} from "../../services/api";
import type { ReceiptItem } from "@fintrack/shared";

export default function ReceiptScanScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [flash, setFlash] = useState<"off" | "on">("off");
  const cameraRef = useRef<CameraView>(null);

  // Review State
  const [scanResult, setScanResult] = useState<UploadReceiptResponse | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewMerchant, setReviewMerchant] = useState("");
  const [reviewAmount, setReviewAmount] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [reviewItems, setReviewItems] = useState<ReceiptItem[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load wallets and categories for review picker
  const loadOptions = async (suggestedCatName?: string) => {
    try {
      const [walletList, catList] = await Promise.all([
        fetchWalletsApi(),
        fetchCategoriesApi(),
      ]);
      setWallets(walletList);
      setCategories(catList);

      if (walletList.length > 0) {
        setSelectedWalletId(walletList[0].id);
      }

      if (suggestedCatName) {
        const found = catList.find((c: any) => c.name === suggestedCatName);
        if (found) setSelectedCategoryId(found.id);
        else if (catList.length > 0) setSelectedCategoryId(catList[0].id);
      }
    } catch (err) {
      console.warn("Gagal memuat opsi dompet/kategori:", err);
    }
  };

  const handleCaptureAndProcess = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error("Gagal mengambil gambar dari kamera.");
      }

      // Kompresi gambar via expo-image-manipulator
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Unggah ke Vision AI
      const result = await scanReceiptApi(
        manipulated.uri,
        "receipt.jpg",
        "image/jpeg"
      );

      setScanResult(result);
      setReviewMerchant(result.extractedData.merchantName || "");
      setReviewAmount(String(result.extractedData.totalAmount || 0));
      setReviewDate(
        result.extractedData.date || new Date().toISOString().split("T")[0]
      );
      setReviewItems(result.extractedData.items || []);

      await loadOptions(result.extractedData.suggestedCategory);
      setIsReviewOpen(true);
    } catch (error) {
      Alert.alert(
        "Pemindaian Gagal",
        (error as Error).message || "Terjadi kesalahan saat memproses struk."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!selectedWalletId) {
      Alert.alert("Perhatian", "Pilih dompet sumber pembayaran.");
      return;
    }
    const numAmount = parseFloat(reviewAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Perhatian", "Nominal transaksi harus bernilai positif.");
      return;
    }

    try {
      setIsSaving(true);

      let safeIsoDate = new Date().toISOString();
      if (reviewDate) {
        const dmy = String(reviewDate).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) {
          const [_, d, m, y] = dmy;
          const dt = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
          if (!isNaN(dt.getTime())) safeIsoDate = dt.toISOString();
        } else {
          const dt = new Date(reviewDate);
          if (!isNaN(dt.getTime())) safeIsoDate = dt.toISOString();
        }
      }

      await createTransactionApi({
        walletId: selectedWalletId,
        categoryId: selectedCategoryId && selectedCategoryId.trim() !== "" ? selectedCategoryId.trim() : null,
        amount: numAmount,
        type: "EXPENSE",
        date: safeIsoDate,
        merchantName: reviewMerchant ? reviewMerchant.trim() : null,
        notes: `Pindai Struk Mobile: ${reviewMerchant || "Belanja"}`,
        receiptImageUrl: scanResult?.receiptImageUrl ? String(scanResult.receiptImageUrl).trim() : null,
        rawOcrData: (scanResult?.extractedData as any) || null,
        items: reviewItems.map((item) => ({
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity) || 1,
        })),
      });

      Alert.alert("Berhasil", "Transaksi struk berhasil disimpan dan saldo dompet telah diperbarui!");
      setIsReviewOpen(false);
      setScanResult(null);
      router.push("/(tabs)");
    } catch (err) {
      Alert.alert("Gagal Menyimpan", (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Memeriksa izin kamera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.permissionIconBox, { backgroundColor: colors.brandBg }]}>
          <Ionicons name="camera" size={32} color={colors.brand} />
        </View>
        <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
          Akses Kamera Diperlukan
        </Text>
        <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
          FinTrack memerlukan akses kamera untuk memindai struk belanja fisik Anda dengan OCR Vision AI pastel.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.brand }]}
          onPress={requestPermission}
        >
          <Text style={styles.primaryButtonText}>Berikan Izin Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flash === "on"}
      >
        <ReceiptBoundingOverlay />

        {/* Top Floating Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topCenterBadge}>
            <Ionicons name="sparkles" size={12} color="#FBBF24" />
            <Text style={styles.topCenterBadgeText}>AI Vision Scanner</Text>
          </View>

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => setFlash((prev) => (prev === "off" ? "on" : "off"))}
          >
            <Ionicons
              name={flash === "on" ? "flash" : "flash-off"}
              size={15}
              color="#FFFFFF"
            />
            <Text style={styles.pillButtonText}>
              {flash === "on" ? "ON" : "OFF"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Shutter Controls */}
        <View style={styles.bottomBar}>
          <Text style={styles.guideTipText}>
            Arahkan kamera ke struk belanja dan pastikan pencahayaan cukup
          </Text>

          <TouchableOpacity
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
            disabled={isProcessing}
            onPress={handleCaptureAndProcess}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={[styles.captureInner, { backgroundColor: colors.brand }]} />
            )}
          </TouchableOpacity>

          {isProcessing && (
            <View style={styles.processingBadge}>
              <Ionicons name="sparkles" size={13} color="#FFFFFF" />
              <Text style={styles.processingText}>
                Mengekstrak data struk dengan Vision AI...
              </Text>
            </View>
          )}
        </View>
      </CameraView>

      {/* Review Modal */}
      <Modal
        visible={isReviewOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsReviewOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.borderSubtle },
              ]}
            >
              <View style={styles.modalTitleRow}>
                <View
                  style={[
                    styles.modalIconBox,
                    { backgroundColor: colors.brandBg },
                  ]}
                >
                  <Ionicons name="receipt" size={18} color={colors.brand} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Tinjau Hasil Ekstraksi Struk
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsReviewOpen(false)}>
                <Text style={[styles.closeText, { color: colors.expenseText }]}>
                  Batal
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {scanResult?.receiptImageUrl && (
                <Image
                  source={{ uri: scanResult.receiptImageUrl }}
                  style={[styles.receiptPreview, { borderColor: colors.border }]}
                  resizeMode="cover"
                />
              )}

              {/* Merchant */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Nama Toko / Merchant
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
                value={reviewMerchant}
                onChangeText={setReviewMerchant}
                placeholder="Nama Merchant"
                placeholderTextColor={colors.textMuted}
              />

              {/* Amount */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Total Pengeluaran (Rp) *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.boldInput,
                  {
                    backgroundColor: colors.expenseBg,
                    borderColor: colors.expenseBorder,
                    color: colors.expenseText,
                  },
                ]}
                value={reviewAmount}
                onChangeText={setReviewAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />

              {/* Date */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Tanggal Transaksi (YYYY-MM-DD)
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
                value={reviewDate}
                onChangeText={setReviewDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />

              {/* Wallets */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Pilih Dompet Sumber Dana *
              </Text>
              <View style={styles.chipContainer}>
                {wallets.map((w) => {
                  const isSelected = selectedWalletId === w.id;
                  return (
                    <TouchableOpacity
                      key={w.id}
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
                      onPress={() => setSelectedWalletId(w.id)}
                    >
                      <Ionicons
                        name="wallet-outline"
                        size={13}
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

              {/* Categories */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Kategori Pengeluaran
              </Text>
              <View style={styles.chipContainer}>
                {categories.map((c) => {
                  const isSelected = selectedCategoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
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
                      onPress={() => setSelectedCategoryId(c.id)}
                    >
                      <View
                        style={[
                          styles.catDot,
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

              {/* Items */}
              {reviewItems.length > 0 && (
                <>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: colors.textSecondary, marginTop: 14 },
                    ]}
                  >
                    Rincian Item Terdeteksi ({reviewItems.length})
                  </Text>
                  {reviewItems.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.itemRow,
                        {
                          backgroundColor: colors.surfaceHighlight,
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.itemName, { color: colors.textPrimary }]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.itemPrice, { color: colors.brand }]}
                      >
                        {item.quantity}x @ Rp{" "}
                        {item.price.toLocaleString("id-ID")}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                { borderTopColor: colors.borderSubtle },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.incomeText },
                ]}
                disabled={isSaving}
                onPress={handleConfirmSave}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.saveButtonText}>
                      Konfirmasi & Simpan Transaksi
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  permissionDesc: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  primaryButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  topBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  topCenterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topCenterBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  pillButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  bottomBar: {
    position: "absolute",
    bottom: 34,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  guideTipText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontWeight: "500",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 16,
    textAlign: "center",
    maxWidth: "85%",
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  processingText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: "88%",
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  closeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalScroll: {
    maxHeight: 460,
  },
  receiptPreview: {
    width: "100%",
    height: 120,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  boldInput: {
    fontSize: 18,
    fontWeight: "900",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: "800",
  },
  modalFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
