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
import { useTheme } from '../../lib/ThemeContext';

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
  const { colors, shadow } = useTheme();

  const phNow = getPHNow();

  // Only consider the last 90 days of expenses for meaningful patterns
  const cutoff = new Date(phNow); cutoff.setDate(cutoff.getDate() - 90);
  const expenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const d = toPHDate(t.created_at);
    return d >= cutoff;
  });

  if (expenses.length < 3) {
    return (
      <View style={[s.card, { backgroundColor: colors.card }, shadow.card]}>
        <Text style={[s.title, { color: colors.textPrimary }]}>📊 Spending Patterns</Text>
        <Text style={[s.subtitle, { color: colors.textMuted }]}>Needs at least 3 recent expenses</Text>
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🔍</Text>
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>Log more transactions to reveal your spending patterns.</Text>
        </View>
      </View>
    );
  }

  // ── Day-of-week totals ───────────────────────────────────────────────────
  const dayCount  = Array(7).fill(0);
  const dayAmount = Array(7).fill(0);
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

  // ── Category frequency ────────────────────────────────────────────────────
  const catFreq = {};
  expenses.forEach((t) => {
    catFreq[t.category] = (catFreq[t.category] || 0) + 1;
  });
  const topFreqCats = Object.entries(catFreq).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // ── Busiest day ──────────────────────────────────────────────────────────
  const busiestDayIdx = dayAmount.indexOf(Math.max(...dayAmount));

  return (
    <View style={[s.card, { backgroundColor: colors.card }, shadow.card]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>📊 Spending Patterns</Text>
        <Text style={[s.subtitle, { color: colors.textMuted }]}>Based on your last 90 days</Text>
      </View>

      {/* ── Day-of-week heatmap ─────────────────────────────────────────── */}
      <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>When you spend most (by day)</Text>
      <View style={s.heatmapRow}>
        {DAY_LABELS.map((label, i) => {
          const barHeight = Math.max(8, (dayAmount[i] / maxAmount) * 64);
          const isBusiest = i === busiestDayIdx;
          return (
            <View key={label} style={s.dayCol}>
              <Text style={[s.dayAmount, { color: colors.textMuted }]}>
                {dayAmount[i] > 0 ? `₱${(dayAmount[i] / 1000).toFixed(1)}k` : ''}
              </Text>
              <View style={[s.barBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    s.barFill,
                    { height: barHeight, backgroundColor: isBusiest ? colors.primary : colors.primaryLight, borderColor: colors.primary },
                  ]}
                />
              </View>
              <Text style={[s.dayLabel, { color: isBusiest ? colors.primary : colors.textMuted }, isBusiest && s.dayLabelBold]}>
                {label}
              </Text>
              {isBusiest && <Text style={s.hotDot}>🔥</Text>}
            </View>
          );
        })}
      </View>

      {/* ── Time of day ─────────────────────────────────────────────────── */}
      <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>Time of day you spend</Text>
      <View style={s.timeRow}>
        {Object.entries(slotCount).map(([slot, count]) => {
          const isTop = slot === topSlot[0];
          return (
            <View
              key={slot}
              style={[
                s.timeChip,
                { borderColor: isTop ? colors.primary : colors.border, backgroundColor: isTop ? colors.primaryLight : colors.background },
              ]}
            >
              <Text style={s.timeEmoji}>{TIME_EMOJI[slot]}</Text>
              <Text style={[s.timeName, { color: isTop ? colors.primary : colors.textSecondary }]}>{slot}</Text>
              <Text style={[s.timeCount, { color: isTop ? colors.primary : colors.textMuted, fontWeight: isTop ? '700' : '400' }]}>{count}×</Text>
            </View>
          );
        })}
      </View>

      {/* ── Category frequency ──────────────────────────────────────────── */}
      <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>Your most frequent categories</Text>
      {topFreqCats.map(([cat, count], idx) => {
        const maxCount = topFreqCats[0][1];
        return (
          <View key={cat} style={s.freqRow}>
            <Text style={[s.freqRank, { color: colors.textMuted }]}>#{idx + 1}</Text>
            <View style={s.freqInfo}>
              <View style={s.freqLabelRow}>
                <Text style={[s.freqCat, { color: colors.textPrimary }]}>{cat}</Text>
                <Text style={[s.freqCount, { color: colors.textMuted }]}>{count} times</Text>
              </View>
              <View style={[s.freqBarBg, { backgroundColor: colors.border }]}>
                <View style={[s.freqBarFill, { width: `${(count / maxCount) * 100}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
          </View>
        );
      })}

      {/* ── Insight banner ──────────────────────────────────────────────── */}
      <View style={[s.insightBanner, { backgroundColor: colors.primaryLight }]}>
        <Text style={[s.insightText, { color: colors.primary }]}>
          💡 You're most active on <Text style={s.bold}>{DAY_LABELS[busiestDayIdx]}s</Text> and tend to spend in the{' '}
          <Text style={s.bold}>{topSlot[0]}</Text>. Plan your budget checks around these times!
        </Text>
      </View>
    </View>
  );
}

// ── Styles (layout-only, no colours) ─────────────────────────────────────────

const s = StyleSheet.create({
  card:     { marginHorizontal: 20, marginBottom: 10, borderRadius: 16, padding: 16 },
  header:   { marginBottom: 12 },
  title:    { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  empty:    { alignItems: 'center', paddingVertical: 24 },
  emptyIcon:{ fontSize: 32, marginBottom: 8 },
  emptyText:{ fontSize: 12, textAlign: 'center' },

  // Day heatmap
  heatmapRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  dayCol:      { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  dayAmount:   { fontSize: 8, marginBottom: 2, textAlign: 'center' },
  barBg:       { width: 22, height: 64, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:     { width: '100%', borderRadius: 4, borderWidth: 1 },
  dayLabel:    { fontSize: 10, marginTop: 4 },
  dayLabelBold:{ fontWeight: '700' },
  hotDot:      { fontSize: 10, marginTop: 1 },

  // Time-of-day chips
  timeRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  timeChip:  { flex: 1, minWidth: 72, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1.5, gap: 2 },
  timeEmoji: { fontSize: 18 },
  timeName:  { fontSize: 10, fontWeight: '600' },
  timeCount: { fontSize: 10 },

  // Category frequency
  freqRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  freqRank:     { fontSize: 12, fontWeight: '700', width: 22, textAlign: 'center' },
  freqInfo:     { flex: 1 },
  freqLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  freqCat:      { fontSize: 13, fontWeight: '600' },
  freqCount:    { fontSize: 12 },
  freqBarBg:    { height: 5, borderRadius: 3, overflow: 'hidden' },
  freqBarFill:  { height: '100%', borderRadius: 3 },

  // Insight banner
  insightBanner: { marginTop: 12, borderRadius: 10, padding: 12 },
  insightText:   { fontSize: 12, lineHeight: 18 },
  bold:          { fontWeight: '700' },
});
