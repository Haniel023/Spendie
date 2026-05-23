import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, radius } from '../../lib/theme';

const CATEGORIES = ['Food', 'Transportation', 'Bills', 'Shopping', 'Games', 'Savings', 'Other'];

export default function BudgetModal({ visible, editingBudget, budgetForm, setBudgetForm, onSubmit, onClose, onDelete }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{editingBudget ? 'Edit Budget' : 'Create Budget'}</Text>

          <Text style={styles.label}>Budget Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. H&M, Groceries, Shopee"
            placeholderTextColor={colors.textMuted}
            value={budgetForm.title}
            onChangeText={(v) => setBudgetForm({ ...budgetForm, title: v })}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={budgetForm.category}
              onValueChange={(v) => setBudgetForm({ ...budgetForm, category: v })}
            >
              <Picker.Item label="Select Category" value="" />
              {CATEGORIES.map((c) => <Picker.Item key={c} label={c} value={c} />)}
            </Picker>
          </View>

          <Text style={styles.label}>Monthly Limit</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={budgetForm.monthly_limit}
            onChangeText={(v) => setBudgetForm({ ...budgetForm, monthly_limit: v })}
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
            <Text style={styles.submitText}>{editingBudget ? '💾 Save Changes' : '🎯 Save Budget'}</Text>
          </TouchableOpacity>

          {editingBudget && onDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(editingBudget.id)}>
              <Text style={styles.deleteText}>🗑️ Delete Budget</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.background, marginBottom: spacing.md },
  pickerBox: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.md, backgroundColor: colors.background, overflow: 'hidden' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginBottom: spacing.sm },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  deleteBtn: { borderWidth: 1.5, borderColor: '#ef4444', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginBottom: spacing.sm },
  deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: 15 },
});
