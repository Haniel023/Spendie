import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow } from '../../lib/theme';
import { toPHDate, getPHNow } from '../../lib/timezone';

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

  // If no transaction today, still count back from yesterday
  if (!daySet.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
  }

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

  // Build a set of days that had expense transactions
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
    // Don't go back more than 365 days
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

  // Look back day by day
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);

    // Running total: expenses from start of month up to this day
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);

    const exceeded = budgets.some((budget) => {
      const spent = transactions
        .filter((t) => {
          const d = toPHDate(t.created_at);
          return (
            t.type === 'expense' &&
            t.category === budget.category &&
            d >= monthStart &&
            d <= dayEnd
          );
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

export default function StreakCard({ transactions, budgets }) {
  const loggingStreak = getLoggingStreak(transactions);
  const noSpendStreak = getNoSpendStreak(transactions);
  const budgetStreak = getBudgetStreak(transactions, budgets);

  const streaks = [
    {
      icon: '📝',
      label: 'Logging Streak',
      value: loggingStreak,
      unit: loggingStreak === 1 ? 'day' : 'days',
      color: colors.info,
      bg: colors.infoLight,
      tip: 'Days you tracked transactions',
    },
    {
      icon: '🚫',
      label: 'No Spend Days',
      value: noSpendStreak,
      unit: noSpendStreak === 1 ? 'day' : 'days',
      color: colors.success,
      bg: colors.successLight,
      tip: 'Consecutive days with no expenses',
    },
    {
      icon: '🎯',
      label: 'Budget Streak',
      value: budgetStreak,
      unit: budgetStreak === 1 ? 'day' : 'days',
      color: colors.goal,
      bg: colors.goalLight,
      tip: 'Days within your budget this month',
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🔥 Streaks</Text>
        <Text style={styles.subtitle}>Keep your momentum going</Text>
      </View>

      <View style={styles.streakRow}>
        {streaks.map((s) => (
          <View key={s.label} style={[styles.streakItem, { backgroundColor: s.bg }]}>
            <Text style={styles.streakIcon}>{s.icon}</Text>
            <Text style={[styles.streakValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.streakUnit, { color: s.color }]}>{s.unit}</Text>
            <Text style={styles.streakLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

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
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  streakRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  streakItem: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  streakIcon: { fontSize: 20, marginBottom: 2 },
  streakValue: { fontSize: 22, fontWeight: '800' },
  streakUnit: { fontSize: 11, fontWeight: '600', marginTop: -2 },
  streakLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
});
