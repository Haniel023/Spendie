import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';
import { useTheme } from '../../lib/ThemeContext';
// Keep static import for fallback values used in StyleSheet
import { colors as staticColors, spacing, radius, shadow } from '../../lib/theme';
import { toPHDate, getPHNow } from '../../lib/timezone';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * CalendarView supports two modes:
 *   Controlled:   pass month, year, onMonthChange props — calendar stays in sync with parent
 *   Uncontrolled: omit those props — calendar manages its own month state
 */
export default function CalendarView({ transactions = [], bills = [], month, year, onMonthChange }) {
  const { colors } = useTheme();
  const now = getPHNow();

  // Uncontrolled fallback state
  const [internalMonth, setInternalMonth] = useState(now.getMonth());
  const [internalYear, setInternalYear] = useState(now.getFullYear());

  // Controlled or uncontrolled
  const calMonth = month !== undefined ? month : internalMonth;
  const calYear  = year  !== undefined ? year  : internalYear;

  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  const goPrev = () => {
    const newMonth = calMonth === 0 ? 11 : calMonth - 1;
    const newYear  = calMonth === 0 ? calYear - 1 : calYear;
    if (onMonthChange) { onMonthChange(newMonth, newYear); }
    else { setInternalMonth(newMonth); setInternalYear(newYear); }
  };
  const goNext = () => {
    const newMonth = calMonth === 11 ? 0 : calMonth + 1;
    const newYear  = calMonth === 11 ? calYear + 1 : calYear;
    if (onMonthChange) { onMonthChange(newMonth, newYear); }
    else { setInternalMonth(newMonth); setInternalYear(newYear); }
  };

  // Build day → {income, expense, transactions, bills} map
  const dayMap = {};
  transactions.forEach((t) => {
    const d = toPHDate(t.created_at);
    if (d.getMonth() !== calMonth || d.getFullYear() !== calYear) return;
    const key = dateKey(calYear, calMonth, d.getDate());
    if (!dayMap[key]) dayMap[key] = { income: 0, expense: 0, items: [], billsDue: [] };
    if (t.type === 'income') dayMap[key].income += Number(t.amount);
    else dayMap[key].expense += Number(t.amount);
    dayMap[key].items.push(t);
  });

  bills.forEach((b) => {
    const d = new Date(b.due_date);
    if (d.getMonth() !== calMonth || d.getFullYear() !== calYear) return;
    const key = dateKey(calYear, calMonth, d.getDate());
    if (!dayMap[key]) dayMap[key] = { income: 0, expense: 0, items: [], billsDue: [] };
    dayMap[key].billsDue.push(b);
  });

  const cells = buildCalendarDays(calYear, calMonth);
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const handleDayPress = (day) => {
    if (!day) return;
    const key = dateKey(calYear, calMonth, day);
    const dayData = dayMap[key];
    if (dayData && (dayData.items.length > 0 || dayData.billsDue.length > 0)) {
      setSelectedDay({ day, key, ...dayData });
      setShowDayModal(true);
    }
  };

  const selectedDayKey = selectedDay?.key;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={goPrev} style={[styles.navBtn, { backgroundColor: colors.primaryLight }]}>
          <ChevronLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.calTitle, { color: colors.textPrimary }]}>{MONTHS[calMonth]} {calYear}</Text>
        <TouchableOpacity onPress={goNext} style={[styles.navBtn, { backgroundColor: colors.primaryLight }]}>
          <ChevronRight size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.weekRow}>
        {DAYS.map((d) => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e-${idx}`} style={styles.cell} />;

          const key = dateKey(calYear, calMonth, day);
          const data = dayMap[key];
          const isToday = key === todayKey;
          const hasBills = data?.billsDue?.length > 0;
          const hasActivity = data && (data.income > 0 || data.expense > 0);

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.cell,
                isToday && [styles.todayCell, { backgroundColor: colors.primary }],
                hasActivity && !isToday && [styles.activeCell, { backgroundColor: colors.background }],
              ]}
              onPress={() => handleDayPress(day)}
              activeOpacity={data ? 0.7 : 1}
            >
              <Text style={[
                styles.dayNum,
                { color: colors.textSecondary },
                isToday && styles.todayNum,
                hasActivity && !isToday && [styles.activeDayNum, { color: colors.textPrimary }],
              ]}>
                {day}
              </Text>

              {/* Dot indicators */}
              <View style={styles.dotRow}>
                {data?.income > 0 && <View style={[styles.dot, { backgroundColor: colors.income }]} />}
                {data?.expense > 0 && <View style={[styles.dot, { backgroundColor: colors.expense }]} />}
                {hasBills && <View style={[styles.dot, { backgroundColor: colors.warning }]} />}
              </View>

              {/* Mini amounts */}
              {hasActivity && (
                <View style={styles.miniAmounts}>
                  {data.income > 0 && (
                    <Text style={styles.miniIncome} numberOfLines={1}>
                      +{(data.income / 1000).toFixed(1)}k
                    </Text>
                  )}
                  {data.expense > 0 && (
                    <Text style={styles.miniExpense} numberOfLines={1}>
                      -{(data.expense / 1000).toFixed(1)}k
                    </Text>
                  )}
                </View>
              )}
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

      {/* Day Detail Modal */}
      <Modal
        visible={showDayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {MONTHS[calMonth]} {selectedDay?.day}, {calYear}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDayModal(false)}
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Day summary */}
            {(selectedDay?.income > 0 || selectedDay?.expense > 0) && (
              <View style={styles.daySummary}>
                {selectedDay?.income > 0 && (
                  <View style={[styles.daySumChip, { backgroundColor: colors.incomeLight }]}>
                    <Text style={[styles.daySumText, { color: colors.income }]}>
                      +₱{selectedDay.income.toFixed(2)}
                    </Text>
                  </View>
                )}
                {selectedDay?.expense > 0 && (
                  <View style={[styles.daySumChip, { backgroundColor: colors.expenseLight }]}>
                    <Text style={[styles.daySumText, { color: colors.expense }]}>
                      -₱{selectedDay.expense.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Bills due */}
              {selectedDay?.billsDue?.length > 0 && (
                <View>
                  <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>📅 Bills Due</Text>
                  {selectedDay.billsDue.map((bill) => (
                    <View key={bill.id} style={[styles.modalItem, { borderLeftColor: colors.warning, backgroundColor: colors.background }]}>
                      <Text style={styles.modalItemEmoji}>{bill.emoji || '📄'}</Text>
                      <View style={styles.modalItemBody}>
                        <Text style={[styles.modalItemTitle, { color: colors.textPrimary }]}>{bill.name}</Text>
                        <Text style={[styles.modalItemSub, { color: colors.textMuted }]}>{bill.category}</Text>
                      </View>
                      <Text style={[styles.modalItemAmt, { color: colors.warning }]}>
                        ₱{Number(bill.amount).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Transactions */}
              {selectedDay?.items?.length > 0 && (
                <View>
                  <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>💸 Transactions</Text>
                  {selectedDay.items.map((t) => {
                    const catIcon = categoryConfig[t.category]?.icon || '✨';
                    const catColor = categoryConfig[t.category]?.color || colors.textMuted;
                    return (
                      <View key={t.id} style={[styles.modalItem, { borderLeftColor: catColor, backgroundColor: colors.background }]}>
                        <Text style={styles.modalItemEmoji}>{t.emoji || catIcon}</Text>
                        <View style={styles.modalItemBody}>
                          <Text style={[styles.modalItemTitle, { color: colors.textPrimary }]}>{t.category}</Text>
                          <Text style={[styles.modalItemSub, { color: colors.textMuted }]}>{t.description || 'No description'}</Text>
                        </View>
                        <Text style={[styles.modalItemAmt, { color: t.type === 'income' ? colors.income : colors.expense }]}>
                          {t.type === 'income' ? '+' : '-'}₱{Number(t.amount).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: staticColors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: staticColors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  calTitle: { fontSize: 16, fontWeight: '700', color: staticColors.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: staticColors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 52,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  todayCell: { backgroundColor: staticColors.primary, borderRadius: radius.sm },
  activeCell: { backgroundColor: staticColors.background },
  dayNum: { fontSize: 13, fontWeight: '500', color: staticColors.textSecondary },
  todayNum: { color: staticColors.white, fontWeight: '700' },
  activeDayNum: { color: staticColors.textPrimary, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  miniAmounts: { gap: 0, alignItems: 'center' },
  miniIncome: { fontSize: 8, color: staticColors.income, fontWeight: '600' },
  miniExpense: { fontSize: 8, color: staticColors.expense, fontWeight: '600' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: staticColors.textSecondary },

  // Day modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: staticColors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, maxHeight: '65%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: staticColors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTitle: { fontSize: 16, fontWeight: '700', color: staticColors.textPrimary },
  closeBtn: { padding: 6, backgroundColor: staticColors.background, borderRadius: 16 },
  daySummary: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  daySumChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
  daySumText: { fontSize: 14, fontWeight: '700' },
  modalSectionTitle: { fontSize: 13, fontWeight: '700', color: staticColors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderLeftWidth: 3, paddingLeft: spacing.sm,
    marginBottom: 4, borderRadius: 4,
    backgroundColor: staticColors.background,
  },
  modalItemEmoji: { fontSize: 20 },
  modalItemBody: { flex: 1 },
  modalItemTitle: { fontSize: 13, fontWeight: '600', color: staticColors.textPrimary },
  modalItemSub: { fontSize: 11, color: staticColors.textMuted },
  modalItemAmt: { fontSize: 14, fontWeight: '700' },
});
