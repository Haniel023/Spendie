import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Receipt } from 'lucide-react-native';
import { colors, spacing, radius } from '../../lib/theme';
import { categoryConfig, BILL_CATEGORIES } from '../../lib/categoryConfig';

const ALL_CATEGORIES = Object.keys(categoryConfig);

export default function BillsModal({ visible, billForm, setBillForm, editingBill, onSubmit, onClose, onDelete }) {
  const applyPreset = (preset) => {
    setBillForm({
      ...billForm,
      name: preset.label,
      emoji: preset.emoji,
      category: preset.category,
    });
  };

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
                      style={[
                        styles.presetChip,
                        billForm.name === preset.label && styles.presetChipActive,
                      ]}
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

            <Text style={styles.label}>Due Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={billForm.due_date}
              onChangeText={(v) => setBillForm({ ...billForm, due_date: v })}
            />

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
                <Text style={styles.toggleSubLabel}>Auto-repeats every month</Text>
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
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15,
    color: colors.textPrimary, backgroundColor: colors.background, marginBottom: spacing.md,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  pickerBox: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.md, backgroundColor: colors.background, overflow: 'hidden' },

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
