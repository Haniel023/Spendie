/**
 * SubscriptionModal — add a subscription / recurring service
 *
 * Simple form: service name, amount, category, frequency, next renewal date.
 * Saves to recurring_transactions with is_subscription = true.
 *
 * Props:
 *   visible        boolean
 *   subForm        object
 *   setSubForm     fn
 *   onSubmit       fn
 *   onClose        fn
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { X, Check, RefreshCw, Calendar, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { getPHNow } from '../../lib/timezone';

const FREQUENCIES = [
  { value: 'daily',        label: 'Daily'       },
  { value: 'weekly',       label: 'Weekly'      },
  { value: 'monthly',      label: 'Monthly'     },
  { value: 'semi_monthly', label: 'Twice/month' },
  { value: 'annual',       label: 'Yearly'      },
];

const CATEGORIES = [
  'Subscriptions', 'Entertainment', 'Internet', 'Utilities',
  'Insurance', 'Health', 'Education', 'Shopping', 'Other',
];

const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_HDR     = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function buildCells(year, month) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

// ── Inline calendar picker ────────────────────────────────────────────────────
function InlineDatePicker({ value, onChange, onClose, colors }) {
  const ph   = getPHNow();
  const seed = value ? new Date(value + 'T00:00:00') : ph;

  const [pMonth, setPMonth] = useState(seed.getMonth());
  const [pYear,  setPYear]  = useState(seed.getFullYear());

  const selectedDay   = value ? new Date(value + 'T00:00:00').getDate()      : null;
  const selectedMonth = value ? new Date(value + 'T00:00:00').getMonth()     : null;
  const selectedYear  = value ? new Date(value + 'T00:00:00').getFullYear()  : null;

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

  const cells             = buildCells(pYear, pMonth);
  const isSelectedMonth   = pMonth === selectedMonth && pYear === selectedYear;
  const isTodayMonth      = pMonth === todayMonth    && pYear === todayYear;

  return (
    <View style={[cal.wrap, { borderColor: colors.primary, backgroundColor: colors.background }]}>
      {/* Month / Year nav */}
      <View style={cal.nav}>
        <TouchableOpacity onPress={goPrev} style={[cal.navBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <ChevronLeft size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[cal.navTitle, { color: colors.textPrimary }]}>{MONTHS[pMonth]} {pYear}</Text>
        <TouchableOpacity onPress={goNext} style={[cal.navBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <ChevronRight size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={cal.weekRow}>
        {DAYS_HDR.map(d => (
          <Text key={d} style={[cal.weekDay, { color: colors.textMuted }]}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e-${idx}`} style={cal.cell} />;
          const isSelected = isSelectedMonth && day === selectedDay;
          const isToday    = isTodayMonth    && day === todayDay;
          return (
            <TouchableOpacity
              key={day}
              style={[
                cal.cell,
                isSelected && [cal.cellSelected, { backgroundColor: colors.primary }],
                !isSelected && isToday && [cal.cellToday, { borderColor: colors.primary }],
              ]}
              onPress={() => handleSelect(day)}
              activeOpacity={0.7}
            >
              <Text style={[
                cal.cellText,
                { color: colors.textSecondary },
                isSelected && { color: '#fff', fontWeight: '700' },
                !isSelected && isToday && { color: colors.primary, fontWeight: '700' },
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

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ label, active, onPress, activeColor, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.chip,
        {
          borderColor:     active ? activeColor : colors.border,
          backgroundColor: active ? activeColor + '18' : colors.background,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? activeColor : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function SubscriptionModal({ visible, subForm, setSubForm, editingSub, onSubmit, onDelete, onClose }) {
  const { colors }          = useTheme();
  const set                 = (key, val) => setSubForm((f) => ({ ...f, [key]: val }));
  const isEditing           = !!editingSub;

  const [showPicker, setShowPicker] = useState(false);
  const [typeMode,   setTypeMode]   = useState(false);

  // Reset picker state when modal closes
  useEffect(() => {
    if (!visible) { setShowPicker(false); setTypeMode(false); }
  }, [visible]);

  // Parsed display date
  const parsed      = subForm.next_run && /^\d{4}-\d{2}-\d{2}$/.test(subForm.next_run)
    ? new Date(subForm.next_run + 'T00:00:00')
    : null;
  const displayDate = parsed
    ? parsed.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kavWrap}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>

            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <RefreshCw size={16} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  {isEditing ? 'Edit Subscription' : 'Add Subscription'}
                </Text>
              </View>
              <View style={styles.headerRight}>
                {isEditing && onDelete && (
                  <TouchableOpacity
                    onPress={onDelete}
                    style={[styles.deleteBtn, { backgroundColor: '#fee2e2' }]}
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                  <X size={15} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

              {/* Service name */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Service Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. Netflix, Spotify, Gym..."
                placeholderTextColor={colors.textMuted}
                value={subForm.description}
                onChangeText={(v) => set('description', v)}
              />

              {/* Amount */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
              <TextInput
                style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="₱0.00"
                placeholderTextColor={colors.textMuted}
                value={subForm.amount}
                onChangeText={(v) => set('amount', v)}
                keyboardType="decimal-pad"
              />

              {/* Billing Cycle */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Billing Cycle</Text>
              <View style={styles.chipRow}>
                {FREQUENCIES.map((f) => (
                  <Chip
                    key={f.value}
                    label={f.label}
                    active={subForm.frequency === f.value}
                    onPress={() => set('frequency', f.value)}
                    activeColor={colors.primary}
                    colors={colors}
                  />
                ))}
              </View>

              {/* Next Renewal Date */}
              <View style={styles.dateLabelRow}>
                <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Next Renewal Date</Text>
                <TouchableOpacity onPress={() => { setTypeMode(t => !t); setShowPicker(false); }}>
                  <Text style={[styles.switchMode, { color: colors.primary }]}>
                    {typeMode ? '📅 Pick from calendar' : '⌨️ Type date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {typeMode ? (
                /* Text input fallback */
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary, marginTop: 8 }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={subForm.next_run}
                  onChangeText={(v) => set('next_run', v)}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                  autoFocus
                />
              ) : (
                /* Date display button */
                <TouchableOpacity
                  style={[
                    styles.dateBtn,
                    { backgroundColor: colors.background, borderColor: showPicker ? colors.primary : colors.border },
                  ]}
                  onPress={() => setShowPicker(p => !p)}
                  activeOpacity={0.8}
                >
                  <Calendar size={15} color={displayDate ? colors.primary : colors.textMuted} />
                  <Text style={[styles.dateBtnText, { color: displayDate ? colors.textPrimary : colors.textMuted }]}>
                    {displayDate || 'Tap to select a date'}
                  </Text>
                  <ChevronRight
                    size={13}
                    color={colors.textMuted}
                    style={{ transform: [{ rotate: showPicker ? '90deg' : '0deg' }] }}
                  />
                </TouchableOpacity>
              )}

              {/* Inline calendar */}
              {!typeMode && showPicker && (
                <InlineDatePicker
                  value={subForm.next_run}
                  onChange={(v) => set('next_run', v)}
                  onClose={() => setShowPicker(false)}
                  colors={colors}
                />
              )}

              {/* Category */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
              <View style={styles.chipGrid}>
                {CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    active={subForm.category === cat}
                    onPress={() => set('category', cat)}
                    activeColor={colors.primary}
                    colors={colors}
                  />
                ))}
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={onSubmit}
                activeOpacity={0.85}
              >
                <Check size={16} color="#fff" strokeWidth={3} />
                <Text style={styles.saveBtnText}>
                  {isEditing ? 'Save Changes' : 'Add Subscription'}
                </Text>
              </TouchableOpacity>

            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  kavWrap:  { justifyContent: 'flex-end' },
  sheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingTop: 12 },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 4,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  deleteBtn:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },

  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 4 },

  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, marginBottom: 16,
  },
  amountInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 20, fontWeight: '700',
    marginBottom: 16,
  },

  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  chipText: { fontSize: 12 },

  dateLabelRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8, marginTop: 4,
  },
  switchMode: { fontSize: 11, fontWeight: '600' },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 10,
  },
  dateBtnText: { flex: 1, fontSize: 14 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ── Calendar styles ───────────────────────────────────────────────────────────
const cal = StyleSheet.create({
  wrap: {
    borderWidth: 1.5, borderRadius: 14,
    padding: 12, marginBottom: 14,
  },
  nav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  navBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  navTitle: { fontSize: 14, fontWeight: '700' },
  weekRow:  { flexDirection: 'row', marginBottom: 4 },
  weekDay: {
    flex: 1, textAlign: 'center',
    fontSize: 11, fontWeight: '600',
    paddingVertical: 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  cellSelected: { borderRadius: 20 },
  cellToday:    { borderWidth: 1.5, borderRadius: 20 },
  cellText:     { fontSize: 13 },
  cellTextSelected: {},
  cellTextToday:    {},
});
