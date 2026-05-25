/**
 * StreakCard — compact horizontal streak bar
 *
 * Shows three streak stats in a single slim row:
 *   [Flame label]  [Pen Xd Logging]  [Ban Xd No Spend]  [Target Xd Budget]
 */

import { View, Text, StyleSheet } from 'react-native';
import { Flame, PenLine, Ban, Target } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { toPHDate, getPHNow } from '../../lib/timezone';

// ── Streak calculators ────────────────────────────────────────────────────────

function getLoggingStreak(transactions) {
  if (!transactions || transactions.length === 0) return 0;
  const today = getPHNow();
  today.setHours(0, 0, 0, 0);
  const daySet = new Set(
    transactions.map((t) => {
      const d = toPHDate(t.created_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  const cursor = new Date(today);
  if (!daySet.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getNoSpendStreak(transactions) {
  if (!transactions) return 0;
  const today = getPHNow();
  today.setHours(0, 0, 0, 0);
  const spendDays = new Set(
    transactions
      .filter((t) => t.type === 'expense')
      .map((t) => {
        const d = toPHDate(t.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
  );
  let streak = 0;
  const cursor = new Date(today);
  while (!spendDays.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 365) break;
  }
  return streak;
}

function getBudgetStreak(transactions, budgets) {
  if (!transactions || !budgets || budgets.length === 0) return 0;
  const today = getPHNow();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const cursor = new Date(today);
  for (let i = 0; i < 30; i++) {
    const dayEnd    = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const exceeded = budgets.some((budget) => {
      const spent = transactions
        .filter((t) => {
          const d = toPHDate(t.created_at);
          return t.type === 'expense' && t.category === budget.category && d >= monthStart && d <= dayEnd;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return spent > Number(budget.monthly_limit);
    });
    if (exceeded) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StreakCard({ transactions, budgets }) {
  const { colors } = useTheme();

  const loggingStreak = getLoggingStreak(transactions);
  const noSpendStreak = getNoSpendStreak(transactions);
  const budgetStreak  = getBudgetStreak(transactions, budgets);

  const streaks = [
    { Icon: PenLine, label: 'Logging',  value: loggingStreak, color: colors.info,    bg: colors.infoLight },
    { Icon: Ban,     label: 'No Spend', value: noSpendStreak, color: colors.success, bg: colors.successLight },
    { Icon: Target,  label: 'Budget',   value: budgetStreak,  color: colors.goal,    bg: colors.goalLight },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Left: flame label */}
      <View style={[styles.labelWrap, { borderRightColor: colors.border }]}>
        <Flame size={14} color={colors.warning} strokeWidth={2.5} />
        <Text style={[styles.labelText, { color: colors.textMuted }]}>Habits</Text>
      </View>

      {/* Right: three streak chips */}
      <View style={styles.chips}>
        {streaks.map((s) => (
          <View key={s.label} style={[styles.chip, { backgroundColor: s.bg }]}>
            <s.Icon size={12} color={s.color} strokeWidth={2.5} />
            <Text style={[styles.chipNum, { color: s.color }]}>{s.value}<Text style={styles.chipD}>d</Text></Text>
            <Text style={[styles.chipLabel, { color: s.color }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  labelWrap: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: 'transparent', // set dynamically via colors.border inline
  },
  labelText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  chips: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  chipNum: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  chipD: {
    fontSize: 10,
    fontWeight: '600',
  },
  chipLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
