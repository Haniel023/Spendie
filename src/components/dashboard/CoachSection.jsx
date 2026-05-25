/**
 * AI Coach Section — personality-aware coaching + daily tip + insights feed
 *
 * Always visible : header, full comment, daily tip
 * Collapsible    : insights feed (hidden by default, toggled via row button)
 */

import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Heart, Shield, Mic2, BarChart3, Zap, Leaf,
  Lightbulb, AlertTriangle, AlertCircle, Info, Target,
  CheckCircle2, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useSettings } from '../../lib/SettingsContext';
import {
  COACH_PERSONALITIES,
  generateCoachComment,
  getDailyTip,
} from '../../lib/coachEngine';

// ── Maps ──────────────────────────────────────────────────────────────────────

const PERSONALITY_ICONS = {
  supportive: Heart,
  strict:     Shield,
  roast:      Mic2,
  analyst:    BarChart3,
  anime:      Zap,
  minimal:    Leaf,
};

// Icons for each insight type — colors are resolved dynamically via useTheme()
const INSIGHT_ICONS = {
  danger:     AlertTriangle,
  warning:    AlertCircle,
  info:       Info,
  goal:       Target,
  success:    CheckCircle2,
  tip:        Lightbulb,
  prediction: TrendingUp,
};

const URGENCY = { danger: 0, warning: 1, prediction: 2, info: 3, goal: 3, success: 4, tip: 5 };

const SECTION_LABELS = {
  roast:   'COACH CAUGHT THIS',
  strict:  'DATA REVIEW',
  analyst: 'FINANCIAL ANALYSIS',
  anime:   'SENSEI NOTICED',
  minimal: 'NOTES',
  default: 'SPENDING INSIGHTS',
};

const DOT_COLORS = {
  danger:     '#ef4444',
  warning:    '#f59e0b',
  info:       '#3b82f6',
  goal:       '#10b981',
  success:    '#22c55e',
  tip:        '#16a34a',
  prediction: '#d97706',
};

// ── Insight Item ──────────────────────────────────────────────────────────────

