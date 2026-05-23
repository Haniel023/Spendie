import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { colors, spacing, radius } from '../../lib/theme';
import { getPHNow } from '../../lib/timezone';

const GOAL_EMOJIS = [
  '🚗','🏠','💻','📱','✈️','🎓','💍','🏖️',
  '🎮','👟','🎸','🐾','👶','💊','🌿','💰',
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_HDR = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function ordinal(n) {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
}

function buildCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

// ── Inline date picker ────────────────────────────────────────────────────────
function InlineDatePicker({ value, onChange, onClose }) {
  const ph = getPHNow();
  const seed = value ? new Date(value + 'T00:00:00') : ph;
  const [pMonth, setPMonth] = useState(seed.getMonth());
  const [pYear,  setPYear]  = useState(seed.getFullYear());

  const selectedDay   = value ? new Date(value + 'T00:00:00').getDate()     : null;
  const selectedMonth = value ? new Date(value + 'T00:00:00').getMonth()    : null;
  const selectedYear  = value ? new Date(value + 'T00:00:00').getFullYear() : null;

  const todayDay   = ph.getDate();
  const todayMonth = ph.getMonth();
  const todayYear  = ph.getFullYear();

  const goPrev = () => {
    if (pMonth === 0) { setPMonth(11); setPYear(y => y - 1); }
    else setPMonth(m => m - 1);
  };
  const goNext = () => {
    if (pMonth === 11) { setPMonth(0); setPYear(y => y + 1); }
    else setPMonth(m => m + 1);
  };

  const handleSelect = (day) => {
    const m = String(pMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${pYear}-${m}-${d}`);
    onClose();
  };

  const cells = buildCells(pYear, pMonth);
  const isSelectedMonth = pMonth === selectedMonth && pYear === selectedYear;
  const isTodayMonth    = pMonth === todayMonth    && pYear === todayYear;

  return (
    <View style={picker.wrap}>
      {/* Month / Year nav */}
      <View style={picker.nav}>
        <TouchableOpacity onPress={goPrev} style={picker.navBtn}>
          <ChevronLeft size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={picker.navTitle}>{MONTHS[pMonth]} {pYear}</Text>
        <TouchableOpacity onPress={goNext} style={picker.navBtn}>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={picker.weekRow}>
        {DAYS_HDR.map(d => (
          <Text key={d} style={picker.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={picker.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e-${idx}`} style={picker.cell} />;
          const isSelected = isSelectedMonth && day === selectedDay;
          const isToday    = isTodayMonth    && day === todayDay;
          return (
            <TouchableOpacity
              key={day}
              style={[
                picker.cell,
                isSelected && picker.cellSelected,
                !isSelected && isToday && picker.cellToday,
              ]}
              onPress={() => handleSelect(day)}
              activeOpacity={0.7}
            >
              <Text style={[
                picker.cellText,
                isSelected && picker.cellTextSelected,
                !isSelected && isToday && picker.cellTextToday,
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function GoalModal({ visible, editingGoal, goalForm, setGoalForm, onSubmit, onClose, onDelete }) {
  const [showPicker, setShowPicker] = useState(false);
  const [typeMode,   setTypeMode]   = useState(false);

  useEffect(() => {
    if (!visible) { setShowPicker(false); setTypeMode(false); }
  }, [visible]);

  // Parsed display
  const parsed = goalForm.deadline && /^\d{4}-\d{2}-\d{2}$/.test(goalForm.deadline)
    ? new Date(goalForm.deadline + 'T00:00:00')
    : null;
  const displayDate = parsed
    ? parsed.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{editingGoal ? 'Edit Goal' : 'Create Goal'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Emoji picker */}
            <Text style={styles.label}>
              Goal Icon{goalForm.emoji ? ` — ${goalForm.emoji} selected` : ' (optional)'}
            </Text>
            <View style={styles.emojiGrid}>
              {GOAL_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, goalForm.emoji === e && styles.emojiBtnActive]}
                  onPress={() => setGoalForm({ ...goalForm, emoji: goalForm.emoji === e ? '' : e })}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Goal Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Buy a Honda City"
              placeholderTextColor={colors.textMuted}
              value={goalForm.title}
              onChangeText={(v) => setGoalForm({ ...goalForm, title: v })}
            />

            <Text style={styles.label}>Target Amount (₱)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={goalForm.target_amount}
              onChangeText={(v) => setGoalForm({ ...goalForm, target_amount: v })}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Already Saved (₱)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={goalForm.current_amount}
              onChangeText={(v) => setGoalForm({ ...goalForm, current_amount: v })}
              keyboardType="numeric"
            />

            {/* ── Target Date ── */}
            <View style={styles.dateLabelRow}>
              <Text style={styles.label}>Target Date <Text style={styles.optional}>(optional)</Text></Text>
              <TouchableOpacity onPress={() => { setTypeMode(t => !t); setShowPicker(false); }}>
                <Text style={styles.switchMode}>
                  {typeMode ? '📅 Pick from calendar' : '⌨️ Type date'}
                </Text>
              </TouchableOpacity>
            </View>

            {typeMode ? (
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={goalForm.deadline}
                onChangeText={(v) => setGoalForm({ ...goalForm, deadline: v })}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                autoFocus
              />
            ) : (
              <TouchableOpacity
                style={[styles.dateBtn, showPicker && styles.dateBtnActive]}
                onPress={() => setShowPicker(p => !p)}
                activeOpacity={0.8}
              >
                <Calendar size={16} color={displayDate ? colors.primary : colors.textMuted} />
                <Text style={[styles.dateBtnText, !displayDate && styles.dateBtnPlaceholder]}>
                  {displayDate || 'Tap to set a target date'}
                </Text>
                {displayDate && (
                  <TouchableOpacity
                    onPress={() => { setGoalForm({ ...goalForm, deadline: '' }); setShowPicker(false); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.clearDate}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}

            {!typeMode && showPicker && (
              <InlineDatePicker
                value={goalForm.deadline}
                onChange={(v) => setGoalForm({ ...goalForm, deadline: v })}
                onClose={() => setShowPicker(false)}
              />
            )}

            {/* Savings tip */}
            {goalForm.target_amount && goalForm.deadline && parsed ? (
              (() => {
                const remaining = Number(goalForm.target_amount) - Number(goalForm.current_amount || 0);
                const now = new Date();
                const months = Math.max(((parsed - now) / (1000 * 60 * 60 * 24 * 30)).toFixed(1), 1);
                const monthly = remaining > 0 ? (remaining / months).toFixed(2) : 0;
                return remaining > 0 ? (
                  <View style={styles.tipBox}>
                    <Text style={styles.tipText}>
                      💡 Save <Text style={styles.tipBold}>₱{Number(monthly).toLocaleString('en-PH', { minimumFractionDigits: 2 })}/month</Text> to reach your goal by {displayDate}
                    </Text>
                  </View>
                ) : null;
              })()
            ) : null}

            <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
              <Text style={styles.submitText}>{editingGoal ? '💾 Save Changes' : '🎯 Save Goal'}</Text>
            </TouchableOpacity>

            {editingGoal && onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(editingGoal.id)}>
                <Text style={styles.deleteText}>🗑️ Delete Goal</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Picker styles ─────────────────────────────────────────────────────────────
const picker = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
  },
  navTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    marginVertical: 2,
  },
  cellSelected: { backgroundColor: colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: colors.primary },
  cellText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  cellTextSelected: { color: colors.white, fontWeight: '800' },
  cellTextToday: { color: colors.primary, fontWeight: '700' },
});

// ── Modal styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xxl,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  optional: { fontWeight: '400', color: colors.textMuted },

  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  emojiBtn: {
    width: 44, height: 44, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  emojiText: { fontSize: 22 },

  // Date picker
  dateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  switchMode: { fontSize: 12, fontWeight: '600', color: colors.primary },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  dateBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dateBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  dateBtnPlaceholder: { color: colors.textMuted, fontWeight: '400' },
  clearDate: { fontSize: 14, color: colors.textMuted, paddingHorizontal: 4 },

  tipBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  tipText: { fontSize: 13, color: colors.primary, lineHeight: 19 },
  tipBold: { fontWeight: '700' },

  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginBottom: spacing.sm },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  deleteBtn: { borderWidth: 1.5, borderColor: '#ef4444', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginBottom: spacing.sm },
  deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: 15 },
});
