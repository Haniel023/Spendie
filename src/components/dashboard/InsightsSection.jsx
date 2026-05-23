import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

const TYPE_BG = {
  danger:     colors.dangerLight,
  warning:    colors.warningLight,
  info:       colors.infoLight,
  goal:       colors.goalLight,
  success:    colors.successLight,
  tip:        '#f0fdf4',
  prediction: '#fef9ec',
};

const TYPE_BORDER = {
  danger:     colors.danger,
  warning:    colors.warning,
  info:       colors.info,
  goal:       colors.goal,
  success:    colors.success,
  tip:        '#16a34a',
  prediction: '#d97706',
};

const TYPE_TITLE_COLOR = {
  danger:     colors.danger,
  warning:    '#b45309',
  info:       colors.info,
  goal:       colors.goal,
  success:    '#15803d',
  tip:        '#15803d',
  prediction: '#b45309',
};

export default function InsightsSection({ insights }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 AI Finance Coach</Text>
        <Text style={styles.subtitle}>Personalized insights just for you</Text>
      </View>

      {insights.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>Your coach is ready</Text>
          <Text style={styles.emptyText}>
            Add a few transactions and your AI Finance Coach will start giving you personalized tips.
          </Text>
        </View>
      ) : (
        insights.map((insight, index) => {
          const bg     = TYPE_BG[insight.type]     ?? colors.infoLight;
          const border = TYPE_BORDER[insight.type] ?? colors.info;
          const titleC = TYPE_TITLE_COLOR[insight.type] ?? colors.textPrimary;

          return (
            <View
              key={index}
              style={[styles.insightCard, { backgroundColor: bg, borderLeftColor: border }]}
            >
              <Text style={styles.insightIcon}>{insight.icon ?? '💡'}</Text>
              <View style={styles.insightBody}>
                {insight.title ? (
                  <Text style={[styles.insightTitle, { color: titleC }]}>{insight.title}</Text>
                ) : null}
                <Text style={styles.insightMsg}>{insight.message}</Text>
              </View>
            </View>
          );
        })
      )}

      {insights.length > 0 && (
        <Text style={styles.footer}>Updated based on your latest activity</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  header: { marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center', lineHeight: 20 },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    marginBottom: spacing.sm,
  },
  insightIcon: { fontSize: 20, marginTop: 1 },
  insightBody: { flex: 1 },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  insightMsg: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  footer: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
