/**
 * Spendie Annual Wrapped 🎬
 *
 * Full-year financial recap in Spotify Wrapped style.
 * Available any time from the Profile tab.
 *
 * Slides:
 *   1. Welcome — Year overview
 *   2. Total income
 *   3. Total expenses
 *   4. Net savings + savings rate
 *   5. Biggest purchase
 *   6. Top spending category
 *   7. Best saving month
 *   8. Most active month (most transactions)
 *   9. No-spend days
 *   10. Spending personality
 *   11. Goal achievements
 *   12. Outro / forward-looking
 */

import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Share,
  ScrollView, Animated, Pressable,
} from 'react-native';
import { X, ChevronRight } from 'lucide-react-native';
import { toPHDate, getPHNow } from '../../lib/timezone';
import { computeSpendingPersonality } from '../../lib/spendingPersonality';
import { useTheme } from '../../lib/ThemeContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Data Computation ──────────────────────────────────────────────────────────

function computeAnnualData(transactions, budgets, goals, year) {
  const yearTx = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return d.getFullYear() === year;
  });

  if (yearTx.length === 0) return null;

  const expenses = yearTx.filter((t) => t.type === 'expense');
  const income = yearTx.filter((t) => t.type === 'income');

  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const netSaved = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSaved / totalIncome) * 100 : 0;

  // Biggest single expense
  const biggestExpense = expenses.length > 0
    ? expenses.reduce((m, t) => Number(t.amount) > Number(m.amount) ? t : m, expenses[0])
    : null;

  // Top spending category
  const catMap = {};
  expenses.forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount); });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Monthly breakdown
  const monthlyData = Array.from({ length: 12 }, (_, m) => {
    const monthTx = yearTx.filter((t) => toPHDate(t.created_at).getMonth() === m);
    const monthIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const monthExpenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return {
      month: m,
      income: monthIncome,
      expenses: monthExpenses,
      saved: monthIncome - monthExpenses,
      txCount: monthTx.length,
    };
  });

  // Best saving month
  const bestSavingMonth = [...monthlyData]
    .filter((m) => m.txCount > 0)
    .sort((a, b) => b.saved - a.saved)[0];

  // Most active month
  const mostActiveMonth = [...monthlyData]
    .sort((a, b) => b.txCount - a.txCount)[0];

  // No-spend days
  const spendDays = new Set(expenses.map((t) => {
    const d = toPHDate(t.created_at);
    return `${d.getMonth()}-${d.getDate()}`;
  }));
  const daysInYear = expenses.length > 0 ? 365 : 0;
  const noSpendDays = daysInYear > 0 ? daysInYear - spendDays.size : 0;

  // Transaction count
  const txCount = yearTx.length;
  const expenseCount = expenses.length;

  // Average monthly spend
  const activeMonths = monthlyData.filter((m) => m.txCount > 0).length;
  const avgMonthlySpend = activeMonths > 0 ? totalExpenses / activeMonths : 0;

  // Spending personality
  const personality = computeSpendingPersonality({ transactions: yearTx, budgets, goals });

  // Goal achievements
  const completedGoals = goals.filter((g) =>
    Number(g.current_amount) >= Number(g.target_amount)
  );

  return {
    year,
    totalIncome,
    totalExpenses,
    netSaved,
    savingsRate,
    biggestExpense,
    topCats,
    bestSavingMonth,
    mostActiveMonth,
    noSpendDays,
    txCount,
    expenseCount,
    avgMonthlySpend,
    personality,
    completedGoals,
    monthlyData,
    activeMonths,
  };
}

// ── Slide Builder ─────────────────────────────────────────────────────────────

