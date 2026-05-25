/**
 * BillsSection — merged Bills + Subscriptions
 *
 * Shows two summary cards side-by-side:
 *   [Bills Card]          [Subscriptions Card]
 *   Total unpaid ₱X       Monthly ₱X
 *   X overdue · Y upcoming Z active
 *
 * Each card is tappable to expand/collapse its detail list below.
 *
 * Props:
 *   bills                array
 *   recurringTransactions array  (subscriptions filtered from here)
 *   onAdd                fn      open add-bill modal
 *   onEdit               fn(bill)
 *   onDelete             fn(id)
 *   onMarkPaid           fn(id)
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Receipt, RefreshCw, Plus, CheckCircle, AlertCircle,
  Clock, Pencil, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { categoryConfig } from '../../lib/categoryConfig';
import CategoryIcon from '../common/CategoryIcon';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function dueMeta(dueDateStr, isPaid) {
  if (isPaid) return { label: 'Paid', color: '#22c55e', bg: '#dcfce7' };
  const due   = new Date(dueDateStr);
  const today = new Date(); today.setHours(0,0,0,0); due.setHours(0,0,0,0);
  const diff  = Math.ceil((due - today) / 86400000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: '#ef4444', bg: '#fee2e2' };
  if (diff === 0) return { label: 'Due Today!',   color: '#f59e0b', bg: '#fef3c7' };
  if (diff === 1) return { label: 'Due Tomorrow', color: '#f59e0b', bg: '#fef3c7' };
  if (diff <= 7)  return { label: `In ${diff}d`,  color: '#3b82f6', bg: '#dbeafe' };
  return { label: `${MONTHS[due.getMonth()]} ${due.getDate()}`, color: '#6b7280', bg: '#f3f4f6' };
}

function subRenewalLabel(nextRun) {
  if (!nextRun) return 'Unknown';
  const next  = new Date(nextRun);
  const today = new Date(); today.setHours(0,0,0,0); next.setHours(0,0,0,0);
  const diff  = Math.ceil((next - today) / 86400000);
  if (diff < 0)  return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7)  return `In ${diff} days`;
  return next.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function subRenewalColor(nextRun, colors) {
  if (!nextRun) return colors.textMuted;
  const diff = Math.ceil((new Date(nextRun) - new Date()) / 86400000);
  if (diff < 0)  return colors.expense;
  if (diff <= 3) return colors.warning;
  if (diff <= 7) return colors.info;
  return colors.income;
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, iconColor, title, amount, amountLabel, detail, isOpen, onToggle, colors }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.card,
          borderColor: isOpen ? iconColor + '50' : colors.border,
          borderWidth: isOpen ? 1.5 : 1,
        },
      ]}
    >
      <View style={[styles.summaryIconWrap, { backgroundColor: iconColor + '18' }]}>
        <Icon size={16} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.summaryAmt, { color: colors.textPrimary }]}>{amount}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{amountLabel}</Text>
      <Text style={[styles.summaryDetail, { color: colors.textMuted }]}>{detail}</Text>
      <View style={[styles.chevronWrap, { backgroundColor: colors.background }]}>
        {isOpen
          ? <ChevronUp size={12} color={colors.textMuted} />
          : <ChevronDown size={12} color={colors.textMuted} />
        }
      </View>
    </TouchableOpacity>
  );
}

// ── Bill row (expanded list) ──────────────────────────────────────────────────

function BillRow({ bill, onEdit, onMarkPaid, colors }) {
  const catColor = categoryConfig[bill.category]?.color || '#f59e0b';
  const { label, color, bg } = dueMeta(bill.due_date, bill.is_paid);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: catColor + '20' }]}>
        <CategoryIcon category={bill.category} size={16} color={catColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>{bill.name}</Text>
        <View style={[styles.dueBadge, { backgroundColor: bg }]}>
          <Text style={[styles.dueText, { color }]}>{label}</Text>
        </View>
      </View>
      <Text style={[styles.rowAmt, { color: colors.textPrimary }]}>
        ₱{Number(bill.amount).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
      </Text>
      <View style={styles.rowActions}>
        {!bill.is_paid && (
          <TouchableOpacity
            style={[styles.paidBtn, { backgroundColor: '#dcfce7' }]}
            onPress={() => onMarkPaid(bill.id)}
          >
            <CheckCircle size={13} color="#22c55e" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.editSmall, { backgroundColor: colors.primaryLight }]}
          onPress={() => onEdit(bill)}
        >
          <Pencil size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Subscription row ──────────────────────────────────────────────────────────

function SubRow({ sub, onEditSub, colors }) {
  const catColor    = categoryConfig[sub.category]?.color || colors.primary;
  const renewal     = subRenewalLabel(sub.next_run);
  const renewColor  = subRenewalColor(sub.next_run, colors);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: catColor + '20' }]}>
        <CategoryIcon category={sub.category} size={16} color={catColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
          {sub.description || sub.category}
        </Text>
        <Text style={[styles.subFreq, { color: colors.textMuted }]}>
          {sub.frequency?.replace('_', '-')}
        </Text>
      </View>
      <View style={styles.subRight}>
        <Text style={[styles.rowAmt, { color: colors.expense }]}>
          ₱{Number(sub.amount).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
        </Text>
        <View style={[styles.renewBadge, { backgroundColor: renewColor + '20' }]}>
          <Text style={[styles.renewText, { color: renewColor }]}>{renewal}</Text>
        </View>
      </View>
      {onEditSub && (
        <TouchableOpacity
          style={[styles.editSmall, { backgroundColor: colors.primaryLight }]}
          onPress={() => onEditSub(sub)}
        >
          <Pencil size={12} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function BillsSection({
  bills = [],
  recurringTransactions = [],
  onAdd,
  onAddSub,
  onEdit,
  onEditSub,
  onDelete,
  onMarkPaid,
}) {
  const { colors } = useTheme();
  const [billsOpen, setBillsOpen]   = useState(false);
  const [subsOpen,  setSubsOpen]    = useState(false);

  // ── Bills data ──────────────────────────────────────────────────────────────
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const overdue  = bills.filter((b) => { const d = new Date(b.due_date); d.setHours(0,0,0,0); return !b.is_paid && d < today; });
  const upcoming = bills.filter((b) => { const d = new Date(b.due_date); d.setHours(0,0,0,0); return !b.is_paid && d >= today; }).sort((a,b) => new Date(a.due_date) - new Date(b.due_date));
  const paid     = bills.filter((b) => b.is_paid);
  const unpaidTotal = [...overdue, ...upcoming].reduce((s, b) => s + Number(b.amount), 0);

  const billDetail = overdue.length > 0
    ? `${overdue.length} overdue · ${upcoming.length} upcoming`
    : upcoming.length > 0
      ? `${upcoming.length} upcoming`
      : paid.length > 0 ? 'All paid ✓' : 'No bills';

  // ── Subscriptions data ──────────────────────────────────────────────────────
  const subs = recurringTransactions
    .filter((r) => r.is_subscription || r.category === 'Subscriptions')
    .sort((a, b) => {
      if (!a.next_run) return 1;
      if (!b.next_run) return -1;
      return new Date(a.next_run) - new Date(b.next_run);
    });

  const monthlyTotal = subs.reduce((sum, s) => {
    const amt = Number(s.amount);
    if (s.frequency === 'daily')   return sum + amt * 30;
    if (s.frequency === 'weekly')  return sum + amt * 4;
    return sum + amt;
  }, 0);

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Bills & Subscriptions</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Upcoming obligations</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.warning }]}
            onPress={onAdd}
          >
            <Plus size={13} color={colors.warning} />
            <Text style={[styles.addBtnText, { color: colors.warning }]}>Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.primary }]}
            onPress={onAddSub}
          >
            <Plus size={13} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Sub</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Two summary cards */}
      <View style={styles.summaryRow}>
        <SummaryCard
          icon={Receipt}
          iconColor={colors.warning}
          title="Bills"
          amount={unpaidTotal > 0 ? `₱${Math.round(unpaidTotal).toLocaleString()}` : '₱0'}
          amountLabel="total unpaid"
          detail={billDetail}
          isOpen={billsOpen}
          onToggle={() => setBillsOpen((v) => !v)}
          colors={colors}
        />
        <SummaryCard
          icon={RefreshCw}
          iconColor={colors.primary}
          title="Subscriptions"
          amount={`₱${Math.round(monthlyTotal).toLocaleString()}`}
          amountLabel="per month"
          detail={subs.length > 0 ? `${subs.length} active` : 'None added'}
          isOpen={subsOpen}
          onToggle={() => setSubsOpen((v) => !v)}
          colors={colors}
        />
      </View>

      {/* ── Expanded: Bills list ──────────────────────────────────────────── */}
      {billsOpen && (
        <View style={[styles.listWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {bills.length === 0 ? (
            <View style={styles.listEmpty}>
              <Receipt size={20} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.listEmptyText, { color: colors.textMuted }]}>No bills tracked yet</Text>
            </View>
          ) : (
            <>
              {/* Overdue group */}
              {overdue.length > 0 && (
                <>
                  <View style={styles.listGroupHeader}>
                    <AlertCircle size={12} color={colors.expense} />
                    <Text style={[styles.listGroupLabel, { color: colors.expense }]}>
                      Overdue ({overdue.length})
                    </Text>
                  </View>
                  {overdue.map((b) => (
                    <BillRow key={b.id} bill={b} onEdit={onEdit} onMarkPaid={onMarkPaid} colors={colors} />
                  ))}
                </>
              )}
              {/* Upcoming group */}
              {upcoming.length > 0 && (
                <>
                  <View style={styles.listGroupHeader}>
                    <Clock size={12} color={colors.warning} />
                    <Text style={[styles.listGroupLabel, { color: colors.warning }]}>
                      Upcoming ({upcoming.length})
                    </Text>
                  </View>
                  {upcoming.map((b) => (
                    <BillRow key={b.id} bill={b} onEdit={onEdit} onMarkPaid={onMarkPaid} colors={colors} />
                  ))}
                </>
              )}
              {/* Paid group */}
              {paid.length > 0 && (
                <>
                  <View style={styles.listGroupHeader}>
                    <CheckCircle size={12} color={colors.income} />
                    <Text style={[styles.listGroupLabel, { color: colors.income }]}>
                      Paid ({paid.length})
                    </Text>
                  </View>
                  {paid.map((b) => (
                    <BillRow key={b.id} bill={b} onEdit={onEdit} onMarkPaid={onMarkPaid} colors={colors} />
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* ── Expanded: Subscriptions list ─────────────────────────────────── */}
      {subsOpen && (
        <View style={[styles.listWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {subs.length === 0 ? (
            <View style={styles.listEmpty}>
              <RefreshCw size={20} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.listEmptyText, { color: colors.textMuted }]}>No subscriptions yet</Text>
            </View>
          ) : (
            subs.map((s) => <SubRow key={s.id} sub={s} onEditSub={onEditSub} colors={colors} />)
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 20, marginBottom: 10 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  title:    { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 11, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  addBtnText: { fontSize: 12, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 10 },

  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  summaryTitle:  { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmt:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  summaryLabel:  { fontSize: 10, fontWeight: '500' },
  summaryDetail: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  chevronWrap: {
    alignSelf: 'flex-end',
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 6,
  },

  listWrap: {
    marginTop: 10, borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
  },

  listEmpty: {
    padding: 24, alignItems: 'center', gap: 8,
  },
  listEmptyText: { fontSize: 13, fontWeight: '500' },

  listGroupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  listGroupLabel: { fontSize: 12, fontWeight: '700' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowIcon:  { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowInfo:  { flex: 1, gap: 3 },
  rowName:  { fontSize: 13, fontWeight: '600' },
  rowAmt:   { fontSize: 13, fontWeight: '700', flexShrink: 0 },

  dueBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  dueText:  { fontSize: 10, fontWeight: '700' },

  rowActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  paidBtn: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
  },
  editSmall: {
    width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },

  subRight:    { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  subFreq:     { fontSize: 10, textTransform: 'capitalize' },
  renewBadge:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  renewText:   { fontSize: 10, fontWeight: '600' },
});
