import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

const ALERT_ICONS = { danger: '⚠️', warning: '🔔', info: '💡', goal: '🎯', success: '🎉' };
const ALERT_BG = {
  danger: colors.dangerLight,
  warning: colors.warningLight,
  info: colors.infoLight,
  goal: colors.goalLight,
  success: colors.successLight,
};
const ALERT_BORDER = {
  danger: colors.danger,
  warning: colors.warning,
  info: colors.info,
  goal: colors.goal,
  success: colors.success,
};

export default function AlertSection({ alerts }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Alerts</Text>
        <Text style={styles.subtitle}>Financial warnings and insights</Text>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No alerts</Text>
          <Text style={styles.emptyText}>Everything looks healthy right now.</Text>
        </View>
      ) : (
        alerts.map((alert, index) => (
          <View
            key={index}
            style={[styles.alertCard, { backgroundColor: ALERT_BG[alert.type] ?? colors.infoLight, borderLeftColor: ALERT_BORDER[alert.type] ?? colors.info }]}
          >
            <Text style={styles.alertIcon}>{ALERT_ICONS[alert.type] ?? '💡'}</Text>
            <Text style={styles.alertMsg}>{alert.message}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  header: { marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.sm, padding: spacing.md, borderLeftWidth: 3, marginBottom: spacing.sm },
  alertIcon: { fontSize: 18 },
  alertMsg: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
});
