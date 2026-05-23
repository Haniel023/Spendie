import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Plus, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getPHNow } from '../../lib/timezone';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

// ── Timeline helper ───────────────────────────────────────────────────────────

function computeTimeline(goal) {
  const remaining = Number(goal.target_amount) - Number(goal.current_amount);
  if (remaining <= 0) return null;

  const results = [];
  const saveAmounts = [500, 1000, 2000, 3000, 5000];

  saveAmounts.forEach((monthly) => {
    const months = Math.ceil(remaining / monthly);
    const reachDate = new Date(getPHNow());
    reachDate.setMonth(reachDate.getMonth() + months);
    results.push({
      monthly,
      months,
      reachDate: reachDate.toLocaleDateString('en-PH', {
        month: 'short', year: 'numeric',
      }),
    });
  });

  // If there's a deadline, compute required monthly savings
  let requiredMonthly = null;
  if (goal.deadline) {
    const now      = getPHNow();
    const deadline = new Date(goal.deadline);
    const rawMonths = (deadline - now) / (1000 * 60 * 60 * 24 * 30);
    const months    = Math.max(parseFloat(rawMonths.toFixed(1)), 0.5);
    requiredMonthly = remaining / months;
  }

  return { results, requiredMonthly };
}

// ── Timeline Modal ────────────────────────────────────────────────────────────

function TimelineModal({ goal, onClose }) {
  if (!goal) return null;
  const data = computeTimeline(goal);
  if (!data) return null;

  const { results, requiredMonthly } = data;
  const remaining = Number(goal.target_amount) - Number(goal.current_amount);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlayBg} onPress={onClose}>
        <Pressable style={styles.timelineSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.sheetTitle}>📅 Goal Timeline</Text>
          <Text style={styles.sheetGoalName}>{goal.title}</Text>
          <Text style={styles.sheetRemaining}>
            ₱{remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })} remaining
          </Text>

          {requiredMonthly !== null && (
            <View style={styles.requiredBox}>
              <Text style={styles.requiredLabel}>Required to hit deadline</Text>
              <Text style={styles.requiredAmount}>
                ₱{requiredMonthly.toLocaleString('en-PH', { minimumFractionDigits: 2 })}/month
              </Text>
              <Text style={styles.requiredDeadline}>by {goal.deadline}</Text>
            </View>
          )}

          <Text style={styles.tlSectionLabel}>Savings plan options</Text>
          {results.map((r) => (
            <View key={r.monthly} style={styles.tlRow}>
              <View style={styles.tlLeft}>
                <Text style={styles.tlMonthly}>₱{r.monthly.toLocaleString()}/mo</Text>
                <Text style={styles.tlMonths}>{r.months} month{r.months !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.tlRight}>
                <Text style={styles.tlReach}>Reach by</Text>
                <Text style={styles.tlDate}>{r.reachDate}</Text>
              </View>
              {/* Mini progress indicator */}
              <View style={styles.tlBarBg}>
                <View style={[styles.tlBarFill, { width: `${Math.min(100, (1 / r.months) * 100 * 3)}%` }]} />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.sheetDoneBtn} onPress={onClose}>
            <Text style={styles.sheetDoneBtnText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GoalsSection({ goals, onCreateGoal, onEditGoal, onDeleteGoal }) {
  const [timelineGoal, setTimelineGoal] = useState(null);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Savings Goals</Text>
          <Text style={styles.subtitle}>Track your financial goals</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onCreateGoal}>
          <Plus size={14} color={colors.primary} />
          <Text style={styles.addBtnText}>Goal</Text>
        </TouchableOpacity>
      </View>

      {goals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptyText}>Create your first savings goal.</Text>
        </View>
      ) : (
        goals.map((goal) => {
          const target    = Number(goal.target_amount);
          const current   = Number(goal.current_amount);
          const pct       = target > 0 ? Math.min((current / target) * 100, 100) : 0;
          const completed = current >= target;
          const remaining = Math.max(target - current, 0);

          // Deadline distance
          let deadlineLabel = null;
          let deadlineUrgent = false;
          if (goal.deadline && !completed) {
            const now      = getPHNow();
            const deadline = new Date(goal.deadline);
            const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0)      deadlineLabel = 'Overdue!';
            else if (daysLeft <= 7)  { deadlineLabel = `${daysLeft}d left`; deadlineUrgent = true; }
            else if (daysLeft <= 30) { deadlineLabel = `${daysLeft}d left`; }
            else {
              const months = Math.ceil(daysLeft / 30);
              deadlineLabel = `${months}mo left`;
            }
          }

          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalTop}>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalAmount}>
                    ₱{current.toFixed(2)} / ₱{target.toFixed(2)}
                  </Text>
                  {goal.deadline && (
                    <Text style={[styles.deadline, deadlineUrgent && styles.deadlineUrgent]}>
                      📅 {goal.deadline}{deadlineLabel ? ` · ${deadlineLabel}` : ''}
                    </Text>
                  )}
                  {!completed && remaining > 0 && (
                    <Text style={styles.remaining}>₱{remaining.toFixed(2)} to go</Text>
                  )}
                </View>
                <View style={styles.goalActions}>
                  {completed && <Text style={styles.completedBadge}>✅ Done</Text>}
                  {!completed && (
                    <TouchableOpacity
                      style={styles.timelineBtn}
                      onPress={() => setTimelineGoal(goal)}
                    >
                      <Text style={styles.timelineBtnText}>📅 Plan</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.editBtn} onPress={() => onEditGoal(goal)}>
                    <Pencil size={13} color={colors.primary} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` }, completed && styles.progressComplete]} />
              </View>
              <Text style={styles.pctLabel}>{pct.toFixed(0)}%</Text>
            </View>
          );
        })
      )}

      {/* Timeline modal */}
      {timelineGoal && (
        <TimelineModal goal={timelineGoal} onClose={() => setTimelineGoal(null)} />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },

  goalCard: { marginBottom: spacing.md },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  goalInfo: { flex: 1, marginRight: spacing.sm },
  goalTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  goalAmount: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deadline: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deadlineUrgent: { color: colors.danger, fontWeight: '600' },
  remaining: { fontSize: 11, color: colors.primary, marginTop: 2, fontWeight: '500' },

  goalActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' },
  completedBadge: { fontSize: 11, fontWeight: '700', color: colors.income, backgroundColor: colors.incomeLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  timelineBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.primaryLight, borderRadius: radius.full },
  timelineBtnText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  progressBar: { height: 7, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden', marginBottom: 3 },
  progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  progressComplete: { backgroundColor: colors.success },
  pctLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'right' },

  // Timeline modal
  overlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  timelineSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xxl,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetCloseBtn: { position: 'absolute', top: spacing.lg, right: spacing.lg, padding: spacing.xs },
  sheetTitle: { ...typography.h3, marginBottom: 4 },
  sheetGoalName: { fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  sheetRemaining: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },

  requiredBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  requiredLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  requiredAmount: { fontSize: 22, fontWeight: '800', color: colors.primary },
  requiredDeadline: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  tlSectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.sm },
  tlRow: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  tlLeft: { flex: 1 },
  tlMonthly: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  tlMonths: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tlRight: { alignItems: 'flex-end' },
  tlReach: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  tlDate: { fontSize: 14, fontWeight: '700', color: colors.primary },
  tlBarBg: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: colors.border },
  tlBarFill: { height: '100%', backgroundColor: colors.primary, opacity: 0.4 },

  sheetDoneBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  sheetDoneBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
