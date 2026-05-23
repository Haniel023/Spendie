import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { colors, spacing, radius } from '../../lib/theme';

export default function ConfirmModal({ visible, title, message, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <TriangleAlert size={28} color={colors.expense} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={onConfirm}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.xxl },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.xxl, width: '100%', maxWidth: 360, alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.expenseLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xxl },
  actions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  deleteBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.expense, alignItems: 'center' },
  deleteText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
