import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

export default function AnalyticsSummary({ transactions }) {
  const expenses = transactions.filter((i) => i.type === 'expense');
  const totalExpenses = expenses.reduce((s, i) => s + Number(i.amount), 0);
  const averageSpend = expenses.length > 0 ? totalExpenses / expenses.length : 0;

  const categoryMap = {};
  expenses.forEach((i) => {
    categoryMap[i.category] = (categoryMap[i.category] || 0) + Number(i.amount);
  });
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];

  const widgets = [
    { icon: '💸', label: 'Total Expenses', value: `₱${totalExpenses.toFixed(2)}` },
    { icon: '📊', label: 'Average Spend', value: `₱${averageSpend.toFixed(2)}` },
    { icon: '🔥', label: 'Top Category', value: topCategory ? topCategory[0] : 'None' },
  ];

  return (
    <View style={styles.grid}>
      {widgets.map((w) => (
        <View key={w.label} style={styles.widget}>
          <Text style={styles.icon}>{w.icon}</Text>
          <Text style={styles.label}>{w.label}</Text>
          <Text style={styles.value}>{w.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  widget: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4 },
  icon: { fontSize: 22 },
  label: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  value: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
});
