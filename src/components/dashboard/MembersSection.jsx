import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

export default function MembersSection({ activeSpace, members, onInvite }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Members</Text>
          <Text style={styles.subtitle}>People who can access this space</Text>
        </View>
        {activeSpace?.type === 'shared' && (
          <TouchableOpacity style={styles.addBtn} onPress={onInvite}>
            <Plus size={14} color={colors.primary} />
            <Text style={styles.addBtnText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      {members.map((member) => (
        <View key={member.id} style={styles.memberCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {member.profiles?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>{member.profiles?.full_name}</Text>
            <Text style={styles.email}>{member.profiles?.email}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  name: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  email: { fontSize: 12, color: colors.textSecondary },
});
