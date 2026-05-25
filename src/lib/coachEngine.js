/**
 * AI Financial Coach Personality Engine
 *
 * Six selectable personalities that generate personalized financial commentary.
 * Each personality has its own tone, vocabulary, and emoji palette.
 *
 * Personalities:
 *   supportive  — warm, encouraging, empathetic
 *   strict      — firm, no-nonsense, disciplined
 *   roast       — funny, viral, self-aware humor
 *   analyst     — corporate data-driven speak
 *   anime       — dramatic, power-level energy
 *   minimal     — short, zen, distraction-free
 */

const fmt = (n) =>
  `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Personality Metadata ───────────────────────────────────────────────────────

export const COACH_PERSONALITIES = {
  supportive: {
    id: 'supportive',
    name: 'Supportive Coach',
    emoji: '🤗',
    tagline: 'Your biggest financial cheerleader',
    description: 'Warm, encouraging — frames everything with kindness and growth mindset.',
  },
  strict: {
    id: 'strict',
    name: 'Budget Guardian',
    emoji: '⚔️',
    tagline: 'Discipline over excuses',
    description: 'Firm, direct, no-nonsense. Every peso must justify its existence.',
  },
  roast: {
    id: 'roast',
    name: 'Roast Mode',
    emoji: '🎤',
    tagline: 'Your wallet fears Shopee notifications',
    description: 'Funny, viral-friendly spending commentary. Completely optional.',
  },
  analyst: {
    id: 'analyst',
    name: 'Corporate Analyst',
    emoji: '📊',
    tagline: 'Q3 spending metrics exceeded projections',
    description: 'Professional, data-driven, corporate tone. Treats your wallet like a portfolio.',
  },
  anime: {
    id: 'anime',
    name: 'Anime Mentor',
    emoji: '⚡',
    tagline: 'Your final form is financial freedom',
    description: 'Dramatic, high-energy, power-level framing for every financial decision.',
  },
  minimal: {
    id: 'minimal',
    name: 'Calm Minimalist',
    emoji: '🍃',
    tagline: 'Less noise. More clarity.',
    description: 'Short, calm, distraction-free. One sentence max.',
  },
};

export const PERSONALITY_ORDER = ['supportive', 'strict', 'roast', 'analyst', 'anime', 'minimal'];

// ── Response Templates ─────────────────────────────────────────────────────────

const RESPONSES = {
  supportive: {
    excellent: (rate) => ({
      icon: '🌟',
      title: 'You\'re absolutely crushing it!',
      text: `A ${rate.toFixed(0)}% savings rate this month — that's something to genuinely celebrate 🎉 You're building real momentum, and your future self is already grateful. Keep this beautiful energy going!`,
    }),
    good: (rate) => ({
      icon: '💪',
      title: 'Solid progress this month!',
      text: `${rate.toFixed(0)}% saved — you're doing better than most! You've laid a strong foundation. Let's grow that number just a bit more next month. You've got this!`,
    }),
    neutral: () => ({
      icon: '🤗',
      title: 'Every tracked peso counts!',
      text: `The act of logging your finances is already a huge win. Awareness is the first step to freedom. Keep at it — small habits, big results!`,
    }),
    negative: (amt) => ({
      icon: '💛',
      title: 'Overspending happens — you\'ve got this.',
      text: `You spent ${fmt(amt)} more than you earned this month. That's okay! You noticed it, and that's huge. Let's regroup next month with a gentle spending reset. Progress, not perfection. 🌱`,
    }),
    budgetExceeded: () => ({
      icon: '⚠️',
      title: 'Budget stretched a bit this month',
      text: `One of your budgets got a little cozy past its limit. No worries — awareness is step one. Let's identify where to trim next month and celebrate the categories you nailed!`,
    }),
    noData: () => ({
      icon: '📝',
      title: 'Let\'s start your journey!',
      text: `Log your first transactions and I'll start giving you personalized coaching! Every peso tracked is a step toward financial freedom. You're in the right place 🚀`,
    }),
  },

  strict: {
    excellent: (rate) => ({
      icon: '✅',
      title: `${0}% savings rate — acceptable.`,
      text: `${rate.toFixed(0)}% savings rate. This meets minimum acceptable standards. Maintain or exceed this. Complacency is the enemy of financial progress. No celebrations — keep executing.`,
    }),
    good: (rate) => ({
      icon: '📋',
      title: 'Decent. Not exceptional.',
      text: `${rate.toFixed(0)}% savings rate is above average but below optimal. Identify one category to cut by 10% next month. There is always room to optimize. Execute accordingly.`,
    }),
    neutral: () => ({
      icon: '⚔️',
      title: 'Track. Every. Peso.',
      text: `Every unlogged transaction is a gap in your financial defense. Discipline is built through consistency, not motivation. Log everything. No exceptions. No excuses.`,
    }),
    negative: (amt) => ({
      icon: '🚨',
      title: 'Unacceptable. Review immediately.',
      text: `You overspent by ${fmt(amt)}. This is a failure of planning, not circumstance. Audit your discretionary spending now. Cut at least 20% next month. This does not repeat.`,
    }),
    budgetExceeded: () => ({
      icon: '🛑',
      title: 'Budget violated.',
      text: `A budget has been exceeded. This is a planning failure. Renegotiate your limits immediately and eliminate the overspending category's discretionary items. Results, not excuses.`,
    }),
    noData: () => ({
      icon: '📌',
      title: 'No data. No analysis.',
      text: `You cannot manage what you don't measure. Start logging transactions immediately. Financial discipline begins with a single logged entry.`,
    }),
  },

  roast: {
    excellent: (rate) => ({
      icon: '🏆',
      title: `${0}% savings rate?! Who ARE you?`,
      text: `${rate.toFixed(0)}% saved this month. Your future self just promoted you to VP of Life Decisions. Your bank account is lowkey glowing. Don't ruin it with a "treat yourself" weekend.`,
    }),
    good: (rate) => ({
      icon: '😏',
      title: 'Good job. Your coffee habit is nervous.',
      text: `${rate.toFixed(0)}% savings rate — you're doing well. But your impulse purchases are in a meeting right now strategizing a comeback. Stay vigilant. Shopee is always watching.`,
    }),
    neutral: () => ({
      icon: '👀',
      title: 'You\'re logging transactions. Brave.',
      text: `You KNOW what you're doing with your money. That's terrifying for your impulse purchases and beautiful for your savings goal. Your wallet's villain arc is slowly ending.`,
    }),
    negative: (amt) => ({
      icon: '💀',
      title: 'Your wallet filed a missing persons report.',
      text: `You overspent by ${fmt(amt)}. Shopee sent a thank-you card. GrabFood added you to their VIP list. Your future self is drafting a strongly-worded letter. Time for the comeback arc.`,
    }),
    budgetExceeded: () => ({
      icon: '🔥',
      title: 'Budget? More like a suggestion.',
      text: `Your budget said "please, I'm begging you" and you said "that's cute." A category got absolutely demolished. Time for the Budget Villain Redemption Arc™. You got this (maybe).`,
    }),
    noData: () => ({
      icon: '🫣',
      title: 'No transactions logged. Interesting choice.',
      text: `Either you're living off the land or you're too scared to see the truth. Log your transactions. Knowledge is power. Ignorance is just delayed chaos.`,
    }),
  },

  analyst: {
    excellent: (rate) => ({
      icon: '📈',
      title: 'KPI target exceeded — strong performance.',
      text: `Savings rate at ${rate.toFixed(0)}% — exceeds our projected 15% benchmark. Fiscal discipline metrics trending favorably. Recommend maintaining current allocation strategy and exploring investment vehicles.`,
    }),
    good: (rate) => ({
      icon: '📊',
      title: 'Performance above median benchmark.',
      text: `${rate.toFixed(0)}% savings rate recorded. Above median but below optimal threshold of 25%. Recommend a 5% reduction in discretionary spend to maximize quarterly position. ROI on current trajectory: positive.`,
    }),
    neutral: () => ({
      icon: '🗂️',
      title: 'Baseline data acquisition mode.',
      text: `Financial data is being captured. Consistent logging correlates with 43% improved fiscal outcomes in similar cohorts. Recommend expanding transaction categorization for deeper analytics.`,
    }),
    negative: (amt) => ({
      icon: '📉',
      title: 'Negative cash flow event detected.',
      text: `Cash flow deficit of ${fmt(amt)} recorded this period. Immediate expense audit recommended. Propose reallocating 15-20% of discretionary budget to restore positive position. Course correction required.`,
    }),
    budgetExceeded: () => ({
      icon: '⚡',
      title: 'Budget variance flagged for review.',
      text: `Category overspend detected. Variance exceeds acceptable threshold. ROI on current spending pattern is suboptimal. Recommend strategic reallocation and category-level audit by EOD.`,
    }),
    noData: () => ({
      icon: '🔍',
      title: 'Insufficient data for analysis.',
      text: `Dataset is empty. Analytics engine requires minimum transaction volume for meaningful insights. Begin data entry immediately to enable predictive modeling and budget optimization recommendations.`,
    }),
  },

  anime: {
    excellent: (rate) => ({
      icon: '⚡',
      title: 'THIS POWER LEVEL IS EXTRAORDINARY!!',
      text: `${rate.toFixed(0)}% savings rate?! Your financial aura is BLINDING! The final boss of debt trembles before you! Your ancestors of frugality are weeping tears of pride! KEEP ASCENDING!`,
    }),
    good: (rate) => ({
      icon: '🔥',
      title: 'You are growing stronger. But this is not your final form.',
      text: `${rate.toFixed(0)}% saved — impressive, but you have not yet reached your limit! The path to financial mastery is long, and you are only beginning to unlock your TRUE POTENTIAL!`,
    }),
    neutral: () => ({
      icon: '🌟',
      title: 'The journey of a thousand pesos begins here.',
      text: `Every logged transaction is a step on the path of financial enlightenment. The ancestors of wise spending smile upon you. Channel your inner discipline and RISE!`,
    }),
    negative: (amt) => ({
      icon: '💔',
      title: 'Even warriors fall. But they always rise again.',
      text: `You overspent by ${fmt(amt)}... This is a dark arc, but every great hero has one. Channel this pain into UNSTOPPABLE DISCIPLINE next month. YOUR COMEBACK ARC BEGINS NOW!`,
    }),
    budgetExceeded: () => ({
      icon: '⚠️',
      title: 'The budget barrier has been SHATTERED!',
      text: `A budget has been defeated in battle! But a true warrior learns from defeat! Study the enemy — your spending pattern — and return with a plan forged in discipline and RESOLVE!`,
    }),
    noData: () => ({
      icon: '🌑',
      title: 'A warrior\'s journey cannot begin without knowing their enemy.',
      text: `Your financial data is empty... You cannot defeat what you do not see. BEGIN LOGGING! The path to financial mastery starts with a single entry. YOUR SAGA BEGINS NOW!`,
    }),
  },

  minimal: {
    excellent: (rate) => ({
      icon: '✓',
      title: `${0}% saved.`,
      text: `${rate.toFixed(0)}% savings rate. Well done. Sustain this.`,
    }),
    good: (rate) => ({
      icon: '·',
      title: 'Steady progress.',
      text: `${rate.toFixed(0)}% saved. On track. Keep it simple, keep it consistent.`,
    }),
    neutral: () => ({
      icon: '🍃',
      title: 'Awareness creates change.',
      text: `Keep logging. Every entry matters. That's enough for now.`,
    }),
    negative: (amt) => ({
      icon: '↓',
      title: 'Overspent.',
      text: `${fmt(amt)} over budget this month. Note it. Adjust next month. Move forward.`,
    }),
    budgetExceeded: () => ({
      icon: '!',
      title: 'Budget exceeded.',
      text: `One category over limit. Review. Revise. Done.`,
    }),
    noData: () => ({
      icon: '○',
      title: 'Start logging.',
      text: `No data yet. Add a transaction. Begin.`,
    }),
  },
};

