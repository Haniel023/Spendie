/**
 * Expense Frequency Analytics
 *
 * Shows:
 *  • Day-of-week spending heatmap  (which days you spend the most)
 *  • Time-of-day pattern           (morning / afternoon / evening / night)
 *  • Top "habit" categories        (items spent most frequently, not just most $)
 */

import { View, Text, StyleSheet } from 'react-native';
import { toPHDate, getPHNow } from '../../lib/timezone';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

// ── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getTimeSlot(hour) {
  if (hour >= 5  && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

const TIME_EMOJI = { Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙' };

// ── Component ────────────────────────────────────────────────────────────────

export default function ExpenseFrequency({ transactions }) {
  const phNow = getPHNow();
  const currentMonth = phNow.getMonth();
  const currentYear  = phNow.getFullYear();

  // Only consider the last 90 days of expenses for meaningful patterns
  const cutoff = new Date(phNow); cutoff.setDate(cutoff.getDate() - 90);
  const expenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const d = toPHDate(t.created_at);
    return d >= cutoff;
  });

  if (expenses.length < 3) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>📊 Spending Patterns</Text>
        <Text style={styles.subtitle}>Needs at least 3 recent expenses</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>Log more transactions to reveal your spending patterns.</Text>
        </View>
      </View>
    );
  }

  // ── Day-of-week totals ───────────────────────────────────────────────────
  const dayCount  = Array(7).fill(0); // count
  const dayAmount = Array(7).fill(0); // total amount
  expenses.forEach((t) => {
    const dow = toPHDate(t.created_at).getDay();
    dayCount[dow]++;
    dayAmount[dow] += Number(t.amount);
  });
  const maxAmount = Math.max(...dayAmount, 1);

  // ── Time-of-day slot ─────────────────────────────────────────────────────
  const slotCount = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
  expenses.forEach((t) => {
    const hour = toPHDate(t.created_at).getHours();
    slotCount[getTimeSlot(hour)]++;
  });
  const topSlot = Object.entries(slotCount).sort((a, b) => b[1] - a[1])[0];

  // ── Category frequency (not $amount, but transaction count) ──────────────
  const catFreq = {};
  expenses.forEach((t) => {
    catFreq[t.category] = (catFreq[t.category] || 0) + 1;
  });
  const topFreqCats = Object.entries(catFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // ── Busiest day label ────────────────────────────────────────────────────
  const busiestDayIdx = dayAmount.indexOf(Math.max(...dayAmount));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Spending Patterns</Text>
        <Text style={styles.subtitle}>Based on your last 90 days</Text>
      </View>

      {/* Day-of-week heatmap */}
      <Text style={styles.sectionLabel}>When you spend most (by day)</Text>
      <View style={styles.heatmapRow}>
        {DAY_LABELS.map((label, i) => {
          const barHeight = Math.max(8, (dayAmount[i] / maxAmount) * 64);
          const isBusiest = i === busiestDayIdx;
          return (
            <View key={label} style={styles.dayCol}>
              <Text style={styles.dayAmount}>
                {dayAmount[i] > 0 ? `₱${(dayAmount[i] / 1000).toFixed(1)}k` : ''}
              </Text>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { height: barHeight },
                    isBusiest && styles.barBusiest,
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, isBusiest && styles.dayLabelBusiest]}>
                {label}
              </Text>
              {isBusiest && <Text style={styles.hotDot}>🔥</Text>}
            </View>
          );
        })}
      </View>

      {/* Time of day */}
      <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Time of day you spend</Text>
      <View style={styles.timeRow}>
        {Object.entries(slotCount).map(([slot, count]) => {
          const isTop = slot === topSlot[0];
          return (
            <View key={slot} style={[styles.timeChip, isTop && styles.timeChipActive]}>
              <Text style={styles.timeEmoji}>{TIME_EMOJI[slot]}</Text>
              <Text style={[styles.timeName, isTop && styles.timeNameActive]}>{slot}</Text>
              <Text style={[styles.timeCount, isTop && styles.timeCountActive]}>{count}×</Text>
            </View>
          );
        })}
      </View>

      {/* Category frequency */}
      <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Your most frequent categories</Text>
      {topFreqCats.map(([cat, count], idx) => {
        const maxCount = topFreqCats[0][1];
        const barW = (count / maxCount) * 100;
        return (
          <View key={cat} style={styles.freqRow}>
            <Text style={styles.freqRank}>#{idx + 1}</Text>
            <View style={styles.freqInfo}>
              <View style={styles.freqLabelRow}>
                <Text style={styles.freqCat}>{cat}</Text>
                <Text style={styles.freqCount}>{count} times</Text>
              </View>
              <View style={styles.freqBarBg}>
                <View style={[styles.freqBarFill, { width: `${barW}%` }]} />
              </View>
            </View>
          </View>
        );
      })}

      <View style={styles.insightBanner}>
        <Text style={styles.insightText}>
          💡 You're most active on <Text style={styles.bold}>{DAY_LABELS[busiestDayIdx]}s</Text> and tend to spend in the <Text style={styles.bold}>{topSlot[0]}</Text>. Plan your budget checks around these times!
        </Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  header: { marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small, marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyText: { ...typography.body, textAlign: 'center' },

  // Day heatmap
  heatmapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dayAmount: { fontSize: 8, color: colors.textMuted, marginBottom: 2, textAlign: 'center' },
  barBg: {
    width: 22,
    height: 64,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  barBusiest: { backgroundColor: colors.primary },
  dayLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  dayLabelBusiest: { color: colors.primary, fontWeight: '700' },
  hotDot: { fontSize: 10, marginTop: 1 },

  // Time-of-day chips
  timeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  timeChip: {
    flex: 1,
    minWidth: 72,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 2,
  },
  timeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  timeEmoji: { fontSize: 18 },
  timeName: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  timeNameActive: { color: colors.primary },
  timeCount: { fontSize: 10, color: colors.textMuted },
  timeCountActive: { color: colors.primary, fontWeight: '700' },

  // Category frequency bars
  freqRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  freqRank: { fontSize: 12, fontWeight: '700', color: colors.textMuted, width: 22, textAlign: 'center' },
  freqInfo: { flex: 1 },
  freqLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  freqCat: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  freqCount: { fontSize: 12, color: colors.textMuted },
  freqBarBg: { height: 5, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  freqBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },

  // Insight banner
  insightBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  insightText: { fontSize: 12, color: colors.primary, lineHeight: 18 },
  bold: { fontWeight: '700' },
});
