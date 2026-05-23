import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

export default function RecentActivity({ transactions }) {
  const recent = transactions.slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Activity</Text>
        <Text style={styles.subtitle}>Latest money movement</Text>
      </View>

      {recent.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💸</Text>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyText}>Your latest transactions will appear here.</Text>
        </View>
      ) : (
        recent.map((item) => (
          <View key={item.id} style={styles.item}>
            <View>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.desc}>{item.description || 'No description'}</Text>
            </View>
            <Text style={[styles.amount, item.type === 'income' ? styles.income : styles.expense]}>
              {item.type === 'income' ? '+' : '-'}₱{Number(item.amount).toFixed(2)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  header: { marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  category: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  desc: { fontSize: 12, color: colors.textSecondary },
  amount: { fontSize: 14, fontWeight: '700' },
  income: { color: colors.income },
  expense: { color: colors.expense },
});
