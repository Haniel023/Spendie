/**
 * Achievements Section — collapsible, theme-aware
 *
 * Collapsed: shows header + progress bar + first 2 unlocked badges as a preview row
 * Expanded:  shows all categories with full badge grid
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable,
} from 'react-native';
import { Trophy, Lock, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { ACHIEVEMENTS } from '../../lib/achievementsEngine';
import { formatUnlockDate } from '../../lib/achievementTimestamps';
import { useTheme } from '../../lib/ThemeContext';

const CATEGORY_ORDER = ['Getting Started', 'Consistency', 'Savings', 'Budgeting', 'Planning', 'Challenges', 'Mystery'];
const CATEGORY_EMOJI = {
  'Getting Started': '🚀', 'Consistency': '🔥', 'Savings': '💰',
  'Budgeting': '🛡️', 'Planning': '📋', 'Challenges': '🏆', 'Mystery': '❓',
};

// ── Badge Detail Modal ─────────────────────────────────────────────────────────

function BadgeDetailModal({ badge, unlocked, unlockedDate, onClose, colors, radius, spacing }) {
  if (!badge) return null;
  const isMystery    = badge.mystery && !unlocked;
  const displayTitle = unlocked && badge.revealTitle ? badge.revealTitle : (isMystery ? '??? Mystery Reward' : badge.title);
  const displayDesc  = unlocked && badge.revealDescription ? badge.revealDescription : badge.description;

  return (
    <Modal visible={!!badge} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderRadius: radius.xl }]} onPress={() => {}}>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.background }]} onPress={onClose}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[
            styles.modalEmojiWrapper,
            unlocked
              ? { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 2 }
              : isMystery
                ? { backgroundColor: '#f5f3ff', borderColor: '#8b5cf6', borderWidth: 2, borderStyle: 'dashed' }
                : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 2 },
          ]}>
            <Text style={[styles.modalEmoji, !unlocked && !isMystery && { opacity: 0.3 }]}>
              {isMystery ? '🔒' : badge.emoji}
            </Text>
          </View>

          <View style={[styles.categoryPill, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.categoryPillText, { color: colors.primary }]}>
              {CATEGORY_EMOJI[badge.category]}  {badge.category}
            </Text>
          </View>

          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{displayTitle}</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {unlocked ? (
            <View style={[styles.statusRow, { backgroundColor: colors.background }]}>
              <CheckCircle size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusUnlockedLabel, { color: colors.primary }]}>Achievement Unlocked!</Text>
                <Text style={[styles.statusDate, { color: colors.textSecondary }]}>
                  {unlockedDate ? `📅  ${unlockedDate}` : 'You earned this badge 🎉'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.statusRow, { backgroundColor: colors.background }]}>
              <Lock size={16} color={isMystery ? '#8b5cf6' : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusLockedLabel, { color: isMystery ? '#8b5cf6' : colors.textMuted }]}>
                  {isMystery ? 'Mystery reward — keep exploring!' : 'Not yet unlocked'}
                </Text>
                {!isMystery && (
                  <Text style={[styles.statusHowTo, { color: colors.textSecondary }]}>{displayDesc}</Text>
                )}
              </View>
            </View>
          )}

          <View style={[styles.descBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.descBoxLabel, { color: colors.primary }]}>
              {isMystery ? 'How to discover' : 'How to earn'}
            </Text>
            <Text style={[styles.descBoxText, { color: colors.textSecondary }]}>
              {isMystery ? 'Complete a hidden challenge to reveal this reward. Keep exploring!' : displayDesc}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.modalCloseBtnText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Badge Chip ─────────────────────────────────────────────────────────────────

function BadgeChip({ achievement, unlocked, onPress, colors }) {
  const isMystery    = achievement.mystery && !unlocked;
  const displayTitle = isMystery ? '???' : (unlocked && achievement.revealTitle ? achievement.revealTitle : achievement.title);
  const displayEmoji = isMystery ? '🔒' : achievement.emoji;

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        unlocked
          ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
          : isMystery
            ? { borderColor: '#8b5cf6', backgroundColor: '#f5f3ff', borderStyle: 'dashed' }
            : { borderColor: colors.border, backgroundColor: colors.background },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.badgeEmoji, !unlocked && !isMystery && { opacity: 0.35 }]}>
        {displayEmoji}
      </Text>
      <Text
        style={[
          styles.badgeName,
          unlocked ? { color: colors.primary } : isMystery ? { color: '#8b5cf6' } : { color: colors.textMuted },
        ]}
        numberOfLines={2}
      >
        {displayTitle}
      </Text>
      {unlocked && <View style={[styles.checkDot, { backgroundColor: colors.primary }]} />}
      {!unlocked && !isMystery && (
        <View style={styles.lockIcon}>
          <Lock size={8} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AchievementsSection({ unlockedIds = [], timestamps = {} }) {
  const { colors, spacing, radius, shadow } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const unlockedSet     = new Set(unlockedIds);
  const totalUnlocked   = unlockedIds.length;
  const total           = ACHIEVEMENTS.length;
  const progressPercent = Math.round((totalUnlocked / total) * 100);

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: ACHIEVEMENTS.filter((a) => a.category === cat),
  }));

  // Preview badges: first 6 unlocked (or mix of unlocked + locked)
  const previewBadges = ACHIEVEMENTS.slice(0, 6);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, ...shadow.card }]}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <Trophy size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Achievements</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{totalUnlocked}/{total}</Text>
          </View>
        </View>
        {expanded
          ? <ChevronUp size={18} color={colors.textMuted} />
          : <ChevronDown size={18} color={colors.textMuted} />
        }
      </TouchableOpacity>

      {/* ── Progress bar (always visible) ───────────────────────────────────── */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.progressLabel, { color: colors.textMuted }]}>{progressPercent}% complete</Text>

      {/* ── Collapsed preview ───────────────────────────────────────────────── */}
      {!expanded && (
        <View style={styles.previewRow}>
          {previewBadges.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.previewBadge,
                unlockedSet.has(a.id)
                  ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                  : { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              onPress={() => setSelectedBadge(a)}
              activeOpacity={0.75}
            >
              <Text style={[styles.previewEmoji, !unlockedSet.has(a.id) && { opacity: 0.3 }]}>
                {a.emoji}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.previewMore, { backgroundColor: colors.primaryLight }]}
            onPress={() => setExpanded(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.previewMoreText, { color: colors.primary }]}>+{total - 6}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Expanded category grid ───────────────────────────────────────────── */}
      {expanded && (
        <>
          {byCategory.map(({ cat, items }) => {
            const catUnlocked = items.filter((a) => unlockedSet.has(a.id)).length;
            return (
              <View key={cat} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    {CATEGORY_EMOJI[cat]}  {cat}
                  </Text>
                  <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{catUnlocked}/{items.length}</Text>
                </View>
                <View style={styles.badgeRow}>
                  {items.map((a) => (
                    <BadgeChip
                      key={a.id}
                      achievement={a}
                      unlocked={unlockedSet.has(a.id)}
                      onPress={() => setSelectedBadge(a)}
                      colors={colors}
                    />
                  ))}
                </View>
              </View>
            );
          })}

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.footerText, { color: colors.primary }]}>
              {totalUnlocked < total
                ? `🎯  ${total - totalUnlocked} achievement${total - totalUnlocked !== 1 ? 's' : ''} remaining — keep going!`
                : '🏆  All achievements unlocked! You\'re a Spendie champion!'}
            </Text>
          </View>
          <Text style={[styles.tapHint, { color: colors.textMuted }]}>Tap any badge to see details</Text>
        </>
      )}

      {/* ── Badge detail modal ───────────────────────────────────────────────── */}
      <BadgeDetailModal
        badge={selectedBadge}
        unlocked={selectedBadge ? unlockedSet.has(selectedBadge.id) : false}
        unlockedDate={selectedBadge ? formatUnlockDate(timestamps[selectedBadge?.id]) : null}
        onClose={() => setSelectedBadge(null)}
        colors={colors}
        radius={radius}
        spacing={spacing}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { padding: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '700' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countText: { fontSize: 11, fontWeight: '700' },

  progressBar: { height: 6, borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 }, // color applied inline via theme
  progressLabel: { fontSize: 11, marginBottom: 12 },

  // Preview row (collapsed)
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: { fontSize: 22 },
  previewMore: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMoreText: { fontSize: 11, fontWeight: '800' },

  // Expanded grid
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700' },
  sectionCount: { fontSize: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  badge: {
    width: 64,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 3,
    position: 'relative',
  },
  badgeEmoji: { fontSize: 20 },
  badgeName: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  checkDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4, // backgroundColor applied inline via theme
  },
  lockIcon: { position: 'absolute', top: 4, right: 4 },

  footer: { borderRadius: 8, padding: 8, marginTop: 4 },
  footerText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  tapHint: { fontSize: 10, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

  // Detail modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  modalEmojiWrapper: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, marginTop: 8,
  },
  modalEmoji: { fontSize: 44 },
  categoryPill: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, marginBottom: 10,
  },
  categoryPillText: { fontSize: 11, fontWeight: '600' },
  modalTitle: {
    fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 14,
  },
  divider: { width: '100%', height: 1, marginBottom: 14 },
  statusRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    width: '100%', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  statusUnlockedLabel: { fontSize: 13, fontWeight: '700' },
  statusDate: { fontSize: 12, marginTop: 2 },
  statusLockedLabel: { fontSize: 13, fontWeight: '700' },
  statusHowTo: { fontSize: 12, marginTop: 2 },
  descBox: { width: '100%', borderRadius: 10, padding: 10, marginBottom: 16 },
  descBoxLabel: {
    fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3,
  },
  descBoxText: { fontSize: 13, lineHeight: 19 },
  modalCloseBtn: {
    borderRadius: 999, paddingHorizontal: 24, paddingVertical: 10,
  },
  modalCloseBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
