import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw, Plus } from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

function getNextRenewalLabel(nextRun, frequency) {
  if (!nextRun) return 'Unknown';
  const next = new Date(nextRun);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);

  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return `In ${diff} days`;
  if (diff <= 14) return `In ${diff} days`;
  return next.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function getUrgencyColor(nextRun) {
  if (!nextRun) return colors.textMuted;
  const next = new Date(nextRun);
  const today = new Date();
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return colors.expense;
  if (diff <= 3) return colors.warning;
  if (diff <= 7) return colors.info;
  return colors.success;
}

export default function SubscriptionSection({ recurringTransactions = [], onAdd }) {
  // Filter to subscriptions (is_subscription flag or category = Subscriptions)
  const subscriptions = recurringTransactions.filter(
    (r) => r.is_subscription || r.category === 'Subscriptions'
  );

  const monthlyTotal = subscriptions.reduce((sum, s) => {
    const amt = Number(s.amount);
    if (s.frequency === 'daily') return sum + amt * 30;
    if (s.frequency === 'weekly') return sum + amt * 4;
    if (s.frequency === 'monthly' || s.frequency === 'semi_monthly') return sum + amt;
    return sum + amt;
  }, 0);

  // Sort by next_run (soonest first)
  const sorted = [...subscriptions].sort((a, b) => {
    if (!a.next_run) return 1;
    if (!b.next_run) return -1;
    return new Date(a.next_run) - new Date(b.next_run);
  });

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <RefreshCw size={16} color={colors.primary} />
          <Text style={styles.title}>Subscriptions</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Plus size={14} color={colors.primary} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly total banner */}
      {subscriptions.length > 0 && (
        <View style={styles.totalBanner}>
          <View>
            <Text style={styles.totalLabel}>Monthly Subscription Cost</Text>
            <Text style={styles.totalAmount}>₱{monthlyTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRight}>
            <Text style={styles.totalCount}>{subscriptions.length}</Text>
            <Text style={styles.totalCountLabel}>active</Text>
          </View>
        </View>
      )}

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No subscriptions yet</Text>
          <Text style={styles.emptyText}>
            Add recurring transactions and mark them as subscriptions, or use the quick presets.
          </Text>
        </View>
      ) : (
        sorted.map((sub) => {
          const catIcon = categoryConfig[sub.category]?.icon || '📦';
          const catColor = categoryConfig[sub.category]?.color || colors.primary;
          const renewalLabel = getNextRenewalLabel(sub.next_run, sub.frequency);
          const urgencyColor = getUrgencyColor(sub.next_run);

          return (
            <View key={sub.id} style={styles.subItem}>
              <View style={[styles.subIcon, { backgroundColor: catColor + '22' }]}>
                <Text style={styles.subIconText}>{sub.emoji || catIcon}</Text>
              </View>
              <View style={styles.subInfo}>
                <Text style={styles.subName}>{sub.description || sub.category}</Text>
                <Text style={styles.subFreq}>
                  {sub.frequency?.replace('_', '-')} · {sub.category}
                </Text>
              </View>
              <View style={styles.subRight}>
                <Text style={styles.subAmount}>₱{Number(sub.amount).toFixed(2)}</Text>
                <View style={[styles.renewBadge, { backgroundColor: urgencyColor + '22' }]}>
                  <Text style={[styles.renewText, { color: urgencyColor }]}>{renewalLabel}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.h3 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
  },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  totalLabel: { fontSize: 11, color: colors.primary, fontWeight: '600', marginBottom: 2 },
  totalAmount: { fontSize: 22, fontWeight: '800', color: colors.primary },
  totalRight: { alignItems: 'center' },
  totalCount: { fontSize: 24, fontWeight: '800', color: colors.primary },
  totalCountLabel: { fontSize: 11, color: colors.primary },

  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },

  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  subIconText: { fontSize: 19 },
  subInfo: { flex: 1 },
  subName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  subFreq: { fontSize: 11, color: colors.textMuted, marginTop: 1, textTransform: 'capitalize' },
  subRight: { alignItems: 'flex-end', gap: 4 },
  subAmount: { fontSize: 14, fontWeight: '700', color: colors.expense },
  renewBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  renewText: { fontSize: 11, fontWeight: '600' },
});
