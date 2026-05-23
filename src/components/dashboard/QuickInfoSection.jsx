import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

export default function QuickInfoSection({ activeSpace }) {
  return (
    <View style={styles.grid}>
      <View style={styles.miniCard}>
        <Text style={styles.label}>Current Space</Text>
        <Text style={styles.value}>{activeSpace?.name || 'No Space'}</Text>
      </View>
      <View style={styles.miniCard}>
        <Text style={styles.label}>Space Type</Text>
        <Text style={styles.value}>{activeSpace?.type || '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.sm, gap: spacing.sm },
  miniCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, ...shadow.card },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
});
