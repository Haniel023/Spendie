/**
 * Monthly Financial Review — "Spendie Wrapped"
 *
 * A Spotify Wrapped-style summary of the user's financial month.
 * Accessible from the Profile tab or triggered at month-end.
 */

import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Pressable,
} from 'react-native';
import { X, ChevronRight } from 'lucide-react-native';
import { toPHDate, getPHNow } from '../../lib/timezone';
import { computeSpendingPersonality } from '../../lib/spendingPersonality';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n) {
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Slide Components ─────────────────────────────────────────────────────────

function SlideWrapper({ gradient, children }) {
  return (
    <View style={[styles.slide, { backgroundColor: gradient }]}>
      {children}
    </View>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MonthlyReview({ transactions, budgets, goals }) {
  const [open,  setOpen]  = useState(false);
  const [slide, setSlide] = useState(0);

  const phNow   = getPHNow();
  const dayOfMonth = phNow.getDate();

  // Only visible on day 30 or 31 of the current month (end-of-month only).
  // That way the full month's data is captured before users see their Wrapped.
  const isEndOfMonth = dayOfMonth >= 30;

  // Always review the CURRENT month when shown at month-end.
  const reviewMonth = phNow.getMonth();
  const reviewYear  = phNow.getFullYear();

  const data = useMemo(() => {
    const monthTx = transactions.filter((t) => {
      const d = toPHDate(t.created_at);
      return d.getMonth() === reviewMonth && d.getFullYear() === reviewYear;
    });

    const expenses = monthTx.filter((t) => t.type === 'expense');
    const income   = monthTx.filter((t) => t.type === 'income');

    const totalSpent  = expenses.reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = income.reduce((s, t)   => s + Number(t.amount), 0);
    const saved       = totalIncome - totalSpent;
    const savingsRate = totalIncome > 0 ? ((saved / totalIncome) * 100) : 0;

    // Category breakdown
    const catMap = {};
    expenses.forEach((t) => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });
    const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Best saving day (day with no expenses)
    const spendDays = new Set(expenses.map((t) => toPHDate(t.created_at).getDate()));
    const daysInMonth = new Date(reviewYear, reviewMonth + 1, 0).getDate();
    const noSpendDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      if (!spendDays.has(d)) noSpendDays.push(d);
    }

    // Biggest single expense
    const biggestTx = expenses.length > 0
      ? expenses.reduce((max, t) => Number(t.amount) > Number(max.amount) ? t : max, expenses[0])
      : null;

    // Transaction count
    const txCount = monthTx.length;

    // Personality for this month
    const personality = computeSpendingPersonality({ transactions: monthTx, budgets, goals });

    // Compare to previous month
    const prevMonth = reviewMonth === 0 ? 11 : reviewMonth - 1;
    const prevYear  = reviewMonth === 0 ? reviewYear - 1 : reviewYear;
    const prevSpent = transactions
      .filter((t) => {
        const d = toPHDate(t.created_at);
        return t.type === 'expense' && d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    const vsLastMonth = prevSpent > 0
      ? ((totalSpent - prevSpent) / prevSpent * 100)
      : null;

    return {
      month: MONTH_NAMES[reviewMonth],
      year: reviewYear,
      totalSpent,
      totalIncome,
      saved,
      savingsRate,
      topCats,
      noSpendDays: noSpendDays.length,
      biggestTx,
      txCount,
      personality,
      vsLastMonth,
    };
  }, [transactions, budgets, goals, reviewMonth, reviewYear]);

  // Only render the card during the last 2 days of the month
  if (!isEndOfMonth) return null;
  if (transactions.length < 3) return null;

  const slides = buildSlides(data);

  const handleNext = () => {
    if (slide < slides.length - 1) setSlide(s => s + 1);
    else { setOpen(false); setSlide(0); }
  };

  const handleClose = () => { setOpen(false); setSlide(0); };

  return (
    <>
      {/* Entry point card */}
      <TouchableOpacity style={styles.entryCard} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <View style={styles.entryLeft}>
          <Text style={styles.entryEmoji}>🎬</Text>
          <View>
            <Text style={styles.entryTitle}>Spendie Wrapped 🎬</Text>
            <Text style={styles.entrySubtitle}>{data.month} {data.year} — End of Month Review</Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.primary} />
      </TouchableOpacity>

      {/* Full-screen review modal */}
      <Modal visible={open} animationType="slide" transparent={false} onRequestClose={handleClose}>
        <View style={styles.modalContainer}>
          <SlideWrapper gradient={slides[slide].bg}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={20} color="#fff" />
            </TouchableOpacity>

            {/* Slide content */}
            <View style={styles.slideContent}>
              <Text style={styles.slideEmoji}>{slides[slide].emoji}</Text>
              <Text style={styles.slideLabel}>{slides[slide].label}</Text>
              <Text style={styles.slideHeadline}>{slides[slide].headline}</Text>
              {slides[slide].sub ? (
                <Text style={styles.slideSub}>{slides[slide].sub}</Text>
              ) : null}
            </View>

            {/* Slide dots */}
            <View style={styles.dots}>
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === slide && styles.dotActive]}
                />
              ))}
            </View>

            {/* Next / Finish button */}
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>
                {slide < slides.length - 1 ? 'Next  →' : '🎉  Finish'}
              </Text>
            </TouchableOpacity>
          </SlideWrapper>
        </View>
      </Modal>
    </>
  );
}

