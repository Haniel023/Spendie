import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

export default function OverviewStats({ summary, goals, budgets, alerts }) {
  const completedGoals = goals.filter((g) => Number(g.current_amount) >= Number(g.target_amount)).length;
  const criticalBudgets = alerts.filter((a) => a.type === 'danger').length;

  const widgets = [
    { icon: '💰', label: 'Total Balance', value: `₱${(summary.balance ?? 0).toFixed(2)}` },
    { icon: '🎯', label: 'Goals Completed', value: String(completedGoals) },
    { icon: '⚠️', label: 'Critical Alerts', value: String(criticalBudgets) },
    { icon: '📊', label: 'Budgets Active', value: String(budgets.length) },
  ];

  return (
    <View style={styles.grid}>
      {widgets.map((w) => (
        <View key={w.label} style={styles.widget}>
          <Text style={styles.icon}>{w.icon}</Text>
          <View>
            <Text style={styles.label}>{w.label}</Text>
            <Text style={styles.value}>{w.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  widget: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow.card,
  },
  icon: { fontSize: 24 },
  label: { fontSize: 11, color: colors.textSecondary },
  value: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
});