function buildSlides(d) {
  const slides = [];

  // 1. Welcome
  slides.push({
    bg: '#1e1b4b',
    emoji: '🎬',
    label: `${d.year} Annual Recap`,
    headline: 'Your Financial\nYear in Review',
    sub: `${d.txCount} transactions. ${d.activeMonths} active months.\nOne incredible financial journey.`,
  });

  // 2. Total income
  if (d.totalIncome > 0) {
    slides.push({
      bg: '#064e3b',
      emoji: '💵',
      label: 'You earned',
      headline: fmt(d.totalIncome),
      sub: `Across ${d.activeMonths} month${d.activeMonths !== 1 ? 's' : ''} — every peso of that represents your time and effort. Own it.`,
    });
  }

  // 3. Total expenses
  slides.push({
    bg: '#1e3a5f',
    emoji: '💸',
    label: 'You spent',
    headline: fmt(d.totalExpenses),
    sub: `That's ${d.expenseCount} expense transactions, averaging ${fmt(d.avgMonthlySpend)} per active month.`,
  });

  // 4. Net savings
  if (d.totalIncome > 0) {
    const positive = d.netSaved >= 0;
    slides.push({
      bg: positive ? '#14532d' : '#7f1d1d',
      emoji: positive ? '🏦' : '😅',
      label: positive ? 'You saved' : 'Net balance',
      headline: positive ? fmt(d.netSaved) : `-${fmt(Math.abs(d.netSaved))}`,
      sub: positive
        ? `${d.savingsRate.toFixed(0)}% savings rate for ${d.year}. ${d.savingsRate >= 20 ? 'That\'s excellent! 🌟' : d.savingsRate >= 10 ? 'Solid progress!' : 'Every peso saved counts!'}`
        : `Expenses exceeded income this year. But you tracked everything — and awareness is the first step to change.`,
    });
  }

  // 5. Biggest purchase
  if (d.biggestExpense) {
    const bigDate = toPHDate(d.biggestExpense.created_at);
    slides.push({
      bg: '#312e81',
      emoji: '💳',
      label: 'Biggest single expense',
      headline: fmt(d.biggestExpense.amount),
      sub: `"${d.biggestExpense.description || d.biggestExpense.category}" on ${MONTH_SHORT[bigDate.getMonth()]} ${bigDate.getDate()}. Worth it? Only you know.`,
    });
  }

  // 6. Top spending category
  if (d.topCats.length > 0) {
    const [cat, amt] = d.topCats[0];
    slides.push({
      bg: '#78350f',
      emoji: '🏆',
      label: 'Your #1 category',
      headline: cat,
      sub: `You spent ${fmt(amt)} on ${cat} this year.${d.topCats.length > 1 ? `\nRunner-up: ${d.topCats[1][0]} (${fmt(d.topCats[1][1])}).` : ''}`,
    });
  }

  // 7. Best saving month
  if (d.bestSavingMonth && d.bestSavingMonth.saved > 0) {
    slides.push({
      bg: '#1c4532',
      emoji: '⭐',
      label: 'Your best month',
      headline: MONTH_NAMES[d.bestSavingMonth.month],
      sub: `You saved ${fmt(d.bestSavingMonth.saved)} in ${MONTH_NAMES[d.bestSavingMonth.month]} — your strongest month of the year. Can you beat it next year?`,
    });
  }

  // 8. Most active month
  if (d.mostActiveMonth && d.mostActiveMonth.txCount > 0) {
    slides.push({
      bg: '#0c4a6e',
      emoji: '📊',
      label: 'Most active month',
      headline: MONTH_NAMES[d.mostActiveMonth.month],
      sub: `You logged ${d.mostActiveMonth.txCount} transactions in ${MONTH_NAMES[d.mostActiveMonth.month]} — your most diligent tracking month!`,
    });
  }

  // 9. No-spend days
  slides.push({
    bg: '#1a2e05',
    emoji: '🚫',
    label: 'No-spend days',
    headline: `${d.noSpendDays}`,
    sub: d.noSpendDays >= 100
      ? `${d.noSpendDays} days without spending — that's ${(d.noSpendDays / 365 * 100).toFixed(0)}% of the year. Incredible restraint!`
      : d.noSpendDays >= 50
        ? `${d.noSpendDays} no-spend days. A solid foundation of mindful restraint.`
        : `${d.noSpendDays} no-spend days this year. Challenge: can you double it next year?`,
  });

  // 10. Spending personality
  if (d.personality) {
    const p = d.personality;
    slides.push({
      bg: p.color,
      emoji: p.emoji,
      label: `Your ${d.year} money personality`,
      headline: p.name,
      sub: `${p.tagline}\n${p.description.split('.')[0]}.`,
    });
  }

  // 11. Goal achievements
  if (d.completedGoals.length > 0) {
    slides.push({
      bg: '#4c1d95',
      emoji: '🎯',
      label: 'Goals achieved',
      headline: `${d.completedGoals.length} Goal${d.completedGoals.length > 1 ? 's' : ''}`,
      sub: `You completed: ${d.completedGoals.map((g) => `"${g.title}"`).join(', ')}. That's real life-changing progress!`,
    });
  }

  // 12. Outro
  slides.push({
    bg: '#1e1b4b',
    emoji: '🚀',
    label: `${d.year} was just the beginning`,
    headline: `Here's to ${d.year + 1}!`,
    sub: 'You showed up. You tracked. You grew.\nYour future self already thanks you. 🙏',
  });

  return slides;
}

