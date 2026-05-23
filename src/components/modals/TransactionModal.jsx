import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, radius } from '../../lib/theme';

const CATEGORIES = ['Food', 'Transportation', 'Salary', 'Bills', 'Shopping', 'Games', 'Savings', 'Other'];

const EMOJIS = [
  '💼', '💰', '💵', '🏦', '📈', '💳',
  '🍔', '🍕', '🍜', '☕', '🥡', '🧃',
  '🚗', '🚌', '✈️', '🛵', '⛽', '🚂',
  '🛍️', '👗', '💻', '📱', '🎁', '👟',
  '🏠', '💡', '💧', '📺', '🌐', '🎬',
  '🎮', '🎵', '🏋️', '💊', '🐾', '🎉',
];

export default function TransactionModal({ visible, editingTransaction, transactionForm, setTransactionForm, onSubmit, onClose, onDelete }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Type</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={transactionForm.type}
                onValueChange={(v) => setTransactionForm({ ...transactionForm, type: v })}
              >
                <Picker.Item label="Expense" value="expense" />
                <Picker.Item label="Income" value="income" />
              </Picker>
            </View>

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={transactionForm.amount}
              onChangeText={(v) => setTransactionForm({ ...transactionForm, amount: v })}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={transactionForm.category}
                onValueChange={(v) => setTransactionForm({ ...transactionForm, category: v })}
              >
                <Picker.Item label="Select Category" value="" />
                {CATEGORIES.map((c) => <Picker.Item key={c} label={c} value={c} />)}
              </Picker>
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional description"
              placeholderTextColor={colors.textMuted}
              value={transactionForm.description}
              onChangeText={(v) => setTransactionForm({ ...transactionForm, description: v })}
            />

            <Text style={styles.label}>
              Emoji{transactionForm.emoji ? ` — ${transactionForm.emoji} selected` : ' (optional)'}
            </Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiBtn, transactionForm.emoji === emoji && styles.activeEmojiBtn]}
                  onPress={() => setTransactionForm({
                    ...transactionForm,
                    emoji: transactionForm.emoji === emoji ? '' : emoji,
                  })}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
              <Text style={styles.submitText}>{editingTransaction ? '💾 Save Changes' : '✅ Save Transaction'}</Text>
            </TouchableOpacity>

            {editingTransaction && onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDelete(editingTransaction.id)}
              >
                <Text style={styles.deleteText}>🗑️ Delete Transaction</Text>
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
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40, maxHeight: '90%' },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.background, marginBottom: spacing.md },
  pickerBox: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.md, backgroundColor: colors.background, overflow: 'hidden' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  emojiBtn: { width: 44, height: 44, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  activeEmojiBtn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  emojiText: { fontSize: 22 },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginBottom: spacing.sm },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  deleteBtn: { borderWidth: 1.5, borderColor: '#ef4444', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginBottom: spacing.sm },
  deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: 15 },
});
