/**
 * BudgetSection — 2-column grid of budget cards with SVG ring progress.
 * Each card is tappable to expand/collapse inline details + edit.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Plus, Pencil, Target } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { categoryConfig } from '../../lib/categoryConfig';
import CategoryIcon from '../common/CategoryIcon';

// ── SVG ring ──────────────────────────────────────────────────────────────────

function RingProgress({ pct, size = 56, color, strokeWidth = 5 }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r       = (size - strokeWidth) / 2;
  const cx      = size / 2;
  const circ    = 2 * Math.PI * r;
  const filled  = (clamped / 100) * circ;

  return (
    <Svg width={size} height={size}>
      {/* Track */}
      <Circle cx={cx} cy={cx} r={r} stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} fill="none" />
      {/* Arc — rotated -90° so it starts from 12 o'clock */}
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

// ── Single budget card ────────────────────────────────────────────────────────

function BudgetCard({ budget, transactions, onEdit, colors }) {
  const [open, setOpen] = useState(false);

  const spent    = transactions
    .filter((t) => t.type === 'expense' && t.category === budget.category)
    .reduce((s, t) => s + Number(t.amount), 0);
  const limit    = Number(budget.monthly_limit);
  const pct      = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const exceeded = spent > limit;

  const catColor  = categoryConfig[budget.category]?.color || colors.primary;
  const ringColor = exceeded ? colors.expense : catColor;

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
      {/* Ring with category icon in center */}
      <View style={styles.ringWrap}>
        <RingProgress pct={pct} size={56} color={ringColor} />
        <View style={[styles.ringIcon, { backgroundColor: catColor + '1a' }]}>
          <CategoryIcon category={budget.category} size={14} color={catColor} />
        </View>
      </View>

      {/* Labels */}
      <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
        {budget.title || budget.category}
      </Text>

      <Text style={[styles.cardPct, { color: ringColor }]}>{pct.toFixed(0)}%</Text>

      <Text style={[styles.cardAmts, { color: colors.textMuted }]} numberOfLines={2}>
        ₱{Math.round(spent).toLocaleString()}
        {'\n'}
        <Text style={{ color: colors.textSecondary }}>/ ₱{Math.round(limit).toLocaleString()}</Text>
      </Text>

      {exceeded && (
        <View style={[styles.overBadge, { backgroundColor: colors.expenseLight }]}>
          <Text style={[styles.overText, { color: colors.expense }]}>Over</Text>
        </View>
      )}

      {/* Inline expanded details */}
      {open && (
        <View style={[styles.expanded, { borderTopColor: colors.border }]}>
          <Text style={[styles.expandedAmt, { color: exceeded ? colors.expense : colors.income }]}>
            {exceeded
              ? `₱${(spent - limit).toFixed(2)} over`
              : `₱${(limit - spent).toFixed(2)} left`}
          </Text>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => { setOpen(false); onEdit(budget); }}
          >
            <Pencil size={11} color={colors.primary} />
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function BudgetSection({ budgets, transactions, onCreateBudget, onEditBudget }) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Budget Limits</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Monthly category caps</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { borderColor: colors.primary }]}
          onPress={onCreateBudget}
        >
          <Plus size={13} color={colors.primary} />
          <Text style={[styles.addBtnText, { color: colors.primary }]}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      {budgets.length === 0 ? (
        <TouchableOpacity
          onPress={onCreateBudget}
          activeOpacity={0.75}
          style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Target size={24} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No budgets yet</Text>
          <Text style={[styles.emptyHint, { color: colors.primary }]}>Tap to add limits</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.grid}>
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              transactions={transactions}
              onEdit={onEditBudget}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 20, marginBottom: 10 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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

  overBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  overText:  { fontSize: 10, fontWeight: '700' },

  expanded: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedAmt:  { fontSize: 11, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  editBtnText: { fontSize: 11, fontWeight: '600' },

  emptyCard: {
    borderWidth: 1, borderRadius: 16,
    padding: 28, alignItems: 'center', gap: 6,
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 13, fontWeight: '600' },
  emptyHint:  { fontSize: 11, fontWeight: '600' },
});