// ── Zero-balance mid-month responses ──────────────────────────────────────────

const ZERO_BALANCE = {
  supportive: {
    icon: '💛',
    title: 'Running on empty — regroup time!',
    text: `Your balance is ₱0.00 and the month isn't over yet. Pausing discretionary spending now and planning your next income will make a big difference. You've got this — awareness is everything! 🌱`,
  },
  strict: {
    icon: '🛑',
    title: 'Zero balance before month-end.',
    text: `Your balance has reached ₱0.00 mid-month. This is a critical signal: expenses have consumed your entire income. No further discretionary spending until next income hits. Audit all categories now.`,
  },
  roast: {
    icon: '💀',
    title: 'Your balance has left the chat.',
    text: `₱0.00. Your money evaporated and the month isn't even over. Shopee, GrabFood, and every impulse buy high-fived each other. The comeback arc starts TODAY. 😤`,
  },
  analyst: {
    icon: '📉',
    title: 'Zero liquidity event detected.',
    text: `Balance at ₱0.00 with residual month days remaining. All available funds have been allocated. Recommend immediate spend freeze and incoming cash flow projection to avoid negative position.`,
  },
  anime: {
    icon: '⚡',
    title: 'HP DROPPED TO ZERO — MID-MONTH!',
    text: `Your balance hit ₱0.00 before the month ended! This is the DARKEST POINT of your financial arc! But every hero recovers! SAVE EVERYTHING until your next income — YOUR COMEBACK STARTS NOW!`,
  },
  minimal: {
    icon: '!',
    title: 'Balance: ₱0.00.',
    text: `Month not over. Pause all spending. Wait for income.`,
  },
};

