import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Pencil } from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

export default function BudgetSection({ budgets, transactions, onCreateBudget, onEditBudget, onDeleteBudget }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Budget Limits</Text>
          <Text style={styles.subtitle}>Monthly category spending limits</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onCreateBudget}>
          <Plus size={14} color={colors.primary} />
          <Text style={styles.addBtnText}>Budget</Text>
        </TouchableOpacity>
      </View>

      {budgets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>No budgets yet</Text>
          <Text style={styles.emptyText}>Create monthly spending limits.</Text>
        </View>
      ) : (
        budgets.map((budget) => {
          const spent = transactions
            .filter((i) => i.type === 'expense' && i.category === budget.category)
            .reduce((t, i) => t + Number(i.amount), 0);
          const limit = Number(budget.monthly_limit);
          const pct = limit ? Math.min((spent / limit) * 100, 100) : 0;
          const exceeded = spent > limit;
          const catColor = categoryConfig[budget.category]?.color || '#6b7280';
          const catIcon = categoryConfig[budget.category]?.icon || '✨';

          return (
            <View key={budget.id} style={styles.budgetCard}>
              <View style={styles.budgetTop}>
                <View style={styles.budgetLeft}>
                  <View style={[styles.catIcon, { backgroundColor: catColor }]}>
                    <Text style={styles.catIconText}>{catIcon}</Text>
                  </View>
                  <View>
                    <Text style={styles.budgetName}>{budget.title || budget.category}</Text>
                    <Text style={styles.budgetAmount}>₱{spent.toFixed(2)} / ₱{limit.toFixed(2)}</Text>
                  </View>
                </View>
                <View style={styles.budgetRight}>
                  {exceeded && <Text style={styles.exceededBadge}>Exceeded</Text>}
                  <TouchableOpacity style={styles.editBtn} onPress={() => onEditBudget(budget)}>
                    <Pencil size={13} color={colors.primary} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: exceeded ? colors.expense : colors.primary }]} />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },
  budgetCard: { marginBottom: spacing.md },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catIconText: { fontSize: 18 },
  budgetName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  budgetAmount: { fontSize: 12, color: colors.textSecondary },
  budgetRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  exceededBadge: { fontSize: 10, fontWeight: '700', color: colors.expense, backgroundColor: colors.expenseLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  progressBar: { height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
});