// ── Slide Builder ─────────────────────────────────────────────────────────────

function buildSlides(d) {
  const slides = [];

  // 1. Welcome
  slides.push({
    bg:       '#7c3aed',
    emoji:    '📅',
    label:    `${d.month} ${d.year}`,
    headline: 'Your Monthly\nFinancial Review',
    sub:      'Swipe through to see your money story this month.',
  });

  // 2. Total spent
  slides.push({
    bg:       '#1e40af',
    emoji:    '💸',
    label:    'You spent',
    headline: fmt(d.totalSpent),
    sub:      d.vsLastMonth !== null
      ? d.vsLastMonth > 0
        ? `That's ${Math.abs(d.vsLastMonth).toFixed(0)}% more than last month.`
        : `That's ${Math.abs(d.vsLastMonth).toFixed(0)}% less than last month — great!`
      : `Across ${d.txCount} transaction${d.txCount !== 1 ? 's' : ''} this month.`,
  });

  // 3. Savings
  if (d.totalIncome > 0) {
    slides.push({
      bg: d.saved >= 0 ? '#065f46' : '#7f1d1d',
      emoji: d.saved >= 0 ? '💰' : '😬',
      label:    'You saved',
      headline: d.saved >= 0 ? fmt(d.saved) : `- ${fmt(Math.abs(d.saved))}`,
      sub:      d.saved >= 0
        ? `That's a ${d.savingsRate.toFixed(0)}% savings rate. ${d.savingsRate >= 20 ? 'Excellent work!' : d.savingsRate >= 10 ? 'Good job — keep growing it!' : 'Small steps still count!'}`
        : `You spent more than you earned this month. Let\'s get back on track next month!`,
    });
  }

  // 4. Top spending category
  if (d.topCats.length > 0) {
    const [cat, amt] = d.topCats[0];
    slides.push({
      bg:       '#92400e',
      emoji:    '🏆',
      label:    'Your top category',
      headline: cat,
      sub:      `You spent ${fmt(amt)} on ${cat} this month.${d.topCats.length > 1 ? ` Runner-up: ${d.topCats[1][0]} (${fmt(d.topCats[1][1])}).` : ''}`,
    });
  }

  // 5. Biggest purchase
  if (d.biggestTx) {
    slides.push({
      bg:       '#1e3a5f',
      emoji:    '💳',
      label:    'Biggest single expense',
      headline: fmt(d.biggestTx.amount),
      sub:      `"${d.biggestTx.description || d.biggestTx.category}" on ${toPHDate(d.biggestTx.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}.`,
    });
  }

  // 6. No-spend days
  slides.push({
    bg:       '#134e4a',
    emoji:    '🚫',
    label:    'No-spend days',
    headline: `${d.noSpendDays} day${d.noSpendDays !== 1 ? 's' : ''}`,
    sub:      d.noSpendDays >= 10
      ? 'Amazing restraint! You kept your wallet closed on many days.'
      : d.noSpendDays >= 5
        ? 'Good effort — try to increase no-spend days next month!'
        : 'Challenge yourself: can you hit 10 no-spend days next month?',
  });

  // 7. Spending personality
  if (d.personality) {
    const p = d.personality;
    slides.push({
      bg:       p.color,
      emoji:    p.emoji,
      label:    'Your money personality this month',
      headline: p.name,
      sub:      p.tagline + '\n' + p.description.split('.')[0] + '.',
    });
  }

  // 8. Outro
  slides.push({
    bg:       '#4c1d95',
    emoji:    '🚀',
    label:    `${d.month} is done`,
    headline: 'On to new goals!',
    sub:      'Keep logging, keep growing. Your future self is watching 👀',
  });

  return slides;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Entry card
  entryCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.card,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  entryEmoji: { fontSize: 32 },
  entryTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  entrySubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Modal
  modalContainer: { flex: 1 },
  slide: { flex: 1, justifyContent: 'space-between', padding: spacing.xxl, paddingTop: 60 },

  closeBtn: {
    position: 'absolute',
    top: 48,
    right: spacing.xxl,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  slideEmoji:    { fontSize: 72, marginBottom: spacing.lg },
  slideLabel:    { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm, textAlign: 'center' },
  slideHeadline: { fontSize: 42, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 48, marginBottom: spacing.md },
  slideSub:      { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#fff', width: 20 },

  nextBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