// ── Inactivity Messages (2+ days without any log) ─────────────────────────────

const INACTIVITY_MESSAGES = {
  supportive: [
    { title: '💛 We miss you!', body: "Hey! It's been 2+ days since your last log. No pressure — just a gentle nudge. Every peso tracked is a step forward. You've got this! 🤗" },
    { title: '📒 Quick check-in?', body: '2 days logged-free. That happens! Come back and log — even small entries keep your financial story going. You can do it! 💪' },
    { title: '🌱 Keep growing!', body: "Your money journey paused for a couple of days. That's totally okay! Log today and keep building that habit. Small steps matter. 🌟" },
  ],
  strict: [
    { title: '⚔️ 2 Days. No Logs.', body: 'Your budget has been operating blind. Every unlogged peso is a gap in your financial intelligence. Open the app. Log now.' },
    { title: '🚨 Discipline Check', body: '48 hours of silence from your tracker. This is exactly how budgets fall apart. Log your spending immediately.' },
    { title: '⚔️ Accountability Time', body: "You've been away for 2 days. Your financial plan doesn't pause because you did. Get back on track. Now." },
  ],
  roast: [
    { title: '🎤 Caught You Slacking', body: "2 days, no logs. Bestie, your money is literally out there unsupervised. Like a toddler loose in a mall. Good luck. 💅" },
    { title: '👀 The Audacity', body: "2 whole days of financial ghosting. Your budget is in the comments section asking where you went. 😭" },
    { title: '🎤 Missing: 1 User', body: 'Last seen: 2 days ago. Spending has been unmonitored since. Somewhere, an impulse buy is celebrating. 🛍️' },
  ],
  analyst: [
    { title: '📊 Logging Gap Detected', body: 'Alert: 48+ hour data gap in your financial records. Current period reporting accuracy: compromised. Log now to restore data integrity.' },
    { title: '📈 Data Continuity Issue', body: 'Your transaction log has a 2-day gap. This impacts monthly trend accuracy and budget variance calculations. Immediate re-entry recommended.' },
    { title: '📊 Portfolio Alert', body: 'Unlogged expenditures detected across 48+ hours. This distorts your spending KPIs. Please resume logging to maintain analytical integrity.' },
  ],
  anime: [
    { title: '⚡ YOUR POWER IS FADING!', body: '2 days have passed and your financial aura weakens!! The path to financial freedom does not wait! Return and LOG YOUR EXPENSES! 🔥' },
    { title: '🔥 The Journey Calls You Back!', body: 'A true hero never abandons their mission! 2 days without logging — your wallet needs you, senpai!! Come back stronger!! ✨' },
    { title: '⚡ WAKE UP, WARRIOR!', body: 'Your final form cannot be achieved without discipline! 2 days of inactivity detected! Log now and RECLAIM YOUR POWER!! 💥' },
  ],
  minimal: [
    { title: '🍃 2 days since last log.', body: 'Log when ready.' },
    { title: '📝 No entries in 2 days.', body: 'Take a moment to catch up.' },
    { title: '🍃 Logging gap: 2 days.', body: 'One entry is enough.' },
  ],
};

/**
 * Returns a random inactivity nudge message for the given coach personality.
 * @param {string} personality
 * @returns {{ title: string, body: string }}
 */
