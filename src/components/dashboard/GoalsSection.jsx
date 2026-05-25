/**
 * GoalsSection — 2-column grid of goal cards with SVG ring progress.
 * Each card is tappable to expand details. Timeline modal preserved.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Plus, Pencil, Target, X, CalendarDays } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { getPHNow } from '../../lib/timezone';

// ── SVG ring (same pattern as BudgetSection) ──────────────────────────────────

function RingProgress({ pct, size = 56, color, strokeWidth = 5 }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r       = (size - strokeWidth) / 2;
  const cx      = size / 2;
  const circ    = 2 * Math.PI * r;
  const filled  = (clamped / 100) * circ;

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} fill="none" />
      <G rotation={-90} origin={`${cx},${cx}`}>
        <Circle
          cx={cx} cy={cx} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={[filled, circ - filled]}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

// ── Timeline modal (goal savings plan) ───────────────────────────────────────

function computeTimeline(goal) {
  const remaining = Number(goal.target_amount) - Number(goal.current_amount);
  if (remaining <= 0) return null;

  const saveAmounts = [500, 1000, 2000, 3000, 5000];
  const results = saveAmounts.map((monthly) => {
    const months    = Math.ceil(remaining / monthly);
    const reachDate = new Date(getPHNow());
    reachDate.setMonth(reachDate.getMonth() + months);
    return {
      monthly,
      months,
      reachDate: reachDate.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }),
    };
  });

  let requiredMonthly = null;
  if (goal.deadline) {
    const now      = getPHNow();
    const deadline = new Date(goal.deadline);
    const rawMonths = (deadline - now) / (1000 * 60 * 60 * 24 * 30);
    const months    = Math.max(parseFloat(rawMonths.toFixed(1)), 0.5);
    requiredMonthly = remaining / months;
  }

  return { results, requiredMonthly, remaining };
}

function TimelineModal({ goal, colors, onClose }) {
  if (!goal) return null;
  const data = computeTimeline(goal);
  if (!data) return null;
  const { results, requiredMonthly, remaining } = data;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.sheetClose} onPress={onClose}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>📅 Goal Timeline</Text>
          <Text style={[styles.sheetGoalName, { color: colors.primary }]}>{goal.title}</Text>
          <Text style={[styles.sheetRemaining, { color: colors.textSecondary }]}>
            ₱{remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })} remaining
          </Text>

          {requiredMonthly !== null && (
            <View style={[styles.requiredBox, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary }]}>
              <Text style={[styles.requiredLabel, { color: colors.primary }]}>Required to hit deadline</Text>
              <Text style={[styles.requiredAmt, { color: colors.primary }]}>
                ₱{requiredMonthly.toLocaleString('en-PH', { minimumFractionDigits: 2 })}/month
              </Text>
              <Text style={[styles.requiredDeadline, { color: colors.textSecondary }]}>by {goal.deadline}</Text>
            </View>
          )}

          <Text style={[styles.tlLabel, { color: colors.textSecondary }]}>Savings plan options</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {results.map((r) => (
              <View key={r.monthly} style={[styles.tlRow, { backgroundColor: colors.background }]}>
                <View style={styles.tlLeft}>
                  <Text style={[styles.tlMonthly, { color: colors.textPrimary }]}>
                    ₱{r.monthly.toLocaleString()}/mo
                  </Text>
                  <Text style={[styles.tlMonths, { color: colors.textMuted }]}>
                    {r.months} month{r.months !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.tlRight}>
                  <Text style={[styles.tlReach, { color: colors.textMuted }]}>Reach by</Text>
                  <Text style={[styles.tlDate, { color: colors.primary }]}>{r.reachDate}</Text>
                </View>
                <View style={[styles.tlBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.tlBarFill, { backgroundColor: colors.primary, width: `${Math.min(100, (1 / r.months) * 100 * 3)}%` }]} />
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.doneBtnText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Single goal card ──────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit, colors, onShowTimeline }) {
  const [open, setOpen] = useState(false);

  const target    = Number(goal.target_amount);
  const current   = Number(goal.current_amount);
  const pct       = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const completed = current >= target;
  const remaining = Math.max(target - current, 0);

  // Deadline label
  let deadlineLabel = null;
  let urgent = false;
  if (goal.deadline && !completed) {
    const now      = getPHNow();
    const deadline = new Date(goal.deadline);
    const days     = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    if (days < 0)       deadlineLabel = 'Overdue!';
    else if (days <= 7) { deadlineLabel = `${days}d left`; urgent = true; }
    else if (days <= 30) deadlineLabel = `${days}d left`;
    else                 deadlineLabel = `${Math.ceil(days / 30)}mo left`;
  }

  const ringColor = completed
    ? colors.income
    : pct >= 75
      ? colors.primary
      : colors.primary;

  return (
    <TouchableOpacity
      onPress={() => setOpen((v) => !v)}
      activeOpacity={0.75}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: open ? ringColor + '55' : colors.border,
          borderWidth: open ? 1.5 : 1,
        },
      ]}
    >
      {/* Ring with emoji or icon center */}
      <View style={styles.ringWrap}>
        <RingProgress pct={pct} size={56} color={ringColor} />
        <View style={[styles.ringIcon, { backgroundColor: ringColor + '15' }]}>
          {goal.emoji
            ? <Text style={{ fontSize: 16 }}>{goal.emoji}</Text>
            : <Target size={14} color={ringColor} strokeWidth={2} />
          }
        </View>
      </View>

      <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={2}>
        {goal.title}
      </Text>

      <Text style={[styles.cardPct, { color: ringColor }]}>
        {completed ? '✓' : `${pct.toFixed(0)}%`}
      </Text>

      <Text style={[styles.cardAmts, { color: colors.textMuted }]} numberOfLines={2}>
        ₱{Math.round(current).toLocaleString()}
        {'\n'}
        <Text style={{ color: colors.textSecondary }}>/ ₱{Math.round(target).toLocaleString()}</Text>
      </Text>

      {deadlineLabel && (
        <View style={[styles.deadlineBadge, { backgroundColor: urgent ? colors.expenseLight : colors.primaryLight }]}>
          <Text style={[styles.deadlineText, { color: urgent ? colors.expense : colors.primary }]}>
            {deadlineLabel}
          </Text>
        </View>
      )}

      {completed && (
        <View style={[styles.doneBadge, { backgroundColor: colors.incomeLight }]}>
          <Text style={[styles.doneText, { color: colors.income }]}>✅ Done</Text>
        </View>
      )}

      {/* Inline expanded */}
      {open && (
        <View style={[styles.expanded, { borderTopColor: colors.border }]}>
          {!completed && (
            <Text style={[styles.expandedAmt, { color: colors.primary }]}>
              ₱{remaining.toLocaleString('en-PH', { maximumFractionDigits: 0 })} to go
            </Text>
          )}
          <View style={styles.expandedActions}>
            {!completed && (
              <TouchableOpacity
                style={[styles.tlBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => { setOpen(false); onShowTimeline(goal); }}
              >
                <CalendarDays size={11} color={colors.primary} />
                <Text style={[styles.tlBtnText, { color: colors.primary }]}>Plan</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => { setOpen(false); onEdit(goal); }}
            >
              <Pencil size={11} color={colors.primary} />
              <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function GoalsSection({ goals, onCreateGoal, onEditGoal, onDeleteGoal }) {
  const { colors } = useTheme();
  const [timelineGoal, setTimelineGoal] = useState(null);

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Savings Goals</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Track your targets</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { borderColor: colors.primary }]}
          onPress={onCreateGoal}
        >
          <Plus size={13} color={colors.primary} />
          <Text style={[styles.addBtnText, { color: colors.primary }]}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      {goals.length === 0 ? (
        <TouchableOpacity
          onPress={onCreateGoal}
          activeOpacity={0.75}
          style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Target size={24} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No goals yet</Text>
          <Text style={[styles.emptyHint, { color: colors.primary }]}>Tap to add a goal</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.grid}>
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={onEditGoal}
              colors={colors}
              onShowTimeline={setTimelineGoal}
            />
          ))}
        </View>
      )}

      {/* Timeline modal */}
      {timelineGoal && (
        <TimelineModal
          goal={timelineGoal}
          colors={colors}
          onClose={() => setTimelineGoal(null)}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 20, marginBottom: 10 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  title:    { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 11, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  addBtnText: { fontSize: 12, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  card: {
    width: '47.5%',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  ringWrap: { position: 'relative', width: 56, height: 56 },
  ringIcon: {
    position: 'absolute',
    top: 9, left: 9, right: 9, bottom: 9,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  cardPct:  { fontSize: 19, fontWeight: '800', lineHeight: 22 },
  cardAmts: { fontSize: 11, textAlign: 'center', lineHeight: 16 },

  deadlineBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  deadlineText:  { fontSize: 10, fontWeight: '700' },
  doneBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  doneText:   { fontSize: 10, fontWeight: '700' },

  expanded: {
    width: '100%', borderTopWidth: 1, paddingTop: 8, marginTop: 2,
    gap: 6,
  },
  expandedAmt: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  expandedActions: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  tlBtnText: { fontSize: 11, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  editBtnText: { fontSize: 11, fontWeight: '600' },

  emptyCard: {
    borderWidth: 1, borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 6, borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 13, fontWeight: '600' },
  emptyHint:  { fontSize: 11, fontWeight: '600' },

  // ── Timeline modal ──────────────────────────────────────────────────────────
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '85%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetClose: {
    position: 'absolute', top: 20, right: 20, padding: 4,
  },
  sheetTitle:     { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sheetGoalName:  { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sheetRemaining: { fontSize: 13, marginBottom: 14 },

  requiredBox: {
    borderRadius: 12, padding: 12, marginBottom: 14,
    borderLeftWidth: 3,
  },
  requiredLabel:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  requiredAmt:      { fontSize: 22, fontWeight: '800' },
  requiredDeadline: { fontSize: 12, marginTop: 2 },

  tlLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  tlRow: {
    borderRadius: 10, padding: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden',
  },
  tlLeft:    { flex: 1 },
  tlMonthly: { fontSize: 15, fontWeight: '700' },
  tlMonths:  { fontSize: 12, marginTop: 2 },
  tlRight:   { alignItems: 'flex-end' },
  tlReach:   { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  tlDate:    { fontSize: 14, fontWeight: '700' },
  tlBarBg:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
  tlBarFill: { height: '100%', opacity: 0.4 },

  doneBtn: {
    borderRadius: 50, paddingVertical: 13, alignItems: 'center', marginTop: 12,
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
