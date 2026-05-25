import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';

export default function AnalyticsSummary({ transactions }) {
  const { colors } = useTheme();

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
    { icon: '📊', label: 'Average Spend',  value: `₱${averageSpend.toFixed(2)}`  },
    { icon: '🔥', label: 'Top Category',   value: topCategory ? topCategory[0] : 'None' },
  ];

  return (
    <View style={s.grid}>
      {widgets.map((w) => (
        <View key={w.label} style={[s.widget, { backgroundColor: colors.background }]}>
          <Text style={s.icon}>{w.icon}</Text>
          <Text style={[s.label, { color: colors.textSecondary }]}>{w.label}</Text>
          <Text style={[s.value, { color: colors.textPrimary }]}>{w.value}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid:   { flexDirection: 'row', gap: 8, marginBottom: 8 },
  widget: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  icon:   { fontSize: 22 },
  label:  { fontSize: 10, textAlign: 'center' },
  value:  { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
