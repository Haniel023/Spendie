import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Pencil, RefreshCw } from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';
import MonthNavigator from '../common/MonthNavigator';
import { getPHNow, toPHDateKey, formatPHTime } from '../../lib/timezone';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDayLabel(dateStr) {
  // dateStr is a YYYY-MM-DD key derived from PH timezone
  const [y, m, d] = dateStr.split('-').map(Number);
  const phNow       = getPHNow();
  const phToday     = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate());
  const phYesterday = new Date(phToday); phYesterday.setDate(phToday.getDate() - 1);
  const date = new Date(y, m - 1, d);
  if (date.getTime() === phToday.getTime())     return 'Today';
  if (date.getTime() === phYesterday.getTime()) return 'Yesterday';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[date.getDay()]}, ${MONTHS_SHORT[m - 1]} ${d}`;
}

function groupByDay(transactions) {
  const groups = {};
  transactions.forEach((item) => {
    const key = toPHDateKey(item.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  // Sort keys descending (newest first)
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function TransactionsSection({
  transactions,
  activeSpace,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onAdd,
  onRecurring,
  onEdit,
  onDelete,
}) {
  const grouped = groupByDay(transactions);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.subtitle}>{activeSpace?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={onAdd}>
            <Plus size={14} color={colors.primary} />
            <Text style={styles.smallBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.recurringBtn]} onPress={onRecurring}>
            <RefreshCw size={13} color={colors.textSecondary} />
            <Text style={styles.recurringBtnText}>Recurring</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Navigator */}
      {onMonthChange && (
        <View style={styles.monthNav}>
          <MonthNavigator
            month={selectedMonth}
            year={selectedYear}
            onChange={onMonthChange}
            variant="dark"
          />
        </View>
      )}

      {/* Monthly Summary Row */}
      {transactions.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { backgroundColor: colors.incomeLight }]}>
            <Text style={[styles.summaryLabel, { color: colors.income }]}>
              +₱{totalIncome.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: colors.expenseLight }]}>
            <Text style={[styles.summaryLabel, { color: colors.expense }]}>
              -₱{totalExpenses.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.summaryLabel, { color: colors.primary }]}>
              {transactions.length} entries
            </Text>
          </View>
        </View>
      )}

      {/* Timeline Feed */}
      {transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💸</Text>
          <Text style={styles.emptyTitle}>No transactions this month</Text>
          <Text style={styles.emptyText}>Add your first income or expense to start tracking.</Text>
        </View>
      ) : (
        grouped.map(([dayKey, items]) => {
          const dayIncome = items.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
          const dayExpense = items.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

          return (
            <View key={dayKey}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <View style={styles.dayDot} />
                <Text style={styles.dayLabel}>{formatDayLabel(dayKey)}</Text>
                <View style={styles.dayLine} />
                <View style={styles.dayTotals}>
                  {dayIncome > 0 && (
                    <Text style={styles.dayIncome}>+₱{dayIncome.toFixed(0)}</Text>
                  )}
                  {dayExpense > 0 && (
                    <Text style={styles.dayExpense}>-₱{dayExpense.toFixed(0)}</Text>
                  )}
                </View>
              </View>

              {/* Transactions for the day */}
              {items.map((item, idx) => {
                const catColor = categoryConfig[item.category]?.color || '#6b7280';
                const catIcon = categoryConfig[item.category]?.icon || '✨';
                const isLast = idx === items.length - 1;

                return (
                  <View key={item.id} style={[styles.timelineItem, isLast && styles.timelineItemLast]}>
                    {/* Vertical connector */}
                    <View style={styles.connector}>
                      <View style={styles.connectorLine} />
                      <View style={[styles.connectorDot, { borderColor: catColor }]} />
                    </View>

                    {/* Content */}
                    <View style={styles.itemContent}>
                      <View style={[styles.catIcon, { backgroundColor: catColor + '22' }]}>
                        <Text style={styles.catIconText}>{item.emoji || catIcon}</Text>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.category}>{item.category}</Text>
                        <Text style={styles.desc} numberOfLines={1}>
                          {item.description || 'No description'}
                        </Text>
                        <Text style={styles.addedBy}>
                          {item.profiles?.full_name || 'You'} ·{' '}
                          {formatPHTime(item.created_at)}
                        </Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={[styles.amount, item.type === 'income' ? styles.income : styles.expense]}>
                          {item.type === 'income' ? '+' : '-'}₱{Number(item.amount).toFixed(2)}
                        </Text>
                        <View style={styles.actions}>
                          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
                            <Pencil size={12} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
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
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  smallBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  recurringBtn: { borderColor: colors.textSecondary },
  recurringBtnText: { fontSize: 12, color: colors.textSecondary },

  monthNav: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  summaryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  summaryLabel: { fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },

  // Day header
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 0,
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dayTotals: {
    flexDirection: 'row',
    gap: 4,
  },
  dayIncome: { fontSize: 11, fontWeight: '600', color: colors.income },
  dayExpense: { fontSize: 11, fontWeight: '600', color: colors.expense },

  // Timeline item
  timelineItem: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
  },
  timelineItemLast: {
    paddingBottom: spacing.sm,
  },
  connector: {
    width: 20,
    alignItems: 'center',
    paddingTop: 8,
  },
  connectorLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
    left: 9,
  },
  connectorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
    borderWidth: 2,
    zIndex: 1,
  },

  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
  },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catIconText: { fontSize: 17 },
  itemInfo: { flex: 1 },
  category: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  desc: { fontSize: 11, color: colors.textSecondary },
  addedBy: { fontSize: 10, color: colors.textMuted },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 13, fontWeight: '700' },
  income: { color: colors.income },
  expense: { color: colors.expense },
  actions: { flexDirection: 'row', gap: 4 },
  editBtn: { padding: 5, backgroundColor: colors.primaryLight, borderRadius: 6 },
});
