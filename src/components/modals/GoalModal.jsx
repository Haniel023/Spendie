import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { colors, spacing, radius } from '../../lib/theme';

// Goal emoji presets — users can pick one to personalize their goal
const GOAL_EMOJIS = [
  '🚗','🏠','💻','📱','✈️','🎓','💍','🏖️',
  '🎮','👟','🎸','🐾','👶','💊','🌿','💰',
];

export default function GoalModal({ visible, editingGoal, goalForm, setGoalForm, onSubmit, onClose, onDelete }) {
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

            <Text style={styles.label}>Target Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-12-31  (optional)"
              placeholderTextColor={colors.textMuted}
              value={goalForm.deadline}
              onChangeText={(v) => setGoalForm({ ...goalForm, deadline: v })}
            />

            {/* Quick tip */}
            {goalForm.target_amount && goalForm.deadline ? (
              (() => {
                const remaining = Number(goalForm.target_amount) - Number(goalForm.current_amount || 0);
                const now = new Date();
                const deadline = new Date(goalForm.deadline);
                const months = Math.max(((deadline - now) / (1000 * 60 * 60 * 24 * 30)).toFixed(1), 1);
                const monthly = remaining > 0 ? (remaining / months).toFixed(2) : 0;
                return remaining > 0 ? (
                  <View style={styles.tipBox}>
                    <Text style={styles.tipText}>
                      💡 Save <Text style={styles.tipBold}>₱{monthly}/month</Text> to reach your goal by {goalForm.deadline}
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
  tipBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
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
