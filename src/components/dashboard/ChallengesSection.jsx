/**
 * Community Challenges Section
 *
 * Browse and join finance challenges. Progress is tracked
 * automatically from transaction data.
 */

import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable,
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useSettings } from '../../lib/SettingsContext';
import { CHALLENGES, computeChallengeProgress } from '../../lib/challengesData';

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }) {
  return (
    <View style={styles.progressBg}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.min(100, pct)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

// ── Challenge Card ─────────────────────────────────────────────────────────────

function ChallengeCard({ challenge, joined, progress, onJoin, onLeave, colors }) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: joined ? colors.primary : colors.border },
        joined && { borderWidth: 2 },
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardEmoji}>{challenge.emoji}</Text>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{challenge.title}</Text>
            <View style={[styles.diffBadge, { backgroundColor: challenge.difficultyColor + '20' }]}>
              <Text style={[styles.diffText, { color: challenge.difficultyColor }]}>
                {challenge.difficulty}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {challenge.description}
          </Text>
        </View>
      </View>

      {/* Progress (if joined) */}
      {joined && progress && (
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{progress.label}</Text>
            <Text style={[styles.progressPct, { color: progress.completed ? colors.success : colors.primary }]}>
              {progress.completed ? '✅ Complete!' : `${Math.round(progress.pct)}%`}
            </Text>
          </View>
          <ProgressBar pct={progress.pct} color={progress.completed ? colors.success : colors.primary} />
          {progress.daysLeft > 0 && !progress.completed && (
            <Text style={[styles.daysLeft, { color: colors.textMuted }]}>
              {progress.daysLeft} day{progress.daysLeft !== 1 ? 's' : ''} left
            </Text>
          )}
        </View>
      )}

      {/* Reward */}
      <View style={styles.rewardRow}>
        <Text style={styles.rewardEmoji}>{challenge.rewardEmoji}</Text>
        <Text style={[styles.rewardText, { color: colors.textMuted }]}>
          Reward: {challenge.reward}
        </Text>
      </View>

      {/* Tip */}
      <View style={[styles.tipRow, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.tipText, { color: colors.primary }]}>💡 {challenge.tip}</Text>
      </View>

      {/* Action button */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          { backgroundColor: joined ? colors.expenseLight : colors.primary },
        ]}
        onPress={() => joined ? onLeave(challenge.id) : onJoin(challenge.id)}
        activeOpacity={0.8}
      >
        <Text style={[styles.actionBtnText, { color: joined ? colors.expense : '#fff' }]}>
          {joined ? (progress?.completed ? '🏆 Completed!' : '🚪 Leave Challenge') : '⚡ Join Challenge'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ChallengesSection({ transactions, budgets }) {
  const { colors, spacing } = useTheme();
  const { joinedChallenges, challengeProgress, joinChallenge, leaveChallenge } = useSettings();
  const [expanded, setExpanded] = useState(false);

  // Compute progress for all joined challenges
  const progressMap = useMemo(() => {
    const map = {};
    joinedChallenges.forEach((id) => {
      const challenge = CHALLENGES.find((c) => c.id === id);
      const prog = challengeProgress[id];
      if (challenge && prog) {
        map[id] = computeChallengeProgress(challenge, prog.joinedAt, transactions, budgets);
      }
    });
    return map;
  }, [joinedChallenges, challengeProgress, transactions, budgets]);

  const activeChallenges = CHALLENGES.filter((c) => joinedChallenges.includes(c.id));
  const availableChallenges = CHALLENGES.filter((c) => !joinedChallenges.includes(c.id));

  return (
    <View style={[styles.wrapper, { marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>COMMUNITY</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            🏅 Finance Challenges
          </Text>
        </View>
        <View style={styles.headerRight}>
          {joinedChallenges.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>{joinedChallenges.length} active</Text>
            </View>
          )}
          <Text style={[styles.chevron, { color: colors.textMuted }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Active challenges */}
          {activeChallenges.length > 0 && (
            <>
              <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>📌 Your Active Challenges</Text>
              {activeChallenges.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  joined
                  progress={progressMap[c.id]}
                  onJoin={joinChallenge}
                  onLeave={leaveChallenge}
                  colors={colors}
                />
              ))}
            </>
          )}

          {/* Available challenges */}
          {availableChallenges.length > 0 && (
            <>
              <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                {activeChallenges.length > 0 ? '✨ More Challenges' : '✨ Available Challenges'}
              </Text>
              {availableChallenges.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  joined={false}
                  progress={null}
                  onJoin={joinChallenge}
                  onLeave={leaveChallenge}
                  colors={colors}
                />
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

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
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 12, fontWeight: '700' },
  groupLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4 },

  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  cardEmoji: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  diffText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 12, lineHeight: 18 },

  progressSection: { paddingHorizontal: 14, paddingBottom: 12 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12 },
  progressPct: { fontSize: 12, fontWeight: '700' },
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },
  daysLeft: { fontSize: 11, marginTop: 4 },

  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  rewardEmoji: { fontSize: 16 },
  rewardText: { fontSize: 12 },

  tipRow: { padding: 10, paddingHorizontal: 14 },
  tipText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },

  actionBtn: {
    margin: 14,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
});
