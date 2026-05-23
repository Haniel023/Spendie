/**
 * Balance Card — Premium redesign with Focus Mode support
 *
 * Changes vs original:
 *   - Focus Mode: blurs balance and stats for privacy
 *   - Focus Mode toggle button (eye icon)
 *   - Subtle animated balance reveal on load
 *   - More premium gradient card design
 */

import { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react-native';
import MonthNavigator from '../common/MonthNavigator';
import { useTheme } from '../../lib/ThemeContext';
import { useSettings } from '../../lib/SettingsContext';

// ── Blur/Focus amount display ────────────────────────────────────────────────

function FocusAmount({ value, focused, style }) {
  if (focused) {
    return <Text style={[style, styles.blurredText]}>••••••</Text>;
  }
  return <Text style={style}>{value}</Text>;
}

export default function BalanceCard({ summary, monthSummary, selectedMonth, selectedYear, onMonthChange }) {
  const { colors, radius, spacing } = useTheme();
  const { focusMode, updateSetting } = useSettings();

  // Animate balance number in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const balance = summary.balance ?? 0;
  const balanceFormatted = `₱${balance.toFixed(2)}`;
  const monthIncome = monthSummary?.income ?? 0;
  const monthExpenses = monthSummary?.expenses ?? 0;
  const monthSaved = monthIncome - monthExpenses;
  const isNegative = balance < 0;

  return (
    <LinearGradient
      colors={[colors.gradientStart ?? colors.primary, colors.gradientEnd ?? colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        { margin: spacing.lg, borderRadius: radius.xl, padding: spacing.xl },
      ]}
    >
      {/* Month Navigator */}
      <MonthNavigator month={selectedMonth} year={selectedYear} onChange={onMonthChange} />

      {/* Balance Row */}
      <View style={styles.top}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.label}>Running Balance</Text>
          <FocusAmount
            value={balanceFormatted}
            focused={focusMode}
            style={[
              styles.balance,
              isNegative && { color: '#fca5a5' },
            ]}
          />
          {isNegative && !focusMode && (
            <Text style={styles.negativeHint}>⚠️ Expenses exceed income</Text>
          )}
        </Animated.View>

        <View style={styles.topRight}>
          {/* Focus Mode toggle */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            onPress={() => updateSetting('focusMode', !focusMode)}
            activeOpacity={0.8}
            accessibilityLabel={focusMode ? 'Show balance' : 'Hide balance'}
          >
            {focusMode
              ? <EyeOff size={18} color="rgba(255,255,255,0.9)" />
              : <Eye size={18} color="rgba(255,255,255,0.9)" />
            }
          </TouchableOpacity>

          {/* Wallet icon */}
          <View style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Wallet size={20} color={colors.white} />
          </View>
        </View>
      </View>

      {/* Focus mode label */}
      {focusMode && (
        <View style={styles.focusBanner}>
          <Text style={styles.focusBannerText}>🌫️ Focus Mode — balances hidden</Text>
        </View>
      )}

      {/* Monthly Stats Row */}
      <View style={[styles.stats, { backgroundColor: 'rgba(255,255,255,0.13)' }]}>
        {/* Income */}
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(34,197,94,0.25)' }]}>
            <TrendingUp size={13} color="#4ade80" />
          </View>
          <Text style={styles.statLabel}>Income</Text>
          <FocusAmount
            value={`₱${monthIncome.toFixed(2)}`}
            focused={focusMode}
            style={styles.statValue}
          />
        </View>

        <View style={styles.divider} />

        {/* Expenses */}
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(239,68,68,0.22)' }]}>
            <TrendingDown size={13} color="#f87171" />
          </View>
          <Text style={styles.statLabel}>Expenses</Text>
          <FocusAmount
            value={`₱${monthExpenses.toFixed(2)}`}
            focused={focusMode}
            style={styles.statValue}
          />
        </View>

        <View style={styles.divider} />

        {/* Saved */}
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Wallet size={13} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.statLabel}>Saved</Text>
          <FocusAmount
            value={`₱${monthSaved.toFixed(2)}`}
            focused={focusMode}
            style={[styles.statValue, { color: monthSaved >= 0 ? '#ffffff' : '#fca5a5' }]}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginBottom: 4, fontWeight: '500' },
  balance: { fontSize: 34, fontWeight: '900', color: '#ffffff', letterSpacing: -1 },
  negativeHint: { fontSize: 11, color: '#fca5a5', marginTop: 3, fontWeight: '600' },
  blurredText: { color: 'rgba(255,255,255,0.5)', letterSpacing: 4, fontSize: 28, fontWeight: '700' },

  topRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  focusBanner: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  focusBannerText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },

  stats: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  statValue: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },
});
