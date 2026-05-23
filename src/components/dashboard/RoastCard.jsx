/**
 * Roast Card — AI Spending Roast Mode 🎤
 *
 * Shows funny, non-toxic spending commentary when Roast Mode is enabled.
 * Includes share functionality and regeneration.
 */

import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, ScrollView,
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useSettings } from '../../lib/SettingsContext';
import { generateRoasts, formatShareableRoast } from '../../lib/roastEngine';

function RoastItem({ item, colors, onShare }) {
  return (
    <View style={[styles.roastItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.roastTop}>
        <Text style={styles.roastIcon}>{item.icon}</Text>
        <Text style={[styles.roastText, { color: colors.textPrimary }]}>{item.roast}</Text>
      </View>
      {item.nudge && (
        <View style={[styles.nudgeRow, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.nudgeIcon}>💡</Text>
          <Text style={[styles.nudgeText, { color: colors.primary }]}>{item.nudge}</Text>
        </View>
      )}
      {item.shareable && (
        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: colors.border }]}
          onPress={() => onShare(item)}
          activeOpacity={0.7}
        >
          <Text style={[styles.shareBtnText, { color: colors.textSecondary }]}>📤 Share this roast</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RoastCard({ monthTransactions, budgets, monthSummary }) {
  const { colors, spacing } = useTheme();
  const { roastEnabled } = useSettings();
  const [refreshKey, setRefreshKey] = useState(0);

  const roasts = useMemo(
    () => generateRoasts({ monthTransactions, budgets, monthSummary }),
    [monthTransactions, budgets, monthSummary, refreshKey]
  );

  if (!roastEnabled) return null;

  const handleShare = async (item) => {
    try {
      await Share.share({ message: formatShareableRoast(item) });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={[styles.wrapper, { marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>ROAST MODE 🎤</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Your Spending, Exposed</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setRefreshKey((k) => k + 1)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        All in good fun. These roasts are based on your spending patterns and meant to inspire — not shame. 💚
      </Text>

      {/* Roasts */}
      {roasts.map((item, i) => (
        <RoastItem key={i} item={item} colors={colors} onShare={handleShare} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '800' },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    fontSize: 11,
    marginBottom: 10,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  roastItem: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  roastTop: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  roastIcon: { fontSize: 24, marginTop: 2 },
  roastText: { fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  nudgeIcon: { fontSize: 14 },
  nudgeText: { fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 18 },
  shareBtn: {
    borderTopWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 12, fontWeight: '600' },
});
