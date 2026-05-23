/**
 * Regret Purchases Tracker
 *
 * Allows users to rate recent expenses as:
 *   👍 Worth It  |  😐 Neutral  |  😬 Regret
 *
 * Then generates emotional spending insights from the pattern.
 * Stored locally via AsyncStorage — no DB changes needed.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useSettings } from '../../lib/SettingsContext';
import { loadRatings, saveRating, analyzeRegrets } from '../../lib/regretStore';
import { getRegretInsight } from '../../lib/coachEngine';
import { toPHDate } from '../../lib/timezone';

const RATING_OPTIONS = [
  { value: 'worth_it', emoji: '👍', label: 'Worth It', color: '#22c55e' },
  { value: 'neutral',  emoji: '😐', label: 'Neutral',  color: '#f59e0b' },
  { value: 'regret',   emoji: '😬', label: 'Regret',   color: '#ef4444' },
];

const fmt = (n) =>
  `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Single Transaction Row ────────────────────────────────────────────────────

function TransactionRatingRow({ transaction, rating, onRate, colors }) {
  const date = toPHDate(transaction.created_at);
  const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.txRow, { borderColor: colors.border }]}>
      <View style={styles.txLeft}>
        <Text style={styles.txEmoji}>{transaction.emoji || '💸'}</Text>
        <View style={styles.txInfo}>
          <Text style={[styles.txDesc, { color: colors.textPrimary }]} numberOfLines={1}>
            {transaction.description || transaction.category}
          </Text>
          <Text style={[styles.txMeta, { color: colors.textMuted }]}>
            {transaction.category} · {dateStr}
          </Text>
        </View>
        <Text style={[styles.txAmount, { color: colors.expense }]}>
          {fmt(transaction.amount)}
        </Text>
      </View>

      {/* Rating buttons */}
      <View style={styles.ratingBtns}>
        {RATING_OPTIONS.map((opt) => {
          const isSelected = rating === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.ratingBtn,
                { borderColor: isSelected ? opt.color : colors.border },
                isSelected && { backgroundColor: opt.color + '20' },
              ]}
              onPress={() => onRate(transaction.id, isSelected ? null : opt.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Analytics Summary ────────────────────────────────────────────────────────

function RegretAnalytics({ analytics, colors }) {
  if (analytics.totalRated === 0) {
    return (
      <View style={[styles.analyticsEmpty, { backgroundColor: colors.primaryLight }]}>
        <Text style={styles.analyticsEmptyIcon}>📊</Text>
        <Text style={[styles.analyticsEmptyText, { color: colors.primary }]}>
          Rate a few purchases to see your spending satisfaction breakdown!
        </Text>
      </View>
    );
  }

  const regretPct = analytics.regretRatio.toFixed(0);
  const worthItPct = ((analytics.worthItCount / analytics.totalRated) * 100).toFixed(0);

  return (
    <View style={styles.analyticsGrid}>
      <View style={[styles.analyticsCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
        <Text style={styles.analyticsCardNum}>{worthItPct}%</Text>
        <Text style={[styles.analyticsCardLabel, { color: '#15803d' }]}>Worth It</Text>
      </View>
      <View style={[styles.analyticsCard, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
        <Text style={styles.analyticsCardNum}>{((analytics.neutralCount / analytics.totalRated) * 100).toFixed(0)}%</Text>
        <Text style={[styles.analyticsCardLabel, { color: '#b45309' }]}>Neutral</Text>
      </View>
      <View style={[styles.analyticsCard, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
        <Text style={styles.analyticsCardNum}>{regretPct}%</Text>
        <Text style={[styles.analyticsCardLabel, { color: '#dc2626' }]}>Regret</Text>
      </View>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RegretSection({ monthTransactions }) {
  const { colors, spacing } = useTheme();
  const { regretTrackerEnabled, coachPersonality } = useSettings();

  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Load stored ratings
  useEffect(() => {
    loadRatings().then((r) => {
      setRatings(r);
      setLoading(false);
    });
  }, []);

  const recentExpenses = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'expense')
        .slice(0, showAll ? 30 : 8),
    [monthTransactions, showAll]
  );

  const analytics = useMemo(
    () => analyzeRegrets(ratings, monthTransactions.filter((t) => t.type === 'expense')),
    [ratings, monthTransactions]
  );

  const handleRate = useCallback(async (txId, rating) => {
    if (rating === null) {
      // Clear rating
      const { [txId]: _, ...rest } = ratings;
      setRatings(rest);
      await saveRating(txId, null);
    } else {
      const next = await saveRating(txId, rating);
      setRatings(next);
    }
  }, [ratings]);

  if (!regretTrackerEnabled) return null;

  return (
    <View style={[styles.wrapper, { marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>SELF-AWARENESS</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            😬 Purchase Regret Tracker
          </Text>
        </View>
        <View style={styles.headerRight}>
          {analytics.totalRated > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {analytics.totalRated} rated
              </Text>
            </View>
          )}
          <Text style={[styles.chevron, { color: colors.textMuted }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Analytics summary */}
          <RegretAnalytics analytics={analytics} colors={colors} />

          {/* AI Coach Insight — replaces static analytics insights */}
          {(() => {
            const coachTake = getRegretInsight({ personality: coachPersonality, analytics });
            if (!coachTake) return null;
            return (
              <View style={[styles.coachInsight, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
                <Text style={styles.coachInsightIcon}>{coachTake.icon}</Text>
                <Text style={[styles.coachInsightText, { color: colors.primary }]}>{coachTake.text}</Text>
              </View>
            );
          })()}

          {/* Rate purchases */}
          <Text style={[styles.ratePrompt, { color: colors.textSecondary }]}>
            Rate your purchases to build spending self-awareness:
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <>
              {recentExpenses.map((tx) => (
                <TransactionRatingRow
                  key={tx.id}
                  transaction={tx}
                  rating={ratings[tx.id]}
                  onRate={handleRate}
                  colors={colors}
                />
              ))}

              {monthTransactions.filter((t) => t.type === 'expense').length > 8 && !showAll && (
                <TouchableOpacity
                  style={[styles.showMoreBtn, { borderColor: colors.border }]}
                  onPress={() => setShowAll(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.showMoreText, { color: colors.primary }]}>
                    Show all expenses
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 12, fontWeight: '700' },

  analyticsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  analyticsCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  analyticsCardNum: { fontSize: 22, fontWeight: '900', color: '#1f2937' },
  analyticsCardLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  analyticsEmpty: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    gap: 10,
  },
  analyticsEmptyIcon: { fontSize: 24 },
  analyticsEmptyText: { flex: 1, fontSize: 13, lineHeight: 19 },

  coachInsight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  coachInsightIcon: { fontSize: 18, marginTop: 1 },
  coachInsightText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },

  ratePrompt: { fontSize: 12, marginBottom: 10, fontStyle: 'italic' },

  txRow: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 10,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txEmoji: { fontSize: 22 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '600' },
  txMeta: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '700' },
  ratingBtns: { flexDirection: 'row', gap: 8, paddingLeft: 32 },
  ratingBtn: {
    width: 40,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingEmoji: { fontSize: 16 },

  showMoreBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  showMoreText: { fontSize: 13, fontWeight: '700' },
});