// ── Year Picker ───────────────────────────────────────────────────────────────

function YearPicker({ selectedYear, availableYears, onSelect, colors }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearPickerRow}>
      {availableYears.map((y) => (
        <TouchableOpacity
          key={y}
          style={[
            styles.yearChip,
            { borderColor: colors.border, backgroundColor: colors.primaryLight },
            selectedYear === y && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => onSelect(y)}
          activeOpacity={0.8}
        >
          <Text style={[styles.yearChipText, { color: selectedYear === y ? '#fff' : colors.primary }]}>
            {y}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnnualWrapped({ transactions, budgets, goals }) {
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);

  const now = getPHNow();
  const currentYear = now.getFullYear();

  // Find available years
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map((t) => toPHDate(t.created_at).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }, [transactions]);

  const [selectedYear, setSelectedYear] = useState(currentYear);

  const data = useMemo(
    () => computeAnnualData(transactions, budgets, goals, selectedYear),
    [transactions, budgets, goals, selectedYear]
  );

  if (availableYears.length === 0 || !data) return null;

  const slides = buildSlides(data);

  const handleNext = () => {
    if (slide < slides.length - 1) setSlide((s) => s + 1);
    else { setOpen(false); setSlide(0); }
  };

  const handleClose = () => { setOpen(false); setSlide(0); };

  const handleShare = async () => {
    const s = slides[slide];
    try {
      await Share.share({
        message: `${s.emoji} ${s.label}\n\n${s.headline}\n\n${s.sub || ''}\n\n— My ${selectedYear} Spendie Annual Wrapped 🎬`,
      });
    } catch {}
  };

  return (
    <>
      {/* Entry card */}
      <TouchableOpacity
        style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <View style={styles.entryLeft}>
          <View style={[styles.entryIconWrap, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.entryEmoji}>🎬</Text>
          </View>
          <View>
            <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>Annual Wrapped 🎬</Text>
            <Text style={[styles.entrySub, { color: colors.textMuted }]}>
              Your full {selectedYear} financial story
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.primary} />
      </TouchableOpacity>

      {/* Year picker (if multi-year data) */}
      {availableYears.length > 1 && (
        <YearPicker
          selectedYear={selectedYear}
          availableYears={availableYears}
          onSelect={(y) => { setSelectedYear(y); setSlide(0); }}
          colors={colors}
        />
      )}

      {/* Full-screen story modal */}
      <Modal visible={open} animationType="slide" transparent={false} onRequestClose={handleClose}>
        <View style={{ flex: 1, backgroundColor: slides[slide].bg }}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X size={20} color="#fff" />
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤</Text>
          </TouchableOpacity>

          {/* Slide dots */}
          <View style={styles.dotsRow}>
            {slides.map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dot, i === slide && styles.dotActive]}
                onPress={() => setSlide(i)}
              />
            ))}
          </View>

          {/* Content */}
          <View style={styles.slideContent}>
            <Text style={styles.slideEmoji}>{slides[slide].emoji}</Text>
            <Text style={styles.slideLabel}>{slides[slide].label}</Text>
            <Text style={styles.slideHeadline}>{slides[slide].headline}</Text>
            {slides[slide].sub ? (
              <Text style={styles.slideSub}>{slides[slide].sub}</Text>
            ) : null}
          </View>

          {/* Next button */}
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {slide < slides.length - 1 ? 'Next  →' : '🎉  Finish'}
            </Text>
          </TouchableOpacity>

          {/* Year indicator */}
          <Text style={styles.yearIndicator}>{selectedYear}</Text>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Entry card
  entryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryEmoji: { fontSize: 28 },
  entryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  entrySub: { fontSize: 12 },

  // Year picker
  yearPickerRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  yearChipText: { fontSize: 14, fontWeight: '700' },

  // Modal
  closeBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shareBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shareBtnText: { fontSize: 18 },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingTop: 100,
    gap: 5,
    paddingHorizontal: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 20,
  },

  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  slideEmoji: { fontSize: 72, marginBottom: 20 },
  slideLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },
  slideHeadline: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 14,
  },
  slideSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 23,
  },

  nextBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  yearIndicator: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 24,
    fontWeight: '600',
  },
});
