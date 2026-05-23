import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

export default function SpacesSection({ spaces, activeSpace, onSelectSpace, onCreateSpace, onDeleteSpace }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Spaces</Text>
          <Text style={styles.subtitle}>Switch between personal and shared budgets</Text>
        </View>
        <View style={styles.headerActions}>
          {activeSpace?.type !== 'personal' && (
            <TouchableOpacity style={styles.dangerBtn} onPress={() => onDeleteSpace(activeSpace.id)}>
              <Text style={styles.dangerBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addBtn} onPress={onCreateSpace}>
            <Plus size={14} color={colors.primary} />
            <Text style={styles.addBtnText}>Space</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
        {spaces.map((space) => {
          const active = activeSpace?.id === space.id;
          return (
            <TouchableOpacity
              key={space.id}
              style={[styles.pill, active && styles.activePill]}
              onPress={() => onSelectSpace(space)}
            >
              <Text style={[styles.pillText, active && styles.activePillText]}>
                {space.emoji || '💰'} {space.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  headerActions: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  dangerBtn: { borderWidth: 1.5, borderColor: colors.expense, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  dangerBtnText: { fontSize: 12, fontWeight: '600', color: colors.expense },
  pills: { flexDirection: 'row' },
  pill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.background, marginRight: spacing.sm, borderWidth: 1.5, borderColor: colors.border },
  activePill: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  activePillText: { color: colors.white, fontWeight: '700' },
});
