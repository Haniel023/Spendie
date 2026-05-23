import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Receipt, ChevronLeft, ChevronRight, Calendar, Pencil } from 'lucide-react-native';
import { colors, spacing, radius } from '../../lib/theme';
import { categoryConfig, BILL_CATEGORIES } from '../../lib/categoryConfig';
import { getPHNow } from '../../lib/timezone';

const ALL_CATEGORIES = Object.keys(categoryConfig);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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

// ── Inline calendar picker ────────────────────────────────────────────────────
function InlineDatePicker({ value, onChange, onClose }) {
  const ph = getPHNow();

  // Seed from existing value, fallback to PH today
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
export default function BillsModal({ visible, billForm, setBillForm, editingBill, onSubmit, onClose, onDelete }) {
  const [showPicker, setShowPicker] = useState(false);
  const [typeMode,   setTypeMode]   = useState(false);  // fallback text input

  // Close picker when modal closes
  useEffect(() => {
    if (!visible) { setShowPicker(false); setTypeMode(false); }
  }, [visible]);

  // When switching to type mode, pre-fill with current value
  const handleTypeChange = (v) => {
    setBillForm({ ...billForm, due_date: v });
  };

  const applyPreset = (preset) => {
    setBillForm({ ...billForm, name: preset.label, emoji: preset.emoji, category: preset.category });
  };

  // Parsed display
  const parsed = billForm.due_date && /^\d{4}-\d{2}-\d{2}$/.test(billForm.due_date)
    ? new Date(billForm.due_date + 'T00:00:00')
    : null;
  const displayDate = parsed
    ? parsed.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const dayOfMonth = parsed ? parsed.getDate() : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Receipt size={20} color={colors.warning} />
            <Text style={styles.title}>{editingBill ? 'Edit Bill' : 'Add Bill / Due Date'}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Bill presets */}
            {!editingBill && (
              <>
                <Text style={styles.label}>Quick Select</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                  {BILL_CATEGORIES.map((preset) => (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetChip, billForm.name === preset.label && styles.presetChipActive]}
                      onPress={() => applyPreset(preset)}
                    >
                      <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                      <Text style={[styles.presetName, billForm.name === preset.label && styles.presetNameActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.label}>Bill Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Meralco Bill, Water, Rent…"
              placeholderTextColor={colors.textMuted}
              value={billForm.name}
              onChangeText={(v) => setBillForm({ ...billForm, name: v })}
            />

            <Text style={styles.label}>Amount (₱)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={billForm.amount}
              onChangeText={(v) => setBillForm({ ...billForm, amount: v })}
              keyboardType="numeric"
            />

            {/* ── Due Date ── */}
            <View style={styles.dueLabelRow}>
              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity onPress={() => { setTypeMode(t => !t); setShowPicker(false); }}>
                <Text style={styles.switchMode}>
                  {typeMode ? '📅 Pick from calendar' : '⌨️ Type date'}
                </Text>
              </TouchableOpacity>
            </View>

            {typeMode ? (
              /* Text input fallback */
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={billForm.due_date}
                onChangeText={handleTypeChange}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                autoFocus
              />
            ) : (
              /* Date display button */
              <TouchableOpacity
                style={[styles.dateBtn, showPicker && styles.dateBtnActive]}
                onPress={() => setShowPicker(p => !p)}
                activeOpacity={0.8}
              >
                <Calendar size={16} color={displayDate ? colors.warning : colors.textMuted} />
                <Text style={[styles.dateBtnText, !displayDate && styles.dateBtnPlaceholder]}>
                  {displayDate || 'Tap to select a date'}
                </Text>
                <ChevronRight
                  size={14}
                  color={colors.textMuted}
                  style={{ transform: [{ rotate: showPicker ? '90deg' : '0deg' }] }}
                />
              </TouchableOpacity>
            )}

            {/* Inline calendar */}
            {!typeMode && showPicker && (
              <InlineDatePicker
                value={billForm.due_date}
                onChange={(v) => setBillForm({ ...billForm, due_date: v })}
                onClose={() => setShowPicker(false)}
              />
            )}

            {/* Recurring day-of-month hint */}
            {billForm.is_recurring && dayOfMonth && (
              <View style={styles.recurringHint}>
                <Text style={styles.recurringHintText}>
                  🔁 Repeats on the <Text style={styles.recurringHintBold}>{dayOfMonth}{ordinal(dayOfMonth)}</Text> of every month
                </Text>
              </View>
            )}

            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={billForm.category}
                onValueChange={(v) => setBillForm({ ...billForm, category: v })}
              >
                {ALL_CATEGORIES.map((c) => (
                  <Picker.Item key={c} label={`${categoryConfig[c]?.icon ?? '✨'} ${c}`} value={c} />
                ))}
              </Picker>
            </View>

            {/* Recurring toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Recurring Bill</Text>
                <Text style={styles.toggleSubLabel}>Auto-repeats on a schedule</Text>
              </View>
              <Switch
                value={billForm.is_recurring}
                onValueChange={(v) => setBillForm({ ...billForm, is_recurring: v })}
                trackColor={{ false: colors.border, true: colors.warningLight }}
                thumbColor={billForm.is_recurring ? colors.warning : colors.textMuted}
              />
            </View>

            {billForm.is_recurring && (
              <>
                <Text style={styles.label}>Repeat Frequency</Text>
                <View style={styles.pickerBox}>
                  <Picker
                    selectedValue={billForm.frequency}
                    onValueChange={(v) => setBillForm({ ...billForm, frequency: v })}
                  >
                    <Picker.Item label="Monthly" value="monthly" />
                    <Picker.Item label="Quarterly" value="quarterly" />
                    <Picker.Item label="Annual" value="annual" />
                  </Picker>
                </View>
              </>
            )}

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Account number, reference, etc."
              placeholderTextColor={colors.textMuted}
              value={billForm.notes}
              onChangeText={(v) => setBillForm({ ...billForm, notes: v })}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Emoji (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="📄"
              placeholderTextColor={colors.textMuted}
              value={billForm.emoji}
              onChangeText={(v) => setBillForm({ ...billForm, emoji: v })}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
              <Text style={styles.submitText}>
                {editingBill ? '💾 Update Bill' : '📅 Save Bill'}
              </Text>
            </TouchableOpacity>

            {editingBill && onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(editingBill.id)}>
                <Text style={styles.deleteText}>🗑️ Delete Bill</Text>
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
    borderColor: colors.warning,
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
  cellSelected: { backgroundColor: colors.warning },
  cellToday: { borderWidth: 1.5, borderColor: colors.warning },
  cellText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  cellTextSelected: { color: colors.white, fontWeight: '800' },
  cellTextToday: { color: colors.warning, fontWeight: '700' },
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
    maxHeight: '92%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },

  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  dueLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  switchMode: { fontSize: 12, fontWeight: '600', color: colors.warning },

  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15,
    color: colors.textPrimary, backgroundColor: colors.background, marginBottom: spacing.md,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  pickerBox: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    marginBottom: spacing.md, backgroundColor: colors.background, overflow: 'hidden',
  },

  // Date button
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
  dateBtnActive: { borderColor: colors.warning, backgroundColor: colors.warningLight },
  dateBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  dateBtnPlaceholder: { color: colors.textMuted, fontWeight: '400' },

  // Recurring hint
  recurringHint: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  recurringHintText: { fontSize: 13, color: colors.textSecondary },
  recurringHintBold: { fontWeight: '700', color: colors.warning },

  presetScroll: { marginBottom: spacing.md },
  presetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background, marginRight: spacing.sm,
  },
  presetChipActive: { borderColor: colors.warning, backgroundColor: colors.warningLight },
  presetEmoji: { fontSize: 18 },
  presetName: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  presetNameActive: { color: colors.textPrimary },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  toggleSubLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  submitBtn: { backgroundColor: colors.warning, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.md },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  deleteBtn: { borderWidth: 1.5, borderColor: '#ef4444', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginBottom: spacing.sm },
  deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: 15 },
});
