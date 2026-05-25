import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Bell, Info, Target, CheckCircle2 } from 'lucide-react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

const ALERT_ICONS = {
  danger:  AlertTriangle,
  warning: Bell,
  info:    Info,
  goal:    Target,
  success: CheckCircle2,
};
const ALERT_BG = {
  danger:  colors.dangerLight,
  warning: colors.warningLight,
  info:    colors.infoLight,
  goal:    colors.goalLight,
  success: colors.successLight,
};
const ALERT_BORDER = {
  danger:  colors.danger,
  warning: colors.warning,
  info:    colors.info,
  goal:    colors.goal,
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
          <View style={styles.emptyIconWrap}>
            <CheckCircle2 size={28} color={colors.success} />
          </View>
          <Text style={styles.emptyTitle}>No alerts</Text>
          <Text style={styles.emptyText}>Everything looks healthy right now.</Text>
        </View>
      ) : (
        alerts.map((alert, index) => {
          const IconComp = ALERT_ICONS[alert.type] ?? Info;
          const borderColor = ALERT_BORDER[alert.type] ?? colors.info;
          return (
            <View
              key={index}
              style={[styles.alertCard, { backgroundColor: ALERT_BG[alert.type] ?? colors.infoLight, borderLeftColor: borderColor }]}
            >
              <View style={[styles.alertIconWrap, { backgroundColor: borderColor + '22' }]}>
                <IconComp size={14} color={borderColor} />
              </View>
              <Text style={styles.alertMsg}>{alert.message}</Text>
            </View>
          );
        })
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
  emptyIconWrap: { marginBottom: spacing.sm, opacity: 0.7 },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.sm, padding: spacing.md, borderLeftWidth: 3, marginBottom: spacing.sm },
  alertIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  alertMsg: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
});
