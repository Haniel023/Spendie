/**
 * Spendie Memory Engine
 *
 * Generates nostalgic, emotional financial memory cards:
 *   - "One year ago today..." transaction anniversaries
 *   - "6 months ago..." flashbacks
 *   - First-ever transaction anniversary
 *   - Seasonal comparisons
 *   - Month-over-month deja vu
 *
 * Tone: warm, curious, never guilt-tripping.
 * Always includes a forward-looking note.
 */

import { toPHDate, getPHNow } from './timezone';

const fmt = (n) =>
  `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function sameDay(a, b) {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function sameDayLastYear(d, now) {
  return d.getFullYear() === now.getFullYear() - 1 && sameDay(d, now);
}

function sameDaySixMonthsAgo(d, now) {
  const target = new Date(now);
  target.setMonth(target.getMonth() - 6);
  return d.getFullYear() === target.getFullYear() && sameDay(d, target);
}

/**
 * Generate memory cards from transaction history.
 *
 * @param {Array} transactions - all transactions (sorted desc)
 * @returns {Array} memory card objects: { icon, title, message, type, date? }
 */
export function generateMemoryCards(transactions = []) {
  if (transactions.length < 5) return [];

  const now = getPHNow();
  const memories = [];

  // ── 1. One Year Ago Today ─────────────────────────────────────────────────
  const oneYearAgoTx = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return sameDayLastYear(d, now);
  });

  if (oneYearAgoTx.length > 0) {
    const yearAgoDate = new Date(now); yearAgoDate.setFullYear(yearAgoDate.getFullYear() - 1);
    const expenses = oneYearAgoTx.filter((t) => t.type === 'expense');
    const income = oneYearAgoTx.filter((t) => t.type === 'income');

    if (expenses.length > 0) {
      const biggest = expenses.reduce((m, t) => Number(t.amount) > Number(m.amount) ? t : m, expenses[0]);
      memories.push({
        icon: '📅',
        type: 'anniversary',
        title: 'One Year Ago Today',
        message: `On this day last year, you spent ${fmt(biggest.amount)} on "${biggest.description || biggest.category}". How does that decision look now?`,
        lookback: `${MONTH_NAMES[yearAgoDate.getMonth()]} ${yearAgoDate.getDate()}, ${yearAgoDate.getFullYear()}`,
        nudge: 'A year of tracking = a year of growth. Keep the streak going!',
      });
    }

    if (income.length > 0) {
      const totalInc = income.reduce((s, t) => s + Number(t.amount), 0);
      memories.push({
        icon: '🎉',
        type: 'income_anniversary',
        title: 'Payday Memory',
        message: `Exactly one year ago, you received ${fmt(totalInc)} in income. How has your income journey changed since then?`,
        lookback: `${MONTH_NAMES[yearAgoDate.getMonth()]} ${yearAgoDate.getDate()}, ${yearAgoDate.getFullYear()}`,
        nudge: 'Income milestones are worth celebrating. You\'re still here — that\'s everything.',
      });
    }
  }

  // ── 2. Six Months Ago ─────────────────────────────────────────────────────
  const sixMonthAgoTx = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return sameDaySixMonthsAgo(d, now);
  });

  if (sixMonthAgoTx.length > 0) {
    const sixMonthDate = new Date(now); sixMonthDate.setMonth(sixMonthDate.getMonth() - 6);
    const total = sixMonthAgoTx.reduce((s, t) =>
      s + (t.type === 'expense' ? Number(t.amount) : 0), 0
    );
    if (total > 0) {
      memories.push({
        icon: '⏳',
        type: 'six_months',
        title: 'Half a Year Ago',
        message: `Six months ago today, you spent ${fmt(total)} across ${sixMonthAgoTx.filter(t => t.type === 'expense').length} transaction(s). Time flies — and so does money!`,
        lookback: `${MONTH_NAMES[sixMonthDate.getMonth()]} ${sixMonthDate.getDate()}`,
        nudge: 'Every peso you tracked back then built today\'s awareness. Well done.',
      });
    }
  }

  // ── 3. First Transaction Anniversary ─────────────────────────────────────
  const oldest = [...transactions].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )[0];

  if (oldest) {
    const firstDate = toPHDate(oldest.created_at);
    const daysSince = Math.floor((now - firstDate) / 86400000);

    // Show on milestones: 30, 60, 90, 180, 365, 730 days
    const milestones = [30, 60, 90, 180, 365, 730];
    if (milestones.includes(daysSince)) {
      memories.push({
        icon: '🌱',
        type: 'first_anniversary',
        title: `${daysSince}-Day Money Journey`,
        message: `${daysSince} days ago, you logged your very first transaction: ${fmt(oldest.amount)} on "${oldest.description || oldest.category}". That first step started everything.`,
        lookback: `${MONTH_NAMES[firstDate.getMonth()]} ${firstDate.getDate()}, ${firstDate.getFullYear()}`,
        nudge: `${daysSince} days of financial awareness. Your future self sends a thank-you. 🙏`,
      });
    }
  }

  // ── 4. Same Month Last Year Comparison ───────────────────────────────────
  const thisMonthLastYear = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() - 1;
  });

  const thisMonthNow = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  if (thisMonthLastYear.length > 0 && thisMonthNow.length > 0) {
    const lastYearExpenses = thisMonthLastYear
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const thisYearExpenses = thisMonthNow
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);

    if (lastYearExpenses > 0 && thisYearExpenses > 0) {
      const diff = thisYearExpenses - lastYearExpenses;
      const pct = Math.abs((diff / lastYearExpenses) * 100).toFixed(0);
      const improved = diff < 0;

      memories.push({
        icon: improved ? '📉' : '📈',
        type: 'year_comparison',
        title: `${MONTH_NAMES[now.getMonth()]}: Year Over Year`,
        message: improved
          ? `This ${MONTH_NAMES[now.getMonth()]}, you've spent ${pct}% LESS than last year (${fmt(thisYearExpenses)} vs ${fmt(lastYearExpenses)}). That's real, measurable growth! 🎯`
          : `This ${MONTH_NAMES[now.getMonth()]}, spending is up ${pct}% vs last year (${fmt(thisYearExpenses)} vs ${fmt(lastYearExpenses)}). Worth a closer look?`,
        lookback: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear() - 1}`,
        nudge: improved
          ? 'Year-over-year improvement is one of the best financial signals. You\'re doing it!'
          : 'Knowing is the first step. Let\'s see if we can close the gap next month!',
      });
    }
  }

  // ── 5. Best Month Memory ──────────────────────────────────────────────────
  // Find the month with highest savings (income - expense) in the past 12 months
  const monthMap = {};
  transactions.forEach((t) => {
    const d = toPHDate(t.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0, month: d.getMonth(), year: d.getFullYear() };
    if (t.type === 'income') monthMap[key].income += Number(t.amount);
    if (t.type === 'expense') monthMap[key].expense += Number(t.amount);
  });

  const monthEntries = Object.values(monthMap)
    .filter((m) => {
      const mDate = new Date(m.year, m.month, 1);
      const twelveMonthsAgo = new Date(now); twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      return mDate >= twelveMonthsAgo && !(m.month === now.getMonth() && m.year === now.getFullYear());
    })
    .map((m) => ({ ...m, saved: m.income - m.expense }))
    .sort((a, b) => b.saved - a.saved);

  if (monthEntries.length > 0 && monthEntries[0].saved > 0) {
    const best = monthEntries[0];
    // Only show this memory once per week (based on day of week)
    if (now.getDay() === 1) { // Monday
      memories.push({
        icon: '🏆',
        type: 'best_month',
        title: 'Your Best Month (Last 12 Mo)',
        message: `Your strongest financial month in the past year was ${MONTH_NAMES[best.month]} ${best.year} — you saved ${fmt(best.saved)}! That's the standard to beat.`,
        lookback: `${MONTH_NAMES[best.month]} ${best.year}`,
        nudge: 'Your best month proves you can do it. Chase that again!',
      });
    }
  }

  // Return up to 3 cards, most interesting first
  return memories.slice(0, 3);
}
