/**
 * CalendarTransactionsSection
 *
 * Unified card that merges the financial calendar with the transaction timeline.
 *
 * • Calendar at the top controls month navigation (shared with parent state)
 * • Tap a day → timeline below filters to only that day's transactions
 * • Tap the same day again (or "Clear") → shows the whole month
 * • No separate MonthNavigator in the transaction list
 */

import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';
import { useTheme } from '../../lib/ThemeContext';
import { colors as sc, spacing, radius, shadow } from '../../lib/theme'; // sc = staticColors for StyleSheet
import { toPHDate, getPHNow, toPHDateKey, formatPHTime } from '../../lib/timezone';

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function formatDayLabel(dateStr) {
  // dateStr is a YYYY-MM-DD key derived from PH timezone
  const [y, m, d] = dateStr.split('-').map(Number);
  const phNow      = getPHNow();
  const phToday    = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate());
  const phYesterday = new Date(phToday); phYesterday.setDate(phToday.getDate() - 1);
  const date = new Date(y, m - 1, d);
  if (date.getTime() === phToday.getTime())     return 'Today';
  if (date.getTime() === phYesterday.getTime()) return 'Yesterday';
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return `${days[date.getDay()]}, ${MONTHS_SHORT[m - 1]} ${d}`;
}

function groupByDay(transactions) {
  const groups = {};
  transactions.forEach((t) => {
    const key = toPHDateKey(t.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CalendarTransactionsSection({
  transactions = [],        // ALL transactions (calendar dots)
  monthTransactions = [],   // this month's transactions (timeline default)
  bills = [],
  activeSpace,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onAdd,
  onRecurring,
  onEdit,
  onDelete,
}) {
  const { colors } = useTheme();
  const [selectedDay, setSelectedDay] = useState(null);

  // Clear day selection when navigating to a different month
  useEffect(() => { setSelectedDay(null); }, [selectedMonth, selectedYear]);

  // ── Calendar navigation ────────────────────────────────────────────────────
  const goPrev = () => {
    const nm = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const ny = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    onMonthChange(nm, ny);
  };
  const goNext = () => {
    const nm = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const ny = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    onMonthChange(nm, ny);
  };

  // ── Day activity map ───────────────────────────────────────────────────────
  const dayMap = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const d = toPHDate(t.created_at);
      if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return;
      const day = d.getDate();
      if (!map[day]) map[day] = { income: 0, expense: 0, hasBill: false };
      if (t.type === 'income') map[day].income += Number(t.amount);
      else map[day].expense += Number(t.amount);
    });
    bills.forEach((b) => {
      const d = new Date(b.due_date);
      if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return;
      const day = d.getDate();
      if (!map[day]) map[day] = { income: 0, expense: 0, hasBill: false };
      map[day].hasBill = true;
    });
    return map;
  }, [transactions, bills, selectedMonth, selectedYear]);

  // ── Filtered transactions ──────────────────────────────────────────────────
  const displayTransactions = useMemo(() => {
    if (selectedDay === null) return monthTransactions;
    return monthTransactions.filter((t) => {
      const d = toPHDate(t.created_at);
      return d.getDate() === selectedDay
        && d.getMonth() === selectedMonth
        && d.getFullYear() === selectedYear;
    });
  }, [selectedDay, monthTransactions, selectedMonth, selectedYear]);

  const handleDayPress = (day) => {
    setSelectedDay((prev) => (prev === day ? null : day));
  };

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const cells = buildCells(selectedYear, selectedMonth);
  const now = getPHNow();
  const today = (selectedMonth === now.getMonth() && selectedYear === now.getFullYear()) ? now.getDate() : -1;

  // ── Summary numbers ────────────────────────────────────────────────────────
  const totalIncome   = displayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = displayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const grouped = groupByDay(displayTransactions);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>

      {/* ── Card header ─────────────────────────────────────────────────── */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Transactions</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{activeSpace?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.smallBtn, { borderColor: colors.primary }]}
            onPress={onAdd}
            activeOpacity={0.8}
          >
            <Plus size={14} color={colors.primary} />
            <Text style={[styles.smallBtnText, { color: colors.primary }]}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtn, { borderColor: colors.border }]}
            onPress={onRecurring}
            activeOpacity={0.8}
          >
            <RefreshCw size={13} color={colors.textSecondary} />
            <Text style={[styles.recurringBtnText, { color: colors.textSecondary }]}>Recurring</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Calendar ─────────────────────────────────────────────────────── */}
      <View style={[styles.calSection, { borderBottomColor: colors.border }]}>

        {/* Month nav row */}
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={goPrev} style={[styles.navBtn, { backgroundColor: colors.primaryLight }]}>
            <ChevronLeft size={18} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.monthTitleRow}>
            <Text style={[styles.calTitle, { color: colors.textPrimary }]}>
              {MONTHS[selectedMonth]} {selectedYear}
            </Text>
            {selectedDay !== null && (
              <TouchableOpacity
                style={[styles.clearBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => setSelectedDay(null)}
                activeOpacity={0.8}
              >
                <X size={10} color={colors.primary} />
                <Text style={[styles.clearBtnText, { color: colors.primary }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={goNext} style={[styles.navBtn, { backgroundColor: colors.primaryLight }]}>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.weekRow}>
          {DAYS.map(d => (
            <Text key={d} style={[styles.weekDay, { color: colors.textMuted }]}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`e-${idx}`} style={styles.cell} />;
            const data = dayMap[day];
            const isToday    = day === today;
            const isSelected = day === selectedDay;
            const hasActivity = data && (data.income > 0 || data.expense > 0);

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.cell,
                  isSelected && [styles.selectedCell, { backgroundColor: colors.primary }],
                  !isSelected && isToday && [styles.todayCell, { borderColor: colors.primary }],
                  !isSelected && !isToday && hasActivity && { backgroundColor: colors.background },
                ]}
                onPress={() => handleDayPress(day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayNum,
                  { color: colors.textSecondary },
                  isSelected && { color: '#fff', fontWeight: '800' },
                  !isSelected && isToday && { color: colors.primary, fontWeight: '700' },
                  !isSelected && !isToday && hasActivity && { color: colors.textPrimary, fontWeight: '600' },
                ]}>
                  {day}
                </Text>

                <View style={styles.dotRow}>
                  {data?.income > 0 && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : colors.income }]} />
                  )}
                  {data?.expense > 0 && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : colors.expense }]} />
                  )}
                  {data?.hasBill && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : colors.warning }]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={[styles.legend, { borderTopColor: colors.border }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Expense</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Bill Due</Text>
          </View>
        </View>
      </View>

      {/* ── Day filter banner ─────────────────────────────────────────────── */}
      {selectedDay !== null && (
        <View style={[styles.filterBanner, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.filterText, { color: colors.primary }]}>
            📅 {MONTHS[selectedMonth]} {selectedDay} — tap date again or Clear to show all
          </Text>
        </View>
      )}

      {/* ── Summary row ──────────────────────────────────────────────────── */}
      {(totalIncome > 0 || totalExpenses > 0) && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { backgroundColor: colors.incomeLight }]}>
            <Text style={[styles.summaryLabel, { color: colors.income }]}>+₱{totalIncome.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: colors.expenseLight }]}>
            <Text style={[styles.summaryLabel, { color: colors.expense }]}>-₱{totalExpenses.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.summaryLabel, { color: colors.primary }]}>{displayTransactions.length} entries</Text>
          </View>
        </View>
      )}

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      {displayTransactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{selectedDay ? '📅' : '💸'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {selectedDay
              ? `No transactions on ${MONTHS_SHORT[selectedMonth]} ${selectedDay}`
              : 'No transactions this month'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {selectedDay
              ? 'Tap another date or Clear to see the whole month.'
              : 'Add your first income or expense to start tracking.'}
          </Text>
        </View>
      ) : (
        grouped.map(([dayKey, items]) => {
          const dayIncome  = items.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
          const dayExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
          return (
            <View key={dayKey}>
              <View style={styles.dayHeader}>
                <View style={[styles.dayDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.dayLabel, { color: colors.primary }]}>{formatDayLabel(dayKey)}</Text>
                <View style={[styles.dayLine, { backgroundColor: colors.border }]} />
                <View style={styles.dayTotals}>
                  {dayIncome  > 0 && <Text style={[styles.dayIncome,  { color: colors.income  }]}>+₱{dayIncome.toFixed(0)}</Text>}
                  {dayExpense > 0 && <Text style={[styles.dayExpense, { color: colors.expense }]}>-₱{dayExpense.toFixed(0)}</Text>}
                </View>
              </View>

              {items.map((item, idx) => {
                const catColor = categoryConfig[item.category]?.color || '#6b7280';
                const catIcon  = categoryConfig[item.category]?.icon  || '✨';
                const isLast   = idx === items.length - 1;
                return (
                  <View key={item.id} style={[styles.timelineItem, isLast && styles.timelineItemLast]}>
                    <View style={styles.connector}>
                      <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
                      <View style={[styles.connectorDot, { borderColor: catColor, backgroundColor: colors.card }]} />
                    </View>
                    <View style={styles.itemContent}>
                      <View style={[styles.catIcon, { backgroundColor: catColor + '22' }]}>
                        <Text style={styles.catIconText}>{item.emoji || catIcon}</Text>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[styles.category, { color: colors.textPrimary }]}>{item.category}</Text>
                        <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.description || 'No description'}
                        </Text>
                        <Text style={[styles.addedBy, { color: colors.textMuted }]}>
                          {item.profiles?.full_name || 'You'} ·{' '}
                          {formatPHTime(item.created_at)}
                        </Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={[styles.amount, { color: item.type === 'income' ? colors.income : colors.expense }]}>
                          {item.type === 'income' ? '+' : '-'}₱{Number(item.amount).toFixed(2)}
                        </Text>
                        <View style={styles.actions}>
                          <TouchableOpacity
                            style={[styles.editBtn, { backgroundColor: colors.primaryLight }]}
                            onPress={() => onEdit(item)}
                          >
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

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
  },
  smallBtnText: { fontSize: 12, fontWeight: '600' },
  recurringBtnText: { fontSize: 12 },

  // Calendar section
  calSection: {
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
  },
  calHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  navBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  monthTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  calTitle: { fontSize: 15, fontWeight: '700' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  clearBtnText: { fontSize: 10, fontWeight: '700' },

  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  selectedCell: { borderRadius: radius.sm },
  todayCell: { borderWidth: 1.5, borderRadius: radius.sm },
  dayNum: { fontSize: 12, fontWeight: '500' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  legend: {
    flexDirection: 'row', justifyContent: 'center',
    gap: spacing.lg, marginTop: spacing.sm,
    paddingTop: spacing.sm, borderTopWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 10 },

  // Filter banner
  filterBanner: {
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7,
    marginBottom: spacing.sm,
  },
  filterText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Summary
  summaryRow: {
    flexDirection: 'row', gap: spacing.xs,
    marginBottom: spacing.sm, flexWrap: 'wrap',
  },
  summaryChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  summaryLabel: { fontSize: 12, fontWeight: '600' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // Timeline
  dayHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.md, marginBottom: spacing.xs, gap: spacing.xs,
  },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  dayLabel: { fontSize: 12, fontWeight: '700', flexShrink: 0 },
  dayLine: { flex: 1, height: 1 },
  dayTotals: { flexDirection: 'row', gap: 4 },
  dayIncome:  { fontSize: 11, fontWeight: '600' },
  dayExpense: { fontSize: 11, fontWeight: '600' },

  timelineItem: { flexDirection: 'row', paddingBottom: spacing.xs },
  timelineItemLast: { paddingBottom: spacing.sm },
  connector: { width: 20, alignItems: 'center', paddingTop: 8 },
  connectorLine: {
    position: 'absolute', top: 0, bottom: 0, width: 1, left: 9,
  },
  connectorDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, zIndex: 1,
  },
  itemContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingVertical: spacing.xs, paddingLeft: spacing.sm,
  },
  catIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catIconText: { fontSize: 17 },
  itemInfo: { flex: 1 },
  category: { fontSize: 13, fontWeight: '600' },
  desc: { fontSize: 11, marginTop: 1 },
  addedBy: { fontSize: 10, marginTop: 1 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 4 },
  editBtn: { padding: 5, borderRadius: 6 },
});
