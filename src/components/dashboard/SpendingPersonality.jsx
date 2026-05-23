/**
 * Spending Personality Card
 * Shown in the Profile tab.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { computeSpendingPersonality } from '../../lib/spendingPersonality';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

export default function SpendingPersonality({ transactions, budgets, goals }) {
  const [expanded, setExpanded] = useState(false);

  const personality = computeSpendingPersonality({ transactions, budgets, goals });

  if (!personality) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>🧬 Spending Personality</Text>
          <Text style={styles.subtitle}>Needs more data</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>
            Log at least 5 expenses over the last 90 days to reveal your spending personality!
          </Text>
        </View>
      </View>
    );
  }

  const p = personality;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🧬 Spending Personality</Text>
        <Text style={styles.subtitle}>Based on your last 90 days</Text>
      </View>

      {/* Personality badge */}
      <View style={[styles.badge, { backgroundColor: p.colorLight, borderColor: p.color }]}>
        <Text style={styles.badgeEmoji}>{p.emoji}</Text>
        <View style={styles.badgeInfo}>
          <Text style={[styles.badgeName, { color: p.color }]}>{p.name}</Text>
          <Text style={styles.badgeTagline}>{p.tagline}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{p.description}</Text>

      {/* Expand / collapse tips */}
      <TouchableOpacity
        style={[styles.expandBtn, { borderColor: p.color }]}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.expandBtnText, { color: p.color }]}>
          {expanded ? '▲ Hide Tips' : '▼ Show Coaching Tips'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.tipsContainer}>
          {p.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={[styles.tipDot, { color: p.color }]}>●</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.disclaimer}>
        Personality is re-evaluated as you log more transactions.
      </Text>
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
  empty: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyText: { ...typography.body, textAlign: 'center', lineHeight: 20 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  badgeEmoji: { fontSize: 42 },
  badgeInfo: { flex: 1 },
  badgeName: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  badgeTagline: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },

  description: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  expandBtn: {
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  expandBtnText: { fontSize: 12, fontWeight: '600' },

  tipsContainer: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  tipDot: { fontSize: 8, marginTop: 5 },
  tipText: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 19 },

  disclaimer: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
