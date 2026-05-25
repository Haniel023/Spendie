/**
 * CardBreakdownSection — per-card income / expense / balance chart in Analytics tab
 *
 * Renders a clean card for each account card showing:
 *   • Card name + last four
 *   • Income bar (green) vs Expense bar (red) — proportional fill
 *   • Net balance (colored positive/negative)
 *
 * Props:
 *   cards        array   all user cards
 *   transactions array   all transactions (unfiltered)
 */

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';

function computeCard(card, transactions) {
  const mine = transactions.filter((t) => t.card_id === card.id);
  const income   = mine.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = mine.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance  = Number(card.current_balance ?? 0) + income - expenses;
  return { income, expenses, balance, txCount: mine.length };
}

function fmt(n) {
  return `₱${Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
}

function CardRow({ card, transactions, colors }) {
  const { income, expenses, balance, txCount } = useMemo(
    () => computeCard(card, transactions),
    [card, transactions],
  );

  const maxAmt = Math.max(income, expenses, 1);
  const incomeW   = (income   / maxAmt) * 100;
  const expenseW  = (expenses / maxAmt) * 100;
  const isNeg     = balance < 0;

  return (
    <View style={[s.row, { borderBottomColor: colors.border }]}>
      {/* Card colour dot */}
      <View style={[s.dot, { backgroundColor: card.card_color_from ?? '#1a1a2e' }]} />

      {/* Card name / meta */}
      <View style={s.meta}>
        <Text style={[s.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
          {card.bank_name || card.card_name}
          {card.last_four ? <Text style={{ color: colors.textMuted }}> ···· {card.last_four}</Text> : null}
        </Text>
        <Text style={[s.txCount, { color: colors.textMuted }]}>{txCount} transaction{txCount !== 1 ? 's' : ''}</Text>

        {/* Bars */}
        <View style={s.bars}>
          {/* Income bar */}
          <View style={[s.barBg, { backgroundColor: colors.income + '22' }]}>
            <View style={[s.barFill, { width: `${incomeW}%`, backgroundColor: colors.income }]} />
          </View>
          {/* Expense bar */}
          <View style={[s.barBg, { backgroundColor: colors.expense + '22' }]}>
            <View style={[s.barFill, { width: `${expenseW}%`, backgroundColor: colors.expense }]} />
          </View>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          <Text style={[s.legendText, { color: colors.income }]}>↑ {fmt(income)}</Text>
          <Text style={[s.legendText, { color: colors.expense }]}>↓ {fmt(expenses)}</Text>
        </View>
      </View>

      {/* Balance */}
      <View style={s.balWrap}>
        <Text style={[s.balAmt, { color: isNeg ? colors.expense : colors.income }]}>
          {isNeg ? '-' : ''}{fmt(balance)}
        </Text>
        <Text style={[s.balLabel, { color: colors.textMuted }]}>balance</Text>
      </View>
    </View>
  );
}

export default function CardBreakdownSection({ cards = [], transactions = [] }) {
  const { colors, spacing, shadow } = useTheme();

  const activeCards = cards.filter((c) => {
    const txCount = transactions.filter((t) => t.card_id === c.id).length;
    return txCount > 0;
  });

  if (cards.length === 0) return null;

  return (
    <View style={[s.card, { backgroundColor: colors.card, marginHorizontal: spacing.lg }, shadow.card]}>
      {/* Header */}
      <View style={s.header}>
        <View style={[s.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <CreditCard size={15} color={colors.primary} strokeWidth={2.5} />
        </View>
        <View>
          <Text style={[s.title, { color: colors.textPrimary }]}>Card Breakdown</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>
            {cards.length} card{cards.length !== 1 ? 's' : ''} · income vs expenses
          </Text>
        </View>
      </View>

      {activeCards.length === 0 ? (
        <View style={s.empty}>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>
            No transactions linked to any card yet.
          </Text>
          <Text style={[s.emptyHint, { color: colors.textMuted }]}>
            Select a card when adding a transaction.
          </Text>
        </View>
      ) : (
        activeCards.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            transactions={transactions}
            colors={colors}
          />
        ))
      )}

      {/* Cards with no transactions (greyed out) */}
      {cards.filter((c) => transactions.filter((t) => t.card_id === c.id).length === 0).map((card) => (
        <View key={card.id} style={[s.row, { borderBottomColor: colors.border, opacity: 0.45 }]}>
          <View style={[s.dot, { backgroundColor: card.card_color_from ?? '#1a1a2e' }]} />
          <View style={s.meta}>
            <Text style={[s.cardName, { color: colors.textSecondary }]} numberOfLines={1}>
              {card.bank_name || card.card_name}
              {card.last_four ? <Text> ···· {card.last_four}</Text> : null}
            </Text>
            <Text style={[s.txCount, { color: colors.textMuted }]}>No transactions linked</Text>
          </View>
          <Text style={[s.balAmt, { color: colors.textMuted, fontSize: 13 }]}>
            ₱{Number(card.current_balance ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },

  dot: {
    width: 10, height: 10, borderRadius: 5,
    marginTop: 4, flexShrink: 0,
  },

  meta: { flex: 1, gap: 4 },
  cardName: { fontSize: 13, fontWeight: '700' },
  txCount:  { fontSize: 10, fontWeight: '500' },

  bars: { gap: 4, marginTop: 2 },
  barBg: {
    height: 6, borderRadius: 3, overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%', borderRadius: 3,
    minWidth: 4,
  },

  legend: { flexDirection: 'row', gap: 12, marginTop: 2 },
  legendText: { fontSize: 10, fontWeight: '700' },

  balWrap:  { alignItems: 'flex-end', flexShrink: 0 },
  balAmt:   { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  balLabel: { fontSize: 9, fontWeight: '500', marginTop: 1 },

  empty: { paddingVertical: 16, alignItems: 'center', gap: 4 },
  emptyText: { fontSize: 13, fontWeight: '500' },
  emptyHint: { fontSize: 11 },
});
