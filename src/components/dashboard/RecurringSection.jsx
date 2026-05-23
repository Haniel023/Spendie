import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw, Plus, Pencil } from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

const FREQ_LABELS = {
  daily:       'Daily',
  weekly:      'Weekly',
  monthly:     'Monthly',
  semi_monthly: 'Semi-monthly',
};

const WEEKDAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function ordinal(n) {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th';
  }
}

function freqDetail(r) {
  if (r.frequency === 'monthly' && r.recurring_day) {
    return `Every ${r.recurring_day}${ordinal(Number(r.recurring_day))}`;
  }
  if (r.frequency === 'weekly' && r.recurring_weekday != null) {
    return `Every ${WEEKDAY_NAMES[Number(r.recurring_weekday)]}`;
  }
  if (r.frequency === 'semi_monthly' && r.recurring_day_1 && r.recurring_day_2) {
    return `${r.recurring_day_1}${ordinal(Number(r.recurring_day_1))} & ${r.recurring_day_2}${ordinal(Number(r.recurring_day_2))}`;
  }
  return FREQ_LABELS[r.frequency] || r.frequency;
}

function getNextRunLabel(nextRun) {
  if (!nextRun) return 'Unknown';
  const next  = new Date(nextRun);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return `In ${diff} days`;
  return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Monthly-equivalent cost for a recurring item */
function toMonthly(r) {
  const amt = Number(r.amount);
  if (r.frequency === 'daily')  return amt * 30;
  if (r.frequency === 'weekly') return amt * 4;
  return amt; // monthly & semi_monthly both count once
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RecurringSection({
  recurringTransactions = [],
  onAdd,
  onEdit,
  onDelete,
}) {
  const income  = recurringTransactions.filter((r) => r.type === 'income');
  const expense = recurringTransactions.filter((r) => r.type === 'expense');

  const monthlyIncome  = income.reduce((s, r) => s + toMonthly(r), 0);
  const monthlyExpense = expense.reduce((s, r) => s + toMonthly(r), 0);
  const net = monthlyIncome - monthlyExpense;

  return (
    <View style={styles.card}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <RefreshCw size={16} color={colors.primary} />
          <Text style={styles.title}>Recurring Transactions</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Plus size={14} color={colors.primary} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Monthly summary chips ───────────────────────────────────────────── */}
      {recurringTransactions.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={[styles.chip, { backgroundColor: colors.incomeLight }]}>
            <Text style={[styles.chipText, { color: colors.income }]}>
              +₱{monthlyIncome.toFixed(2)}/mo
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.expenseLight }]}>
            <Text style={[styles.chipText, { color: colors.expense }]}>
              -₱{monthlyExpense.toFixed(2)}/mo
            </Text>
          </View>
          <View style={[styles.chip, {
            backgroundColor: net >= 0 ? colors.incomeLight : colors.expenseLight,
          }]}>
            <Text style={[styles.chipText, {
              color: net >= 0 ? colors.income : colors.expense,
            }]}>
              Net {net >= 0 ? '+' : ''}₱{net.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {recurringTransactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔁</Text>
          <Text style={styles.emptyTitle}>No recurring transactions</Text>
          <Text style={styles.emptyText}>
            Set up recurring income or expenses that auto-log on a schedule.
          </Text>
        </View>
      ) : (
        <>
          {/* Income group */}
          {income.length > 0 && (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>📥  Income</Text>
                <Text style={styles.groupCount}>{income.length}</Text>
              </View>
              {income.map((r) => (
                <RecurringRow key={r.id} item={r} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </View>
          )}

          {/* Expense group */}
          {expense.length > 0 && (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>📤  Expenses</Text>
                <Text style={styles.groupCount}>{expense.length}</Text>
              </View>
              {expense.map((r) => (
                <RecurringRow key={r.id} item={r} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </View>
          )}
        </>
      )}

      {/* ── Footer hint ─────────────────────────────────────────────────────── */}
      {recurringTransactions.length > 0 && (
        <Text style={styles.hint}>
          💡 These auto-log on their schedule. Tap ✏️ to edit or delete.
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single recurring row
// ─────────────────────────────────────────────────────────────────────────────

function RecurringRow({ item, onEdit, onDelete }) {
  const catCfg       = categoryConfig[item.category] || {};
  const icon         = item.emoji || catCfg.icon || '🔁';
  const catColor     = catCfg.color || colors.primary;
  const nextLabel    = getNextRunLabel(item.next_run);
  const isSubscription = item.is_subscription || item.category === 'Subscriptions';
  const freqLabel    = freqDetail(item);

  // Urgency on next run date
  const next  = item.next_run ? new Date(item.next_run) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (next) next.setHours(0, 0, 0, 0);
  const diff = next ? Math.ceil((next - today) / (1000 * 60 * 60 * 24)) : null;
  const nextColor =
    diff === null   ? colors.textMuted :
    diff < 0        ? colors.expense :
    diff <= 3       ? colors.warning :
    diff <= 7       ? colors.info :
                      colors.success;

  return (
    <View style={styles.row}>
      {/* Icon */}
      <View style={[styles.rowIcon, { backgroundColor: catColor + '20' }]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.description || item.category}
          </Text>
          {isSubscription && (
            <View style={styles.subBadge}>
              <Text style={styles.subBadgeText}>📦 Sub</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta}>
          {freqLabel} · {item.category}
        </Text>

        <Text style={[styles.rowNext, { color: nextColor }]}>
          Next: {nextLabel}
        </Text>
      </View>

      {/* Right: amount + actions */}
      <View style={styles.rowRight}>
        <Text style={[
          styles.rowAmount,
          { color: item.type === 'income' ? colors.income : colors.expense },
        ]}>
          {item.type === 'income' ? '+' : '-'}₱{Number(item.amount).toFixed(2)}
        </Text>
        <View style={styles.rowActions}>
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={styles.actionBtn}
            accessibilityLabel="Edit recurring"
          >
            <Pencil size={13} color={colors.primary} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.h3 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  // Summary chips
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  chipText: { fontSize: 11, fontWeight: '700' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },

  // Group
  group: { marginBottom: spacing.sm },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: 2,
  },
  groupLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  groupCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconText: { fontSize: 20 },
  rowInfo: { flex: 1, gap: 2 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  subBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  subBadgeText: { fontSize: 9, fontWeight: '700', color: colors.primary },
  rowMeta: { fontSize: 11, color: colors.textMuted },
  rowNext: { fontSize: 11, fontWeight: '600' },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmount: { fontSize: 13, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  // Hint
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