export function generateInactivityMessage(personality = 'supportive') {
  const msgs = INACTIVITY_MESSAGES[personality] ?? INACTIVITY_MESSAGES.supportive;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ── Main Generator ─────────────────────────────────────────────────────────────

/**
 * Generate a coach comment based on personality and financial state.
 *
 * @param {object} opts
 * @param {string} opts.personality       - one of PERSONALITY_ORDER keys
 * @param {object} opts.monthSummary      - { income, expenses, balance }
 * @param {Array}  opts.budgets           - budget objects
 * @param {Array}  opts.transactions      - all transactions
 * @param {Array}  opts.monthTransactions - this month's transactions
 * @param {number|null} opts.cardBalance  - live balance of selected card (null = no card)
 * @returns {{ icon, title, text }}
 */
export function generateCoachComment({
  personality = 'supportive',
  monthSummary = {},
  budgets = [],
  transactions = [],
  monthTransactions = [],
  cardBalance = null,
}) {
  const responses = RESPONSES[personality] ?? RESPONSES.supportive;

  const totalIncome = monthSummary?.income ?? 0;
  const totalExpenses = monthSummary?.expenses ?? 0;
  const balance = monthSummary?.balance ?? (totalIncome - totalExpenses);
  const saved = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (saved / totalIncome) * 100 : 0;

  // No data yet
  if (monthTransactions.length === 0) return responses.noData();

  // "Overspending" check — but only trigger negative message when the card balance
  // is actually in trouble. If the user has a healthy card balance and just hasn't
  // logged income this month (income = 0, small expense), the card covers it fine.
  if (saved < 0) {
    // Card has a healthy balance and the month's shortfall is < 10% of it → not alarming
    if (cardBalance !== null && cardBalance > 0 && Math.abs(saved) < cardBalance * 0.1) {
      return responses.neutral();
    }
    return responses.negative(Math.abs(saved));
  }

  // Zero balance mid-month (income = expenses, nothing left)
  if (balance === 0 && totalIncome > 0 && totalExpenses > 0) {
    return ZERO_BALANCE[personality] ?? ZERO_BALANCE.supportive;
  }

  // Budget exceeded
  const budgetExceeded = budgets.some((b) => {
    const spent = monthTransactions
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((s, t) => s + Number(t.amount), 0);
    return spent > Number(b.monthly_limit);
  });
  if (budgetExceeded) return responses.budgetExceeded();

  // Savings rate tiers
  if (savingsRate >= 20) return responses.excellent(savingsRate);
  if (savingsRate >= 5) return responses.good(savingsRate);
  return responses.neutral();
}

/**
 * Generate a daily financial tip for the coach section.
 * Rotates based on day of year so it changes daily.
 */
export function getDailyTip(personality = 'supportive') {
  const tips = DAILY_TIPS[personality] ?? DAILY_TIPS.supportive;
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return tips[dayOfYear % tips.length];
}

// ── Transaction Commentary ─────────────────────────────────────────────────────

// Category-specific roast lines
const CAT_ROASTS = {
  Food:           ['Your taste buds are expensive', 'GrabFood is your best friend and worst enemy', 'Calories AND pesos spent'],
  Transportation: ['You really love moving around', 'The commute life chose you', 'Grab surge pricing strikes again'],
  Shopping:       ['Shopee notification intensifies', 'The cart was full and so is your regret', 'Retail therapy hits different'],
  Bills:          ['Adulting is expensive, huh', 'The real villain of every paycheck', 'Meralco said "pay up"'],
  Subscriptions:  ['Another month, another subscription', 'Digital lifestyle tax', 'You actually use this one, right?'],
  Entertainment:  ['The fun tax', 'Money well spent (maybe)', 'Netflix and no savings'],
  Healthcare:     ['Investing in the most important asset — you', 'Health over wealth (for real)', 'Your body said "pay me"'],
  Savings:        ['Wait — you SAVED?! Hero behavior', 'Future you is doing a happy dance', 'This is the way'],
};

function catRoast(cat) {
  const lines = CAT_ROASTS[cat];
  if (!lines) return `${cat} moment`;
  return lines[Math.floor(Math.random() * lines.length)];
}

// Describe amount size contextually
function amtContext(amount) {
  if (amount >= 5000) return 'a major';
  if (amount >= 1000) return 'a significant';
  if (amount >= 500)  return 'a notable';
  if (amount >= 100)  return 'a moderate';
  return 'a small';
}

/**
 * Generates a short coach comment right after the user logs a single transaction.
 *
 * @param {string} personality
 * @param {{ type, amount, category, description }} transaction
 * @param {object} monthSummary  – { income, expenses, balance }
 * @param {Array}  budgets
 * @returns {{ icon, title, text }}
 */
export function generateTransactionComment({ personality = 'supportive', transaction = {}, monthSummary = {}, budgets = [] }) {
  const p = personality;
  const amount = Number(transaction.amount ?? 0);
  const category = transaction.category ?? '';
  const desc = transaction.description ? `"${transaction.description}"` : category;
  const isExpense = transaction.type === 'expense';
  const amtFmt = fmt(amount);
  const context = amtContext(amount);

  // Find matching budget to add context
  const budget = budgets.find((b) => b.category === category);
  const totalMonthExpenses = monthSummary?.expenses ?? 0;

  if (!isExpense) {
    // ── Income logged ──────────────────────────────────────────────────────────
    const isLargeIncome = amount >= 10000;
    const income = {
      supportive: {
        icon: '💸',
        title: isLargeIncome ? 'Payday energy! 🎉' : 'Income logged!',
        text: isLargeIncome
          ? `${amtFmt} — that's a big one! Let's make sure it works hard for you. Allocate some to savings before anything else! 🌟`
          : `${amtFmt} added to your balance. Every peso earned is a step toward financial freedom. Keep it up! 💪`,
      },
      strict: {
        icon: '💰',
        title: 'Income recorded.',
        text: `${amtFmt} logged. Immediately allocate to: savings first, then planned expenses. Unplanned spending of new income is prohibited.`,
      },
      roast: {
        icon: '🎤',
        title: 'Money just entered the chat',
        text: isLargeIncome
          ? `${amtFmt} landed! 👀 That's a lot. Your future self is begging — DO NOT open Shopee right now. 😂`
          : `${amtFmt} appeared! Quick, hide it before your impulse purchases find out. 💀`,
      },
      analyst: {
        icon: '📊',
        title: 'Revenue event recorded.',
        text: `${amtFmt} income captured. Monthly revenue position updated. Recommend immediate allocation: 20% savings, remainder to budgeted categories.`,
      },
      anime: {
        icon: '⚡',
        title: isLargeIncome ? 'MASSIVE POWER BOOST!' : 'POWER LEVEL RISING!',
        text: `${amtFmt} earned! Your financial power level has surged! Save it wisely, warrior — the final boss of debt cannot be defeated without resources!`,
      },
      minimal: {
        icon: '✓',
        title: 'Income logged.',
        text: `${amtFmt} in. Allocate wisely.`,
      },
    };
    return income[p] ?? income.supportive;
  }

  // ── Expense logged ───────────────────────────────────────────────────────────
  // Budget context — show remaining
  if (budget) {
    const limit = Number(budget.monthly_limit);
    const spentSoFar = totalMonthExpenses; // approximate
    const remaining = Math.max(limit - spentSoFar, 0);
    const pct = Math.min((spentSoFar / limit) * 100, 100).toFixed(0);
    const isNearLimit = spentSoFar / limit >= 0.8;

    const budgetWarning = {
      supportive: {
        icon: isNearLimit ? '⚠️' : '💛',
        title: isNearLimit ? `${category} budget almost full!` : `${category} budget tracked`,
        text: isNearLimit
          ? `${amtFmt} on ${desc}. You're at ${pct}% of your ${fmt(limit)} ${category} budget. Tread carefully the rest of the month!`
          : `${amtFmt} on ${desc} logged! You have a ${fmt(limit)} limit for ${category}. Keep tracking and you'll nail it! 🎯`,
      },
      strict: {
        icon: isNearLimit ? '🛑' : '⚔️',
        title: isNearLimit ? `${category} budget: critical.` : `${category} budget — tracked.`,
        text: isNearLimit
          ? `${amtFmt} on ${desc}. ${pct}% of ${fmt(limit)} budget used. Halt further ${category} spend immediately.`
          : `${amtFmt} on ${desc}. Budget cap: ${fmt(limit)}. Do not exceed.`,
      },
      roast: {
        icon: '🎤',
        title: isNearLimit ? `Budget's filing a police report` : `Budget spotted you`,
        text: isNearLimit
          ? `${amtFmt} on ${desc}. Your ${category} budget is ${pct}% gone and crying in a corner. Please stop. 😅`
          : `${amtFmt} on ${desc}. Your ${fmt(limit)} ${category} budget is watching you. Closely. 👀`,
      },
      analyst: {
        icon: '📊',
        title: `${category} spend logged.`,
        text: `${amtFmt} on ${desc}. Budget utilization: ${pct}% of ${fmt(limit)} cap. ${isNearLimit ? `Recommend immediate spend reduction in ${category}.` : 'Monitor remaining allocation.'}`,
      },
      anime: {
        icon: isNearLimit ? '⚠️' : '⚡',
        title: isNearLimit ? `BUDGET BARRIER NEAR BREAKING!` : `${category} budget: vigilance!`,
        text: isNearLimit
          ? `${amtFmt} on ${desc}! Your ${category} budget is at ${pct}%! The barrier is weakening! HOLD THE LINE!`
          : `${amtFmt} on ${desc}! Your ${fmt(limit)} budget is your battle line — protect it with DISCIPLINE!`,
      },
      minimal: {
        icon: isNearLimit ? '!' : '·',
        title: isNearLimit ? `${category} near limit.` : `Tracked.`,
        text: `${amtFmt} on ${desc}. ${fmt(limit)} budget — ${pct}% used.`,
      },
    };
    return budgetWarning[p] ?? budgetWarning.supportive;
  }

  // ── Generic expense — category-aware ────────────────────────────────────────
  const isHighAmount = amount >= 1000;
  const expense = {
    supportive: {
      icon: '📝',
      title: isHighAmount ? `${context} ${category} expense` : 'Expense logged!',
      text: isHighAmount
        ? `${amtFmt} on ${desc}. That's ${context} spend — great job tracking it! Consider creating a ${category} budget to manage this category going forward. 💡`
        : `${amtFmt} on ${desc}. Tracking every expense is the foundation of financial awareness — keep it up! 🌟`,
    },
    strict: {
      icon: '🎯',
      title: 'Expense noted.',
      text: isHighAmount
        ? `${amtFmt} on ${desc}. This is ${context} spend. Was it planned? If not, create a budget for ${category} immediately.`
        : `${amtFmt} on ${desc}. Noted. Was this necessary? If it recurs, budget for it.`,
    },
    roast: {
      icon: '🎤',
      title: catRoast(category),
      text: isHighAmount
        ? `${amtFmt} on ${desc}. Okay, that's a bold financial move. Your wallet didn't ask for this, but here we are. 😬`
        : `${amtFmt} on ${desc}. Another one bites the dust. Your wallet felt that one. 💸`,
    },
    analyst: {
      icon: '📊',
      title: 'Expense captured.',
      text: `${amtFmt} on ${desc} (${category}) recorded. ${isHighAmount ? 'High-value transaction — recommend budget creation for this category.' : 'Category-level tracking active. Budget creation recommended for recurring spend.'}`,
    },
    anime: {
      icon: '⚡',
      title: isHighAmount ? 'MAJOR BATTLE COST RECORDED!' : 'Battle expense logged!',
      text: isHighAmount
        ? `${amtFmt} on ${desc}! That's ${context} expenditure of your financial resources! A true warrior accounts for every cost — was this battle worth it?!`
        : `${amtFmt} on ${desc}! Every expense is a battle cost. Track them all — this is how legends are made!`,
    },
    minimal: {
      icon: '✓',
      title: 'Logged.',
      text: `${amtFmt} on ${desc}.`,
    },
  };
  return expense[p] ?? expense.supportive;
}

// ── Regret Tracker Insight ─────────────────────────────────────────────────────

/**
 * Generates a personality-aware insight based on regret tracker analytics.
 *
 * @param {string} personality
 * @param {{ totalRated, regretRatio, worthItCount, neutralCount }} analytics
 * @returns {{ icon, text } | null}
 */
export function getRegretInsight({ personality = 'supportive', analytics = {} }) {
  const { totalRated = 0, regretRatio = 0, worthItCount = 0 } = analytics;
  if (totalRated === 0) return null;

  const p = personality;
  const regretPct = Math.round(regretRatio);
  const worthItPct = Math.round((worthItCount / totalRated) * 100);

  if (regretPct > 50) {
    const opts = {
      supportive: { icon: '💛', text: `Over half your purchases felt like regrets — that's okay! You have the awareness now to make better choices. This insight is your superpower.` },
      strict: { icon: '⚠️', text: `${regretPct}% regret rate is unacceptable. Audit every category and eliminate the ones you consistently regret.` },
      roast: { icon: '🎤', text: `${regretPct}% of your purchases are regrets? Sir, your credit card is filing a restraining order. 😭` },
      analyst: { icon: '📊', text: `Regret rate of ${regretPct}% indicates significant impulse expenditure. Recommend a mandatory 48-hour cooling-off period for non-essential purchases.` },
      anime: { icon: '⚡', text: `${regretPct}% regret?! Even warriors must learn from their defeats! This data is the beginning of your training arc!` },
      minimal: { icon: '💡', text: `${regretPct}% regrets. Pause before the next purchase.` },
    };
    return opts[p] ?? opts.supportive;
  }

  if (worthItPct >= 70) {
    const opts = {
      supportive: { icon: '🌟', text: `${worthItPct}% of your purchases felt worth it! You're spending with real intention. That's a genuinely healthy financial mindset! 🎉` },
      strict: { icon: '✅', text: `${worthItPct}% satisfaction rate — acceptable. Monitor the remaining ${100 - worthItPct}% and eliminate unnecessary regrets.` },
      roast: { icon: '🎤', text: `${worthItPct}% worth it? Look at you making responsible choices! Your future self isn't mad at you. 🙏` },
      analyst: { icon: '📊', text: `${worthItPct}% satisfaction rate exceeds benchmark. Spending efficiency metrics trending positively.` },
      anime: { icon: '⚡', text: `${worthItPct}% worth it?! Your purchasing power has ASCENDED! You are becoming the master of intentional spending!` },
      minimal: { icon: '✓', text: `${worthItPct}% worth it. Solid.` },
    };
    return opts[p] ?? opts.supportive;
  }

  const opts = {
    supportive: { icon: '💪', text: `Mixed results — ${worthItPct}% worth it, ${regretPct}% regret. Completely normal! Each rating teaches you something new about your values.` },
    strict: { icon: '📋', text: `${worthItPct}% satisfaction, ${regretPct}% regret. Identify regret categories and eliminate them from next month's budget.` },
    roast: { icon: '🎤', text: `Half your purchases are questionable? Your wallet is having an identity crisis. Time for some hard conversations with your cart. 😅` },
    analyst: { icon: '📊', text: `Mixed satisfaction metrics. Categorize regret purchases for targeted budget reallocation in the next cycle.` },
    anime: { icon: '⚡', text: `You are at 50% potential! The path to 100% is paved with intentional spending! BEGIN THE TRAINING ARC!` },
    minimal: { icon: '💡', text: `${worthItPct}% worth it. Room to improve.` },
  };
  return opts[p] ?? opts.supportive;
}

// ── Plan Tab Insight ───────────────────────────────────────────────────────────

/**
 * Generates a short coaching insight for the Plan tab based on budgets/goals.
 *
 * @param {string} personality
 * @param {Array}  budgets
 * @param {Array}  goals
 * @param {object} monthSummary
 * @returns {{ icon, title, text }}
 */
export function generatePlanInsight({ personality = 'supportive', budgets = [], goals = [], monthSummary = {} }) {
  const p = personality;
  const hasGoals = goals.length > 0;
  const hasBudgets = budgets.length > 0;
  const completedGoals = goals.filter((g) => Number(g.current_amount) >= Number(g.target_amount)).length;
  const savingsRate = monthSummary.income > 0
    ? Math.round(((monthSummary.income - monthSummary.expenses) / monthSummary.income) * 100)
    : 0;

  if (!hasBudgets && !hasGoals) {
    const noSetup = {
      supportive: { icon: '🎯', title: 'Time to plan!', text: `Setting budgets and goals is like giving your money a roadmap. Start with just one — it makes a huge difference!` },
      strict: { icon: '📋', title: 'No plan = no progress.', text: `You have no budgets or goals. This is unacceptable. Create at least one budget and one savings goal now.` },
      roast: { icon: '🎤', title: 'Flying blind, huh?', text: `No budgets. No goals. Just vibes and hopes. Your financial plan is held together with wishful thinking. 😬` },
      analyst: { icon: '📊', title: 'Financial framework absent.', text: `Zero budgets and goals recorded. Recommend establishing baseline budget categories and SMART financial goals immediately.` },
      anime: { icon: '⚡', title: 'A warrior needs a battle plan!', text: `You have no budgets or goals! Without a plan, you are fighting BLINDLY! Create your strategy NOW!` },
      minimal: { icon: '○', title: 'No plan yet.', text: `Add one budget. Add one goal. Start there.` },
    };
    return noSetup[p] ?? noSetup.supportive;
  }

  if (completedGoals > 0) {
    const goalWin = {
      supportive: { icon: '🏆', title: `Goal achieved!`, text: `You've completed ${completedGoals} goal${completedGoals > 1 ? 's' : ''}! That's a real financial win. What's the next milestone to chase? 🌟` },
      strict: { icon: '✅', title: `${completedGoals} goal(s) met.`, text: `Acceptable. Archive the completed goals and immediately set a more ambitious target. Complacency is not an option.` },
      roast: { icon: '🎤', title: 'You actually did it!', text: `A completed goal?! In THIS economy?! Your ancestors are cheering. Set a harder one. 😤` },
      analyst: { icon: '📈', title: 'Goal completion recorded.', text: `${completedGoals} goal(s) at 100% completion. Strong performance. Recommend compounding success with a higher-value objective.` },
      anime: { icon: '⚡', title: 'GOAL DEFEATED!', text: `${completedGoals} GOAL${completedGoals > 1 ? 'S' : ''} CONQUERED! Your power is GROWING! The next boss awaits — set a harder goal!` },
      minimal: { icon: '✓', title: 'Goal done.', text: `${completedGoals} completed. Set the next one.` },
    };
    return goalWin[p] ?? goalWin.supportive;
  }

  const general = {
    supportive: { icon: '💪', title: 'Stick to the plan!', text: `You have ${budgets.length} budget${budgets.length !== 1 ? 's' : ''} and ${goals.length} goal${goals.length !== 1 ? 's' : ''} set. Your financial structure is in place — now it's about consistency!` },
    strict: { icon: '⚔️', title: 'Plan is set. Execute it.', text: `${budgets.length} budgets. ${goals.length} goals. Adherence is mandatory. No excuses for budget breaches.` },
    roast: { icon: '🎤', title: 'The plan is there…', text: `You have budgets and goals. The question is: are you actually following them? Your spending history has some THOUGHTS. 🧐` },
    analyst: { icon: '📊', title: 'Financial framework active.', text: `${budgets.length} budget categories and ${goals.length} objectives are tracking. Monitor variance and optimize allocation as needed.` },
    anime: { icon: '⚡', title: 'Your battle plan is set!', text: `${budgets.length} BUDGETS! ${goals.length} GOALS! Your financial battle plan is READY! Now execute with MAXIMUM DISCIPLINE!` },
    minimal: { icon: '·', title: 'Plan active.', text: `${budgets.length} budgets, ${goals.length} goals. Stay consistent.` },
  };
  return general[p] ?? general.supportive;
}

const DAILY_TIPS = {
  supportive: [
    { icon: '💡', text: 'Track every small purchase — they add up faster than you think!' },
    { icon: '🎯', text: 'Set a micro-goal today: save just ₱50 extra. Small wins build momentum!' },
    { icon: '☕', text: 'Swap one delivery order for home cooking this week. Your wallet will thank you 💚' },
    { icon: '🌱', text: 'Financial health is a journey, not a destination. Celebrate today\'s progress!' },
    { icon: '📅', text: 'Review last week\'s spending right now — awareness is your superpower.' },
    { icon: '💰', text: 'Pay yourself first: set aside savings before you spend anything else.' },
    { icon: '🛍️', text: 'Before any purchase, ask: "Will I value this in 30 days?" Be honest.' },
    { icon: '📊', text: 'Check your biggest spending category. Is it aligned with your values?' },
  ],
  strict: [
    { icon: '📌', text: 'No unplanned purchases today. Every transaction requires justification.' },
    { icon: '⚔️', text: 'Review yesterday\'s spending. Identify one cut you can make immediately.' },
    { icon: '📋', text: 'Update your budget categories if they\'re not reflecting reality. Precision matters.' },
    { icon: '🔒', text: 'Delete shopping apps from your phone. Friction reduces impulse buying by 40%.' },
    { icon: '💹', text: 'Calculate your current monthly burn rate. Know your numbers at all times.' },
    { icon: '✂️', text: 'Eliminate one subscription you haven\'t used this month. Non-negotiable.' },
    { icon: '🎯', text: 'Your savings goal is not a suggestion. It\'s a commitment. Honor it today.' },
    { icon: '⏰', text: '24-hour rule: no purchase over ₱500 without waiting a full day. Enforce this.' },
  ],
  roast: [
    { icon: '😅', text: 'Your GrabFood history is not a personality trait. Just saying.' },
    { icon: '👀', text: 'Checked your "add to cart" list lately? That\'s your money museum.' },
    { icon: '🎭', text: '"It was on sale" is not a financial strategy. Yet here we are.' },
    { icon: '📱', text: 'You\'ve refreshed Shopee 7 times today. Your wallet has filed for protection.' },
    { icon: '🧾', text: 'Your receipts are a horror story. Check them. Face the truth.' },
    { icon: '☕', text: '"Just one more coffee" has funded a barista\'s vacation. Great work.' },
    { icon: '🛒', text: 'Impulse buys don\'t spark joy. They spark regret and empty accounts.' },
    { icon: '💸', text: 'Your savings account misses you. Maybe visit it today?' },
  ],
  analyst: [
    { icon: '📈', text: 'Review KPIs: savings rate, budget variance, category allocation. Do it now.' },
    { icon: '🗂️', text: 'Segment your spend by category. Identify top 20% of spend causing 80% of budget risk.' },
    { icon: '💹', text: 'Calculate your personal burn rate: monthly expenses ÷ days. Track daily deviation.' },
    { icon: '📊', text: 'Month-over-month variance analysis: compare this period to last. Note deltas.' },
    { icon: '🔍', text: 'Audit discretionary vs fixed costs ratio. Optimize toward 60:40 fixed:discretionary.' },
    { icon: '⚡', text: 'Subscription audit: calculate annual cost of each. Eliminate underperformers.' },
    { icon: '🎯', text: 'Set this week\'s spend limit by category. Measure adherence daily.' },
    { icon: '📉', text: 'Identify your highest ROI savings behavior this month. Double down on it.' },
  ],
  anime: [
    { icon: '⚡', text: 'A warrior who tracks their expenses CANNOT be defeated by debt!' },
    { icon: '🌟', text: 'Today, you level up! Log every transaction and watch your power grow!' },
    { icon: '🔥', text: 'The path to financial freedom is paved with skipped impulse purchases! RESIST!' },
    { icon: '💪', text: 'Your savings goal is the FINAL BOSS. Train hard today to defeat it!' },
    { icon: '⚔️', text: 'Every ₱100 saved is a battle won! The war for financial freedom continues!' },
    { icon: '🌑', text: 'In the darkest financial moments, the true warrior EMERGES STRONGER!' },
    { icon: '🏆', text: 'Your budget is your battle plan. Follow it with IRON DISCIPLINE!' },
    { icon: '✨', text: 'One day closer to financial freedom. YOUR LEGEND GROWS!' },
  ],
  minimal: [
    { icon: '·', text: 'Spend less than you earn. That\'s it.' },
    { icon: '○', text: 'Log one transaction today.' },
    { icon: '🍃', text: 'Less spending = more freedom.' },
    { icon: '–', text: 'Review. Adjust. Continue.' },
    { icon: '✓', text: 'Budget → Track → Improve. Repeat.' },
    { icon: '◦', text: 'One small cut today. Compound it.' },
    { icon: '▪', text: 'Know your number. Own your decisions.' },
    { icon: '○', text: 'Simplify. Save. Breathe.' },
  ],
};

// ── Plan Item Comment (budget / goal / bill / recurring) ───────────────────────

/**
 * Generates a personality-aware commentary when the user saves a planning item.
 *
 * @param {string} personality
 * @param {'budget'|'goal'|'bill'|'recurring'} type
 * @param {object} item  — the saved object (title, name, category, monthly_limit, target_amount, amount…)
 * @returns {{ icon, title, text }}
 */
export function generatePlanItemComment({ personality = 'supportive', type = 'budget', item = {} }) {
  const p = personality;
  const name = item.title || item.name || item.category || type;
  const amount = Number(item.monthly_limit || item.target_amount || item.amount || 0);
  const amtFmt = amount > 0 ? fmt(amount) : null;
  const isHighValue = amount >= 10000;

  const comments = {
    budget: {
      supportive: {
        icon: '🛡️',
        title: `${name} budget set!`,
        text: `Your ${name} budget${amtFmt ? ` of ${amtFmt}` : ''} is locked in. Budgets are your financial GPS — you're already ahead of most people! Now you can watch your ${name} spending in real time. 🌟`,
      },
      strict: {
        icon: '⚔️',
        title: `Budget committed.`,
        text: `${name}${amtFmt ? ` — ${amtFmt} limit.` : '.'} This is your line. Every peso above it is a discipline failure. Review this category weekly and report back.`,
      },
      roast: {
        icon: '🎤',
        title: `A ${name} budget?! Growth!`,
        text: `${name}${amtFmt ? ` capped at ${amtFmt}` : ''}. You made a budget! In this economy?! ${name} expenses are now on a leash. Responsible-era has officially unlocked. 🔓`,
      },
      analyst: {
        icon: '📊',
        title: `Budget line initialized.`,
        text: `${name} budget${amtFmt ? ` set at ${amtFmt}` : ''}. Monthly allocation tracking active. Recommend weekly variance review to maintain budget adherence and optimize spend.`,
      },
      anime: {
        icon: '⚡',
        title: `${name.toUpperCase()} BUDGET SHIELD ACTIVATED!`,
        text: `${name}${amtFmt ? ` — ${amtFmt} defense barrier` : ''}! Every budget you create makes your financial fortress stronger! PROTECT THIS LIMIT WITH EVERYTHING YOU HAVE!`,
      },
      minimal: {
        icon: '✓',
        title: `Budget set.`,
        text: `${name}${amtFmt ? ` — ${amtFmt}/month.` : '.'}`,
      },
    },
    goal: {
      supportive: {
        icon: '🎯',
        title: isHighValue ? `Big dream, big goal!` : `New goal unlocked!`,
        text: isHighValue
          ? `"${name}"${amtFmt ? ` — ${amtFmt}` : ''}! That's an ambitious target and it's completely achievable. Break it into monthly savings milestones and you'll get there before you know it! 💪`
          : `"${name}" is your new mission${amtFmt ? ` — ${amtFmt} target` : ''}! Every big journey starts with one decision. You've just made yours — now let's make it happen! 🌟`,
      },
      strict: {
        icon: '🎯',
        title: `Goal registered.`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt} target` : ''}. Set your monthly contribution rate. Execute consistently. No detours, no delays.`,
      },
      roast: {
        icon: '🎤',
        title: isHighValue ? `Ambitious. Respect.` : `A goal? Bold of you.`,
        text: isHighValue
          ? `"${name}" — ${amtFmt}?! Okay, you're dreaming big. I've seen your shopping history and I'm genuinely nervous for you. But I'm rooting for you. 😤`
          : `"${name}"${amtFmt ? ` — ${amtFmt}` : ''}. I've seen your purchase history. This takes courage. Don't let GrabFood derail this. 😅`,
      },
      analyst: {
        icon: '📊',
        title: `Goal objective logged.`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt} target` : ''} registered. Define monthly contribution milestones and track progress against schedule. Set deadline for optimal accountability.`,
      },
      anime: {
        icon: '⚡',
        title: isHighValue ? `LEGENDARY QUEST ACCEPTED!` : `NEW QUEST ACCEPTED!`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt} power required` : ''}! ${isHighValue ? 'This is an EPIC-tier goal — only the truly disciplined reach it!' : 'The training arc begins NOW!'} Victory is the ONLY option!`,
      },
      minimal: {
        icon: '🎯',
        title: `Goal set.`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt}.` : '.'}`,
      },
    },
    bill: {
      supportive: {
        icon: '📅',
        title: `Bill tracked!`,
        text: `"${name}" added${amtFmt ? ` — ${amtFmt}` : ''}. Knowing your bills in advance means no nasty surprises. You're staying proactively ahead of your obligations — that's maturity! 🙌`,
      },
      strict: {
        icon: '📅',
        title: `Bill obligation noted.`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt}` : ''}. Due date noted. Late fees are a tax on disorganization. Pay early, always.`,
      },
      roast: {
        icon: '🎤',
        title: `Another bill joins the party.`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt}` : ''}. Adulting continues to be expensive. But at least you're tracking it like a responsible human. The bills respect your commitment. 😤`,
      },
      analyst: {
        icon: '📊',
        title: `Liability registered.`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt}` : ''} added as scheduled obligation. Integrated into cash flow projection. Ensure liquidity coverage before due date.`,
      },
      anime: {
        icon: '⚡',
        title: `INCOMING FINANCIAL ATTACK LOGGED!`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt}` : ''} bill is now tracked! A warrior who knows the enemy's attack schedule cannot be ambushed! PREPARE THE FUNDS IN ADVANCE!`,
      },
      minimal: {
        icon: '📅',
        title: `Bill added.`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt}.` : '.'}`,
      },
    },
    recurring: {
      supportive: {
        icon: '🔄',
        title: `Recurring transaction set!`,
        text: `"${name}" will now auto-log on its schedule. Set it and forget it — automation is your financial superpower! Every auto-logged entry is one less thing to worry about. ✨`,
      },
      strict: {
        icon: '🔄',
        title: `Recurring committed.`,
        text: `"${name}" auto-log active${amtFmt ? ` at ${amtFmt}` : ''}. Fixed cost tracked. Audit this recurring item quarterly to ensure it still justifies its allocation.`,
      },
      roast: {
        icon: '🎤',
        title: `Auto-logging? Character growth!`,
        text: `"${name}" is now eternal${amtFmt ? ` at ${amtFmt}` : ''}. Like your GrabFood habit. Except this one's actually tracked and under control. Proud of you. 😂`,
      },
      analyst: {
        icon: '📊',
        title: `Recurring transaction scheduled.`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt}` : ''} added to recurring queue. Consistent auto-tracking improves cash flow forecast accuracy. Review annually for optimization.`,
      },
      anime: {
        icon: '⚡',
        title: `PASSIVE AUTO-SKILL EQUIPPED!`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt}` : ''} will now execute automatically! Passive tracking is a LEGENDARY TIER financial strategy! You have leveled up!`,
      },
      minimal: {
        icon: '✓',
        title: `Recurring set.`,
        text: `"${name}"${amtFmt ? ` — ${amtFmt}.` : '.'} Auto-logs active.`,
      },
    },
  };

  const map = comments[type];
  return map?.[p] ?? map?.supportive ?? { icon: '✓', title: 'Saved!', text: 'Item recorded.' };
}
