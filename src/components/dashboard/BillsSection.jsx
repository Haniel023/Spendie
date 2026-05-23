import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Receipt, Plus, CheckCircle, AlertCircle, Clock, Pencil } from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDueLabelAndStatus(dueDateStr, isPaid) {
  if (isPaid) return { label: 'Paid', color: colors.success, bg: colors.successLight, icon: 'paid' };

  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: colors.expense, bg: colors.expenseLight, icon: 'overdue' };
  if (diff === 0) return { label: 'Due Today!', color: colors.warning, bg: colors.warningLight, icon: 'today' };
  if (diff === 1) return { label: 'Due Tomorrow', color: colors.warning, bg: colors.warningLight, icon: 'soon' };
  if (diff <= 7) return { label: `Due in ${diff}d`, color: colors.info, bg: colors.infoLight, icon: 'upcoming' };
  return {
    label: `${MONTHS_SHORT[due.getMonth()]} ${due.getDate()}`,
    color: colors.textSecondary,
    bg: colors.border,
    icon: 'future',
  };
}

export default function BillsSection({ bills = [], onAdd, onEdit, onDelete, onMarkPaid }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = bills.filter((b) => {
    const due = new Date(b.due_date);
    due.setHours(0, 0, 0, 0);
    return !b.is_paid && due < today;
  });

  const upcoming = bills.filter((b) => {
    const due = new Date(b.due_date);
    due.setHours(0, 0, 0, 0);
    return !b.is_paid && due >= today;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const paid = bills.filter((b) => b.is_paid);

  const unpaidTotal = [...overdue, ...upcoming].reduce((s, b) => s + Number(b.amount), 0);

  const renderBillItem = (bill) => {
    const catIcon  = categoryConfig[bill.category]?.icon  || '📄';
    const catColor = categoryConfig[bill.category]?.color || colors.warning;
    const { label, color, bg } = getDueLabelAndStatus(bill.due_date, bill.is_paid);

    return (
      <View key={bill.id} style={styles.billItem}>
        {/* ── Row 1: icon · name · amount ── */}
        <View style={styles.billRow1}>
          <View style={[styles.billIcon, { backgroundColor: catColor + '22' }]}>
            <Text style={styles.billIconText}>{bill.emoji || catIcon}</Text>
          </View>
          <View style={styles.billInfo}>
            <Text style={styles.billName} numberOfLines={1}>{bill.name}</Text>
            <Text style={styles.billCategory}>{bill.category}</Text>
          </View>
          <Text style={styles.billAmount}>₱{Number(bill.amount).toFixed(2)}</Text>
        </View>

        {/* ── Row 2: due badge · actions ── */}
        <View style={styles.billRow2}>
          <View style={[styles.dueBadge, { backgroundColor: bg }]}>
            <Text style={[styles.dueText, { color }]}>{label}</Text>
          </View>
          <View style={styles.billActions}>
            {!bill.is_paid && (
              <TouchableOpacity
                style={styles.paidBtn}
                onPress={() => onMarkPaid(bill.id)}
              >
                <CheckCircle size={14} color={colors.success} />
                <Text style={styles.paidBtnText}>Mark Paid</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(bill)}>
              <Pencil size={13} color={colors.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Receipt size={16} color={colors.warning} />
          <Text style={styles.title}>Bills & Due Dates</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Plus size={14} color={colors.warning} />
          <Text style={styles.addBtnText}>Add Bill</Text>
        </TouchableOpacity>
      </View>

      {/* Summary banner */}
      {bills.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { backgroundColor: colors.expenseLight }]}>
            <AlertCircle size={12} color={colors.expense} />
            <Text style={[styles.summaryChipText, { color: colors.expense }]}>
              {overdue.length} overdue
            </Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: colors.warningLight }]}>
            <Clock size={12} color={colors.warning} />
            <Text style={[styles.summaryChipText, { color: colors.warning }]}>
              {upcoming.length} upcoming
            </Text>
          </View>
          {unpaidTotal > 0 && (
            <View style={[styles.summaryChip, { backgroundColor: colors.infoLight }]}>
              <Text style={[styles.summaryChipText, { color: colors.info }]}>
                ₱{unpaidTotal.toFixed(0)} due
              </Text>
            </View>
          )}
        </View>
      )}

      {bills.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={styles.emptyTitle}>No bills tracked yet</Text>
          <Text style={styles.emptyText}>
            Add electric, water, rent, or credit card bills with due dates.
          </Text>
        </View>
      ) : (
        <>
          {/* Overdue */}
          {overdue.length > 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <AlertCircle size={14} color={colors.expense} />
                <Text style={[styles.sectionTitle, { color: colors.expense }]}>
                  Overdue ({overdue.length})
                </Text>
              </View>
              {overdue.map(renderBillItem)}
            </View>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <Clock size={14} color={colors.warning} />
                <Text style={[styles.sectionTitle, { color: colors.warning }]}>
                  Upcoming ({upcoming.length})
                </Text>
              </View>
              {upcoming.map(renderBillItem)}
            </View>
          )}

          {/* Paid */}
          {paid.length > 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <CheckCircle size={14} color={colors.success} />
                <Text style={[styles.sectionTitle, { color: colors.success }]}>
                  Paid this cycle ({paid.length})
                </Text>
              </View>
              {paid.map(renderBillItem)}
            </View>
          )}
        </>
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
    marginBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.h3 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: colors.warning, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
  },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.warning },

  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  summaryChipText: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700' },

  billItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },

  // Row 1 — icon · name · amount
  billRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  billIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  billIconText: { fontSize: 20 },
  billInfo: { flex: 1 },
  billName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  billCategory: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  billAmount: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flexShrink: 0 },

  // Row 2 — due badge · action buttons
  billRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 52, // align with text (icon width 40 + gap 12)
  },
  dueBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full },
  dueText: { fontSize: 11, fontWeight: '700' },
  billActions: { flexDirection: 'row', gap: spacing.xs },

  paidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  paidBtnText: { fontSize: 12, fontWeight: '600', color: colors.success },

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
});
