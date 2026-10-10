import React from "react";
import { StyleSheet, View, Text, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const FRAME_WIDTH = width * 0.82;
const FRAME_HEIGHT = FRAME_WIDTH * 1.5; // Aspect ratio optimized for long receipts

export function ReceiptBoundingOverlay() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Dark Translucent Mask */}
      <View style={styles.maskContainer}>
        {/* Top Mask */}
        <View style={styles.maskTop} />

        {/* Center Row */}
        <View style={styles.centerRow}>
          <View style={styles.maskSide} />

          {/* Viewfinder Target Window */}
          <View style={[styles.targetWindow, { width: FRAME_WIDTH, height: FRAME_HEIGHT }]}>
            {/* 4 Corner Markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Subtle Alignment Center Line */}
            <View style={styles.centerLine} />
          </View>

          <View style={styles.maskSide} />
        </View>

        {/* Bottom Mask with Instructions */}
        <View style={styles.maskBottom}>
          <Text style={styles.instructionTitle}>Posisikan Struk di Dalam Bingkai</Text>
          <Text style={styles.instructionSubtitle}>
            Pastikan nama toko, tanggal, rincian belanja, dan total terlihat jelas.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  maskContainer: {
    flex: 1,
  },
  maskTop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  centerRow: {
    flexDirection: "row",
  },
  maskSide: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  targetWindow: {
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 1,
    borderRadius: 16,
    position: "relative",
    overflow: "hidden",
  },
  maskBottom: {
    flex: 1.2,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#6366F1", // Indigo Accent
    borderWidth: 3.5,
  },
  topLeft: {
    top: -1,
    left: -1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 14,
  },
  topRight: {
    top: -1,
    right: -1,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 14,
  },
  bottomLeft: {
    bottom: -1,
    left: -1,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 14,
  },
  centerLine: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(99, 102, 241, 0.25)",
  },
  instructionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  instructionSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
});