function InsightItem({ insight }) {
  const { colors } = useTheme();

  // Resolve a semantic border/accent color per insight type using theme tokens where
  // possible so every insight looks correct on all 14 themes.
  const accentColor = (() => {
    switch (insight.type) {
      case 'danger':     return colors.expense;
      case 'warning':    return colors.warning  ?? '#f59e0b';
      case 'info':       return colors.primary;
      case 'goal':       return colors.income;
      case 'success':    return colors.income;
      case 'tip':        return colors.primary;
      case 'prediction': return colors.warning  ?? '#d97706';
      default:           return colors.primary;
    }
  })();

  const Icon = INSIGHT_ICONS[insight.type] ?? Info;

  return (
    <View style={[s.insightItem, { backgroundColor: accentColor + '18', borderLeftColor: accentColor }]}>
      <View style={[s.insightIconWrap, { backgroundColor: accentColor + '22' }]}>
        <Icon size={14} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        {insight.title ? (
          <Text style={[s.insightTitle, { color: accentColor }]}>{insight.title}</Text>
        ) : null}
        <Text style={[s.insightMsg, { color: colors.textPrimary }]}>{insight.message}</Text>
      </View>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

// Per-personality "no activity on this card" messages
const NO_CARD_ACTIVITY = {
  supportive: (name) => ({ icon: '💳', title: `${name} is ready for action!`, text: `No transactions linked to this card this month yet. Start logging your purchases here and I'll give you card-specific insights. Every peso matters! 🌱` }),
  strict:     (name) => ({ icon: '📋', title: `${name}: no entries this period.`, text: `Zero transactions recorded on this card this month. Either it's unused or transactions are unlinked. Ensure every purchase is attributed to the correct card.` }),
  roast:      (name) => ({ icon: '🫣', title: `${name} is just sitting there.`, text: `This card hasn't been used this month — or you just forgot to log it. Your GrabFood charges don't log themselves, bestie. Time to be accountable. 👀` }),
  analyst:    (name) => ({ icon: '🔍', title: `${name}: no data this period.`, text: `No transactions recorded for this card this month. Dataset insufficient for analysis. Log all card transactions to enable per-card performance metrics.` }),
  anime:      (name) => ({ icon: '⚡', title: `${name} AWAITS ITS DESTINY!`, text: `This card has no transactions this month! Like a sword undrawn, its power is dormant! Log your expenses and UNLOCK ITS FULL POTENTIAL! The battle begins when you log! 🔥` }),
  minimal:    (name) => ({ icon: '💳', title: `${name}: no activity.`, text: `No transactions this month. Log when ready.` }),
};

export default function CoachSection({ monthSummary, budgets, transactions, monthTransactions, insights = [], selectedCard, selectedCardBalance, cardMonthTransactions }) {
  const { colors, spacing, shadow } = useTheme();
  const { coachPersonality } = useSettings();

  const [insightsOpen, setInsightsOpen] = useState(false);

  const personality     = COACH_PERSONALITIES[coachPersonality] ?? COACH_PERSONALITIES.supportive;
  const PersonalityIcon = PERSONALITY_ICONS[coachPersonality] ?? Heart;

  // When a card is selected, use ONLY that card's monthly transactions for coaching.
  // This prevents global data from polluting the card-specific view.
  const effectiveMonthTx = selectedCard && cardMonthTransactions !== undefined
    ? cardMonthTransactions
    : monthTransactions;

  const effectiveSummary = useMemo(() => {
    if (!selectedCard || !cardMonthTransactions) return monthSummary;
    const income   = cardMonthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = cardMonthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expenses, balance: income - expenses };
  }, [selectedCard, cardMonthTransactions, monthSummary]);

  const comment = useMemo(() => {
    // Card selected but has no transactions this month → show card-specific no-activity message
    if (selectedCard && cardMonthTransactions !== undefined && cardMonthTransactions.length === 0) {
      const cardName = selectedCard.bank_name || selectedCard.card_name;
      const fn = NO_CARD_ACTIVITY[coachPersonality] ?? NO_CARD_ACTIVITY.supportive;
      return fn(cardName);
    }
    return generateCoachComment({
      personality:       coachPersonality,
      monthSummary:      effectiveSummary,
      budgets,
      transactions,
      monthTransactions: effectiveMonthTx,
      cardBalance:       selectedCardBalance ?? null,
    });
  }, [coachPersonality, effectiveSummary, budgets, transactions, effectiveMonthTx, selectedCard, cardMonthTransactions, selectedCardBalance]);

  const tip = useMemo(() => getDailyTip(coachPersonality), [coachPersonality]);

  const sectionLabel = SECTION_LABELS[coachPersonality] ?? SECTION_LABELS.default;

  const sortedInsights = useMemo(
    () => [...insights].sort((a, b) => (URGENCY[a.type] ?? 9) - (URGENCY[b.type] ?? 9)),
    [insights],
  );

  return (
    <View style={[s.wrapper, { marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }, shadow.card]}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={s.headerRow}>
          <View style={[s.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <PersonalityIcon size={17} color={colors.primary} strokeWidth={2.5} />
          </View>
          <View style={s.headerMid}>
            <Text style={[s.coachLabel, { color: colors.textMuted }]}>AI COACH</Text>
            <Text style={[s.coachName, { color: colors.textPrimary }]}>{personality.name}</Text>
          </View>
        </View>

        {/* ── Card balance context — visible when a card is active ──────────── */}
        {selectedCard && selectedCardBalance !== null && selectedCardBalance !== undefined && (
          <View style={[s.cardCtx, {
            backgroundColor: selectedCardBalance < 0 ? colors.expense + '18' : colors.primaryLight,
            borderColor:     selectedCardBalance < 0 ? colors.expense + '33' : colors.primary + '33',
          }]}>
            <View style={[s.cardCtxDot, { backgroundColor: selectedCard.card_color_from ?? '#1a1a2e' }]} />
            <Text style={[s.cardCtxName, { color: selectedCardBalance < 0 ? colors.expense : colors.primary }]} numberOfLines={1}>
              {selectedCard.bank_name || selectedCard.card_name}
              {selectedCard.last_four ? ` ···· ${selectedCard.last_four}` : ''}
            </Text>
            <Text style={[s.cardCtxBal, { color: selectedCardBalance < 0 ? colors.expense : colors.primary }]}>
              {selectedCardBalance < 0 ? '-' : ''}₱{Math.abs(selectedCardBalance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        {/* ── Full comment — always visible, never truncated ──────────────────── */}
        <Text style={[s.commentTitle, { color: colors.textPrimary }]}>{comment.title}</Text>
        <Text style={[s.commentText, { color: colors.textSecondary }]}>{comment.text}</Text>

        {/* ── Daily tip — always visible ──────────────────────────────────────── */}
        <View style={[s.tipCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '55' }]}>
          <Lightbulb size={14} color={colors.primary} style={{ marginTop: 1, flexShrink: 0 }} />
          <Text style={[s.tipText, { color: colors.primary }]}>{tip.text}</Text>
        </View>

        {/* ── Insights toggle row — only when insights exist ──────────────────── */}
        {insights.length > 0 && (
          <>
            <TouchableOpacity
              style={[s.insightsToggle, { borderTopColor: colors.border }]}
              onPress={() => setInsightsOpen(o => !o)}
              activeOpacity={0.7}
            >
              {/* Urgency dots */}
              <View style={s.dotsRow}>
                {sortedInsights.slice(0, 5).map((ins, i) => (
                  <View key={i} style={[s.dot, { backgroundColor: DOT_COLORS[ins.type] ?? colors.textMuted }]} />
                ))}
                {insights.length > 5 && (
                  <Text style={[s.dotMore, { color: colors.textMuted }]}>+{insights.length - 5}</Text>
                )}
              </View>

              <Text style={[s.toggleLabel, { color: colors.textSecondary }]}>
                {sectionLabel}
                <Text style={{ fontWeight: '500' }}> · {insights.length}</Text>
              </Text>

              {insightsOpen
                ? <ChevronUp   size={14} color={colors.textMuted} />
                : <ChevronDown size={14} color={colors.textMuted} />
              }
            </TouchableOpacity>

            {/* Insights feed */}
            {insightsOpen && (
              <View style={s.insightsList}>
                {sortedInsights.map((insight, i) => (
                  <InsightItem key={i} insight={insight} />
                ))}
                <Text style={[s.insightsFooter, { color: colors.textMuted }]}>
                  Updated based on your latest activity
                </Text>
              </View>
            )}
          </>
        )}

      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrapper: {},

  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconWrap:  { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerMid: { flex: 1 },
  coachLabel:{ fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  coachName: { fontSize: 14, fontWeight: '800' },

  // Card balance context row
  cardCtx: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12,
  },
  cardCtxDot:  { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  cardCtxName: { flex: 1, fontSize: 12, fontWeight: '600' },
  cardCtxBal:  { fontSize: 13, fontWeight: '800' },

  // Comment
  commentTitle: { fontSize: 15, fontWeight: '700', marginBottom: 5 },
  commentText:  { fontSize: 13, lineHeight: 21, marginBottom: 12 },

  // Daily tip
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  tipText: { fontSize: 12, fontWeight: '600', lineHeight: 18, flex: 1 },

  // Insights toggle row
  insightsToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 12, marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dotsRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  dotMore:    { fontSize: 10, fontWeight: '700' },
  toggleLabel:{ flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },

  // Insights list
  insightsList: { marginTop: 10 },
  insightItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 10, padding: 12, borderLeftWidth: 3, marginBottom: 6,
  },
  insightIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  insightTitle:  { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  insightMsg:    { fontSize: 12, lineHeight: 18 },
  insightsFooter:{ fontSize: 10, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },
});
