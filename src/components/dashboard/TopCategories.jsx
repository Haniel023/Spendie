import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

export default function TopCategories({ transactions }) {
  const categoryTotals = {};
  transactions
    .filter((i) => i.type === 'expense')
    .forEach((i) => {
      categoryTotals[i.category] = (categoryTotals[i.category] || 0) + Number(i.amount);
    });

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const highest = categories[0]?.[1] || 1;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Top Categories</Text>
      <Text style={styles.subtitle}>Where your money goes</Text>

      {categories.map(([category, amount]) => (
        <View key={category} style={styles.item}>
          <View style={styles.row}>
            <Text style={styles.category}>{category}</Text>
            <Text style={styles.amount}>₱{amount.toFixed(2)}</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${(amount / highest) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  title: { ...typography.h3, marginBottom: 2 },
  subtitle: { ...typography.small, marginBottom: spacing.md },
  item: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  category: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  amount: { fontSize: 13, color: colors.textSecondary },
  bar: { height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
});
