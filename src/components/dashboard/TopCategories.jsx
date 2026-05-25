import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';

export default function TopCategories({ transactions }) {
  const { colors } = useTheme();

  const categoryTotals = {};
  transactions
    .filter((i) => i.type === 'expense')
    .forEach((i) => {
      categoryTotals[i.category] = (categoryTotals[i.category] || 0) + Number(i.amount);
    });

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const highest = categories[0]?.[1] || 1;

  return (
    <View style={s.card}>
      <Text style={[s.title, { color: colors.textPrimary }]}>Top Categories</Text>
      <Text style={[s.subtitle, { color: colors.textMuted }]}>Where your money goes</Text>

      {categories.map(([category, amount]) => (
        <View key={category} style={s.item}>
          <View style={s.row}>
            <Text style={[s.category, { color: colors.textPrimary }]}>{category}</Text>
            <Text style={[s.amount, { color: colors.textSecondary }]}>₱{amount.toFixed(2)}</Text>
          </View>
          <View style={[s.bar, { backgroundColor: colors.border }]}>
            <View style={[s.fill, { width: `${(amount / highest) * 100}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card:     { marginBottom: 8 },
  title:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 11, marginBottom: 12 },
  item:     { marginBottom: 10 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  category: { fontSize: 13, fontWeight: '600' },
  amount:   { fontSize: 13 },
  bar:      { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:     { height: '100%', borderRadius: 3 },
});
