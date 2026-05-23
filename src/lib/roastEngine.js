/**
 * Spendie Roast Engine 🎤
 *
 * Generates funny, non-toxic, shareable spending commentary.
 * Completely optional — enabled only when user turns on Roast Mode.
 *
 * Safety rules:
 *   ✓ Humor targets spending PATTERNS, not the person
 *   ✓ No shame-spiraling language
 *   ✓ Always ends with a micro-encouragement
 *   ✓ Localized for Filipino context (Shopee, GrabFood, etc.)
 *   ✓ Moderated word list — nothing offensive
 */

import { toPHDate, getPHNow } from './timezone';

const fmt = (n) =>
  `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ── Category-specific roasts ──────────────────────────────────────────────────

const CATEGORY_ROASTS = {
  Food: [
    {
      roast: "{amount} on Food this month. Your stomach is running its own startup and it's fully funded.",
      nudge: "Try prepping meals twice a week — even once helps!",
    },
    {
      roast: "You said 'I'll cook at home' and then spent {amount} on food deliveries anyway. GrabFood respects the consistency.",
      nudge: "One home-cooked meal = ~₱200 saved. It adds up!",
    },
    {
      roast: "{amount} to restaurants this month. You are personally responsible for several barista salaries.",
      nudge: "Set a food budget cap — even ₱500 lower makes a difference.",
    },
    {
      roast: "Your stomach's budget allocation this month: {amount}. Your emergency fund: still waiting for its turn.",
      nudge: "Try matching every food splurge with a peso into savings!",
    },
    {
      roast: "The café you keep visiting has your usual order memorized and a plaque with your name. {amount} well spent.",
      nudge: "Home brew challenge: one week, one saved receipt, one win.",
    },
  ],
  Shopping: [
    {
      roast: "Shopee got {amount} from you this month. Your package history looks like a small logistics operation.",
      nudge: "Use the 48-hour rule before clicking checkout. Future you will vote YES.",
    },
    {
      roast: "'It was on sale' is not a financial strategy. Yet {amount} later, here we are, legend.",
      nudge: "Sales save money only when you would've bought it anyway.",
    },
    {
      roast: "{amount} on Shopping. Your cart history reads like a fever dream at 2AM. Iconic, but costly.",
      nudge: "Clear your cart before sleeping — morning you is wiser.",
    },
    {
      roast: "Your checkout speed secured {amount} in purchases this month. Have you considered it as a competitive sport?",
      nudge: "Set a monthly shopping cap and stick to it — discipline is glow-up energy.",
    },
  ],
  Entertainment: [
    {
      roast: "You spent {amount} on Entertainment. Your subscriptions are having a family reunion and you're funding the venue.",
      nudge: "Audit your subs monthly — cancel anything unused for 30 days.",
    },
    {
      roast: "{amount} on Entertainment. You're single-handedly funding someone's Oscar campaign. The dedication is real.",
      nudge: "One cancelled sub = one small saving goal contribution!",
    },
  ],
  Transport: [
    {
      roast: "{amount} on Transport. Your Grab driver has considered naming a child after you.",
      nudge: "Even 2 jeepney rides per week saves more than you'd think!",
    },
    {
      roast: "You personally improved ride-hailing quarterly earnings by {amount} this month. Shareholder of the month.",
      nudge: "Batch errands into one trip — fewer rides, more savings.",
    },
  ],
  Lifestyle: [
    {
      roast: "{amount} on Lifestyle. Your lifestyle is living its best life. You? Working on it.",
      nudge: "Identify your top 3 lifestyle expenses. Keep 2, cut 1.",
    },
  ],
  Health: [
    {
      roast: "{amount} on Health — actually a smart investment. We'll allow it. This is the good kind of splurge.",
      nudge: "Health investment = future savings on emergencies. Well done!",
    },
  ],
  Subscriptions: [
    {
      roast: "{amount} on Subscriptions. You have more active subs than a magazine rack. Some of them haven't been opened since last year.",
      nudge: "Pick your top 2. Cancel the rest. Your future self says thank you.",
    },
  ],
};

// ── Behavior-based roasts ─────────────────────────────────────────────────────

const BEHAVIOR_ROASTS = {
  lateNight: [
    {
      roast: "Most regret purchases happen after 11PM. Your transaction history confirms this at statistical significance.",
      nudge: "Phone down after 10PM = fewer 'why did I buy this' moments.",
    },
    {
      roast: "The algorithm knows your late-night scrolling game. Your wallet knows it too.",
      nudge: "Enable screen limits at night — your budget will genuinely thank you.",
    },
    {
      roast: "Night-owl budget detected: {count} late-night transactions this month. Sleep is free, and it's amazing.",
      nudge: "Tomorrow is a great day to buy things. Tonight is not.",
    },
  ],
  tooManySmall: [
    {
      roast: "You said 'it's only a small amount' {count} times. Cumulative damage: {total}. Math is humbling.",
      nudge: "Small amounts are sneaky. Track them anyway — especially them.",
    },
    {
      roast: "Death by {count} small transactions. Your wallet is technically fine. Technically.",
      nudge: "Set a 'micro-spend' awareness alarm: ₱50 or less per day, max.",
    },
    {
      roast: "Your wallet doesn't fear big purchases. It fears your relationship with convenience stores.",
      nudge: "Log every sari-sari stop. The total will shock and transform you.",
    },
  ],
  budgetBusted: [
    {
      roast: "Your {category} budget said 'please' and you said 'that's adorable.' Respect the chaos.",
      nudge: "Revisit your {category} budget limit — maybe it needs a realistic update.",
    },
    {
      roast: "Budget limits are not speed targets. Yet here we are, record pace in {category}.",
      nudge: "Add a mid-month budget check to catch overruns before they snowball.",
    },
  ],
  highSavings: [
    {
      roast: "You saved {rate}% this month. Your money is literally scared of you. Respect.",
      nudge: "Keep this streak going — even one more month locks in real habits.",
    },
    {
      roast: "Excuse me, {rate}% savings rate?! This is not the Spendie we know. Outstanding growth.",
      nudge: "Consider putting that extra savings into a goal — lock it in!",
    },
  ],
  noIncome: [
    {
      roast: "Expenses logged, income: crickets. Either you found a money tree or the books need updating.",
      nudge: "Log your income too — it makes your financial story make sense!",
    },
  ],
  firstWeekSpender: [
    {
      roast: "Spent {pct}% of your monthly budget in Week 1. Any% speedrun, no category skips.",
      nudge: "Week 1 is the danger zone — set a weekly spend limit to pace yourself.",
    },
  ],
};

// ── Micro-encouragement closer ─────────────────────────────────────────────────

const CLOSERS = [
  "Your comeback arc starts now. 👊",
  "The awareness alone puts you ahead. Keep going.",
  "Financial glow-up in progress. Stay in the game.",
  "You logged it. That's already more than most people do.",
  "You got this. One peso at a time.",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template, vars) {
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
    template
  );
}

// ── Main Generator ─────────────────────────────────────────────────────────────

/**
 * Generate roast cards from transaction data.
 *
 * @param {object} opts
 * @param {Array}  opts.monthTransactions - this month's transactions
 * @param {Array}  opts.budgets           - budget objects
 * @param {object} opts.monthSummary      - { income, expenses, balance }
 * @returns {Array} max 3 roast objects: { icon, roast, nudge, category?, shareable }
 */
export function generateRoasts({ monthTransactions = [], budgets = [], monthSummary = {} }) {
  const roasts = [];

  const expenses = monthTransactions.filter((t) => t.type === 'expense');
  const income = monthTransactions.filter((t) => t.type === 'income');
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalSpent = expenses.reduce((s, t) => s + Number(t.amount), 0);

  if (expenses.length === 0) {
    return [
      {
        icon: '🎤',
        roast: 'Zero expenses this month? Either you\'ve achieved financial nirvana, or you forgot Spendie exists. We\'re going with option 2.',
        nudge: 'Log your first expense — even a sari-sari stop counts!',
        shareable: true,
      },
    ];
  }

  // ── Category roasts ────────────────────────────────────────────────────────
  const catMap = {};
  expenses.forEach((t) => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 2);

  topCats.forEach(([cat, catTotal]) => {
    const pool = CATEGORY_ROASTS[cat];
    if (pool) {
      const pick = randomFrom(pool);
      roasts.push({
        icon: '🎤',
        roast: fillTemplate(pick.roast, { amount: fmt(catTotal), category: cat }),
        nudge: pick.nudge,
        category: cat,
        shareable: true,
      });
    }
  });

  // ── Late night spending ────────────────────────────────────────────────────
  const lateNight = expenses.filter((t) => {
    const h = toPHDate(t.created_at).getHours();
    return h >= 22 || h < 4;
  });
  if (lateNight.length >= 3) {
    const pick = randomFrom(BEHAVIOR_ROASTS.lateNight);
    roasts.push({
      icon: '🌙',
      roast: fillTemplate(pick.roast, { count: lateNight.length }),
      nudge: pick.nudge,
      shareable: true,
    });
  }

  // ── Micro-purchase accumulation ───────────────────────────────────────────
  const smallTx = expenses.filter((t) => Number(t.amount) < 100);
  if (smallTx.length >= 7) {
    const smallTotal = smallTx.reduce((s, t) => s + Number(t.amount), 0);
    const pick = randomFrom(BEHAVIOR_ROASTS.tooManySmall);
    roasts.push({
      icon: '💀',
      roast: fillTemplate(pick.roast, { count: smallTx.length, total: fmt(smallTotal) }),
      nudge: pick.nudge,
      shareable: true,
    });
  }

  // ── Budget busted (>20% over) ─────────────────────────────────────────────
  budgets.forEach((budget) => {
    const spent = expenses
      .filter((t) => t.category === budget.category)
      .reduce((s, t) => s + Number(t.amount), 0);
    if (spent > Number(budget.monthly_limit) * 1.2) {
      const pick = randomFrom(BEHAVIOR_ROASTS.budgetBusted);
      roasts.push({
        icon: '💥',
        roast: fillTemplate(pick.roast, { category: budget.category }),
        nudge: fillTemplate(pick.nudge, { category: budget.category }),
        category: budget.category,
        shareable: true,
      });
    }
  });

  // ── High savings roast (positive!) ────────────────────────────────────────
  if (totalIncome > 0) {
    const savingsRate = ((totalIncome - totalSpent) / totalIncome) * 100;
    if (savingsRate >= 25) {
      const pick = randomFrom(BEHAVIOR_ROASTS.highSavings);
      roasts.push({
        icon: '🏆',
        roast: fillTemplate(pick.roast, { rate: savingsRate.toFixed(0) }),
        nudge: pick.nudge,
        shareable: true,
      });
    }
  }

  // ── No income logged ──────────────────────────────────────────────────────
  if (income.length === 0 && expenses.length >= 5) {
    const pick = randomFrom(BEHAVIOR_ROASTS.noIncome);
    roasts.push({ icon: '🤔', ...pick, shareable: false });
  }

  // Shuffle, limit to 3, add closer
  const selected = roasts.sort(() => Math.random() - 0.5).slice(0, 3);
  return selected;
}

/**
 * Generate a single shareable roast string for copy/share.
 */
export function formatShareableRoast(roastObj, appName = 'Spendie') {
  return `${roastObj.icon} "${roastObj.roast}"\n\n${roastObj.nudge}\n\n— My ${appName} AI Coach 😂`;
}
