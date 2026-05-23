/**
 * AI Coach Section — personality-aware coaching + daily tip + insights feed
 *
 * Personality is changed via the Settings modal (⚙️ in header).
 * Roast personality affects the comment card text and the insights section header label.
 * Insights from insightsEngine are shown at the bottom as a mini-feed.
 */

import { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useSettings } from '../../lib/SettingsContext';
import {
  COACH_PERSONALITIES,
  generateCoachComment,
  getDailyTip,
} from '../../lib/coachEngine';
// roastEngine feed removed — roast personality expressed via comment card + insights only

// ── Insight type → colors ──────────────────────────────────────────────────────

const INSIGHT_COLORS = {
  danger:     { bg: '#fee2e2', border: '#ef4444', title: '#dc2626' },
  warning:    { bg: '#fef3c7', border: '#f59e0b', title: '#b45309' },
  info:       { bg: '#dbeafe', border: '#3b82f6', title: '#1d4ed8' },
  goal:       { bg: '#d1fae5', border: '#10b981', title: '#065f46' },
  success:    { bg: '#dcfce7', border: '#22c55e', title: '#15803d' },
  tip:        { bg: '#f0fdf4', border: '#16a34a', title: '#15803d' },
  prediction: { bg: '#fef9ec', border: '#d97706', title: '#b45309' },
};

// ── Insight Item ──────────────────────────────────────────────────────────────

function InsightItem({ insight }) {
  const c = INSIGHT_COLORS[insight.type] ?? INSIGHT_COLORS.info;
  return (
    <View style={[styles.insightItem, { backgroundColor: c.bg, borderLeftColor: c.border }]}>
      <Text style={styles.insightIcon}>{insight.icon ?? '💡'}</Text>
      <View style={{ flex: 1 }}>
        {insight.title ? (
          <Text style={[styles.insightTitle, { color: c.title }]}>{insight.title}</Text>
        ) : null}
        <Text style={[styles.insightMsg]}>{insight.message}</Text>
      </View>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CoachSection({ monthSummary, budgets, transactions, monthTransactions, insights = [] }) {
  const { colors, spacing, shadow } = useTheme();
  const { coachPersonality } = useSettings();

  const personality = COACH_PERSONALITIES[coachPersonality] ?? COACH_PERSONALITIES.supportive;

  const comment = useMemo(
    () => generateCoachComment({ personality: coachPersonality, monthSummary, budgets, transactions, monthTransactions }),
    [coachPersonality, monthSummary, budgets, transactions, monthTransactions]
  );

  const tip = useMemo(() => getDailyTip(coachPersonality), [coachPersonality]);

  return (
    <View style={[styles.wrapper, { marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>AI COACH</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {personality.emoji} {personality.name}
          </Text>
        </View>
      </View>

      {/* ── Comment card ───────────────────────────────────────────────────── */}
      <View style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }, shadow.card]}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentIcon}>{comment.icon}</Text>
          <Text style={[styles.commentTitle, { color: colors.textPrimary }]}>{comment.title}</Text>
        </View>
        <Text style={[styles.commentText, { color: colors.textSecondary }]}>{comment.text}</Text>
      </View>

      {/* ── Daily tip ──────────────────────────────────────────────────────── */}
      <View style={[styles.tipCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
        <Text style={styles.tipIcon}>{tip.icon}</Text>
        <Text style={[styles.tipText, { color: colors.primary }]} numberOfLines={3}>{tip.text}</Text>
      </View>

      {/* ── Insights feed — label + style vary by personality ─────────────── */}
      {insights.length > 0 && (
        <View style={styles.insightsSection}>
          <Text style={[styles.insightsSectionLabel, { color: colors.textMuted }]}>
            {coachPersonality === 'roast'    ? '🎤 COACH CAUGHT THIS'
            : coachPersonality === 'strict'  ? '📋 DATA REVIEW'
            : coachPersonality === 'analyst' ? '📈 FINANCIAL ANALYSIS'
            : coachPersonality === 'anime'   ? '✨ SENSEI NOTICED'
            : coachPersonality === 'minimal' ? '· NOTES'
            : '💡 SPENDING INSIGHTS'}
          </Text>
          {insights.map((insight, i) => (
            <InsightItem key={i} insight={insight} />
          ))}
          <Text style={[styles.insightsFooter, { color: colors.textMuted }]}>
            Updated based on your latest activity
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {},
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },

  commentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  commentIcon: { fontSize: 24 },
  commentTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  commentText: { fontSize: 14, lineHeight: 21 },

  tipCard: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1.5,
  },
  tipIcon: { fontSize: 18, marginTop: 1 },
  tipText: { fontSize: 13, fontWeight: '600', lineHeight: 19, flex: 1 },

  // Insights section
  insightsSection: { marginTop: 12 },
  insightsSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    marginBottom: 6,
  },
  insightIcon: { fontSize: 18, marginTop: 1 },
  insightTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  insightMsg: { fontSize: 12, color: '#374151', lineHeight: 18 },
  insightsFooter: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
