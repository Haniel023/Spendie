import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { RefreshCw, Zap } from 'lucide-react-native';
import { colors, spacing, radius } from '../../lib/theme';
import { categoryConfig, KNOWN_SUBSCRIPTIONS } from '../../lib/categoryConfig';

const CATEGORIES = Object.keys(categoryConfig);

const EMOJIS = [
  '💼', '💰', '💵', '🏦', '📈', '💳',
  '🍔', '🍕', '🍜', '☕', '🥡', '🧃',
  '🚗', '🚌', '✈️', '🛵', '⛽', '🚂',
  '🛍️', '👗', '💻', '📱', '🎁', '👟',
  '🏠', '💡', '💧', '📺', '🌐', '🎬',
  '🎮', '🎵', '🏋️', '💊', '🐾', '🎉',
];

// Ordinal suffix helper (1st, 2nd, 3rd, 4th…)
function ordinal(n) {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Detect subscription from description
function detectSubscription(desc) {
  if (!desc) return null;
  const lower = desc.toLowerCase();
  return KNOWN_SUBSCRIPTIONS.find((s) => lower.includes(s.name.toLowerCase())) ?? null;
}

/**
 * Props:
 *   visible         — boolean
 *   recurringForm   — form state object
 *   setRecurringForm — form state setter
 *   onSubmit        — called on save (handles both insert & update in DashboardScreen)
 *   onClose         — called to close modal
 *   isEditing       — boolean, true when editing an existing recurring transaction
 */
export default function RecurringModal({ visible, recurringForm, setRecurringForm, onSubmit, onClose, onDelete, isEditing = false }) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'presets'

  const applyPreset = (svc) => {
    setRecurringForm({
      ...recurringForm,
      description: svc.name,
      emoji: svc.emoji,
      category: 'Subscriptions',
      type: 'expense',
      frequency: 'monthly',
      is_subscription: true,
    });
    setActiveTab('manual');
  };

  const handleDescChange = (v) => {
    const detected = detectSubscription(v);
    setRecurringForm({
      ...recurringForm,
      description: v,
      ...(detected ? { emoji: detected.emoji, category: 'Subscriptions', is_subscription: true } : {}),
    });
  };

  const isSubscription = recurringForm.is_subscription || recurringForm.category === 'Subscriptions';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <RefreshCw size={20} color={colors.primary} />
            <Text style={styles.title}>
              {isEditing ? 'Edit Recurring' : 'Recurring Transaction'}
            </Text>
          </View>

          {/* Tab toggle — hidden when editing (no need for presets while editing) */}
          {!isEditing && (
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
                onPress={() => setActiveTab('manual')}
              >
                <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>
                  ✏️ Manual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'presets' && styles.activeTab]}
                onPress={() => setActiveTab('presets')}
              >
                <Text style={[styles.tabText, activeTab === 'presets' && styles.activeTabText]}>
                  ⚡ Quick Subscriptions
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* ── Presets Tab ─────────────────────────────────────────── */}
            {activeTab === 'presets' && (
              <View>
                <Text style={styles.presetsHint}>
                  Tap a service to pre-fill the form automatically
                </Text>
                <View style={styles.presetGrid}>
                  {KNOWN_SUBSCRIPTIONS.map((svc) => (
                    <TouchableOpacity
                      key={svc.name}
                      style={[
                        styles.presetChip,
                        recurringForm.description === svc.name && styles.presetChipActive,
                      ]}
                      onPress={() => applyPreset(svc)}
                    >
                      <Text style={styles.presetEmoji}>{svc.emoji}</Text>
                      <Text style={styles.presetName}>{svc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── Manual / Edit Tab ────────────────────────────────────── */}
            {activeTab === 'manual' && (
              <>
                {/* Subscription toggle */}
                <View style={[styles.subscriptionBanner, isSubscription && styles.subscriptionBannerActive]}>
                  <View style={styles.subscriptionBannerLeft}>
                    <Text style={styles.subBannerIcon}>📦</Text>
                    <View>
                      <Text style={[styles.subBannerTitle, isSubscription && { color: colors.primary }]}>
                        Mark as Subscription
                      </Text>
                      <Text style={styles.subBannerDesc}>
                        Shows in subscription dashboard & reminders
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isSubscription}
                    onValueChange={(v) => setRecurringForm({
                      ...recurringForm,
                      is_subscription: v,
                      category: v ? 'Subscriptions' : recurringForm.category,
                    })}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={isSubscription ? colors.primary : colors.textMuted}
                  />
                </View>

                <Text style={styles.label}>Type</Text>
                <View style={styles.pickerBox}>
                  <Picker
                    selectedValue={recurringForm.type}
                    onValueChange={(v) => setRecurringForm({ ...recurringForm, type: v })}
                  >
                    <Picker.Item label="Expense" value="expense" />
                    <Picker.Item label="Income" value="income" />
                  </Picker>
                </View>

                <Text style={styles.label}>Amount (₱)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  value={recurringForm.amount}
                  onChangeText={(v) => setRecurringForm({ ...recurringForm, amount: v })}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Netflix, Spotify, Internet…"
                  placeholderTextColor={colors.textMuted}
                  value={recurringForm.description}
                  onChangeText={handleDescChange}
                />
                {/* Auto-detection hint */}
                {detectSubscription(recurringForm.description) && (
                  <View style={styles.detectedBadge}>
                    <Zap size={12} color={colors.primary} />
                    <Text style={styles.detectedText}>
                      Auto-detected: {detectSubscription(recurringForm.description)?.name} — marked as subscription
                    </Text>
                  </View>
                )}

                <Text style={styles.label}>Category</Text>
                <View style={styles.pickerBox}>
                  <Picker
                    selectedValue={recurringForm.category}
                    onValueChange={(v) => setRecurringForm({ ...recurringForm, category: v })}
                  >
                    <Picker.Item label="Select Category" value="" />
                    {CATEGORIES.map((c) => (
                      <Picker.Item key={c} label={`${categoryConfig[c]?.icon ?? '✨'} ${c}`} value={c} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>Frequency</Text>
                <View style={styles.freqRow}>
                  {[
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Semi-Monthly', value: 'semi_monthly' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.freqBtn, recurringForm.frequency === opt.value && styles.freqBtnActive]}
                      onPress={() => setRecurringForm({ ...recurringForm, frequency: opt.value })}
                    >
                      <Text style={[styles.freqBtnText, recurringForm.frequency === opt.value && styles.freqBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Monthly: pick day of month ───────────────────── */}
                {recurringForm.frequency === 'monthly' && (
                  <>
                    <Text style={styles.label}>Day of Month</Text>
                    <View style={styles.dayGrid}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.dayBtn,
                            recurringForm.recurring_day === String(d) && styles.dayBtnActive,
                          ]}
                          onPress={() => setRecurringForm({ ...recurringForm, recurring_day: String(d) })}
                        >
                          <Text style={[
                            styles.dayBtnText,
                            recurringForm.recurring_day === String(d) && styles.dayBtnTextActive,
                          ]}>
                            {d}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {recurringForm.recurring_day ? (
                      <View style={styles.dateSummaryBox}>
                        <Text style={styles.dateSummaryText}>
                          📅 Runs on the <Text style={{ fontWeight: '800' }}>{recurringForm.recurring_day}{ordinal(Number(recurringForm.recurring_day))}</Text> of every month
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}

                {/* ── Weekly: pick day of week ─────────────────────── */}
                {recurringForm.frequency === 'weekly' && (
                  <>
                    <Text style={styles.label}>Day of Week</Text>
                    <View style={styles.freqRow}>
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, idx) => (
                        <TouchableOpacity
                          key={day}
                          style={[styles.freqBtn, recurringForm.recurring_weekday === String(idx) && styles.freqBtnActive]}
                          onPress={() => setRecurringForm({ ...recurringForm, recurring_weekday: String(idx) })}
                        >
                          <Text style={[styles.freqBtnText, recurringForm.recurring_weekday === String(idx) && styles.freqBtnTextActive]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {recurringForm.recurring_weekday !== undefined && recurringForm.recurring_weekday !== '' ? (
                      <View style={styles.dateSummaryBox}>
                        <Text style={styles.dateSummaryText}>
                          📅 Runs every <Text style={{ fontWeight: '800' }}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][Number(recurringForm.recurring_weekday)]}</Text>
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}

                {/* ── Semi-monthly: pick two days ──────────────────── */}
                {recurringForm.frequency === 'semi_monthly' && (
                  <>
                    <Text style={styles.label}>Two Days of Month</Text>
                    <View style={styles.twoCol}>
                      <TextInput
                        style={[styles.input, styles.halfInput]}
                        placeholder="1st day (e.g. 15)"
                        placeholderTextColor={colors.textMuted}
                        value={recurringForm.recurring_day_1}
                        onChangeText={(v) => setRecurringForm({ ...recurringForm, recurring_day_1: v })}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.input, styles.halfInput]}
                        placeholder="2nd day (e.g. 30)"
                        placeholderTextColor={colors.textMuted}
                        value={recurringForm.recurring_day_2}
                        onChangeText={(v) => setRecurringForm({ ...recurringForm, recurring_day_2: v })}
                        keyboardType="numeric"
                      />
                    </View>
                    {recurringForm.recurring_day_1 && recurringForm.recurring_day_2 ? (
                      <View style={styles.dateSummaryBox}>
                        <Text style={styles.dateSummaryText}>
                          📅 Runs on the <Text style={{ fontWeight: '800' }}>{recurringForm.recurring_day_1}{ordinal(Number(recurringForm.recurring_day_1))}</Text> and <Text style={{ fontWeight: '800' }}>{recurringForm.recurring_day_2}{ordinal(Number(recurringForm.recurring_day_2))}</Text> of every month
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}

                <Text style={styles.label}>
                  Emoji{recurringForm.emoji ? ` — ${recurringForm.emoji}` : ' (optional)'}
                </Text>
                <View style={styles.emojiGrid}>
                  {EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[styles.emojiBtn, recurringForm.emoji === emoji && styles.activeEmojiBtn]}
                      onPress={() => setRecurringForm({
                        ...recurringForm,
                        emoji: recurringForm.emoji === emoji ? '' : emoji,
                      })}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
              <Text style={styles.submitText}>
                {isEditing
                  ? '💾 Update Recurring'
                  : isSubscription
                    ? '📦 Save Subscription'
                    : '🔁 Save Recurring'}
              </Text>
            </TouchableOpacity>

            {isEditing && onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                <Text style={styles.deleteText}>🗑️ Delete Recurring</Text>
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

  tabs: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radius.md, padding: 4, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  activeTab: { backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  activeTabText: { color: colors.textPrimary },

  presetsHint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md, textAlign: 'center' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  presetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  presetChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  presetEmoji: { fontSize: 18 },
  presetName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },

  subscriptionBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  subscriptionBannerActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  subscriptionBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  subBannerIcon: { fontSize: 22 },
  subBannerTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  subBannerDesc: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  detectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.sm, marginTop: -spacing.sm, marginBottom: spacing.sm,
  },
  detectedText: { fontSize: 11, color: colors.primary, fontWeight: '600', flex: 1 },

  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15,
    color: colors.textPrimary, backgroundColor: colors.background, marginBottom: spacing.md,
  },
  pickerBox: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.md, backgroundColor: colors.background, overflow: 'hidden' },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  halfInput: { flex: 1 },

  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  freqBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
  },
  freqBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  freqBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  freqBtnTextActive: { color: colors.primary },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  emojiBtn: { width: 44, height: 44, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  activeEmojiBtn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  emojiText: { fontSize: 22 },

  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  dayBtn: {
    width: 38, height: 38, borderRadius: radius.sm, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
  },
  dayBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dayBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  dayBtnTextActive: { color: colors.primary },

  dateSummaryBox: {
    backgroundColor: colors.primaryLight, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.md,
  },
  dateSummaryText: { fontSize: 12, color: colors.primary, lineHeight: 18 },

  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.md },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  deleteBtn: { borderWidth: 1.5, borderColor: '#ef4444', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginBottom: spacing.sm },
  deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: 15 },
});
