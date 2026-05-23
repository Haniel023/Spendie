/**
 * AI Finance Coach — Smart Insights Engine
 *
 * Generates conversational, coaching-style insights from the user's financial data.
 * Each insight has:
 *   type     — 'tip' | 'warning' | 'danger' | 'goal' | 'success' | 'prediction' | 'info'
 *   icon     — emoji shorthand
 *   title    — short header
 *   message  — friendly, coach-style full message  (personality-aware)
 *   priority — 1 (highest) … 5 (lowest) — used for sorting
 *
 * Pass `personality` from coachEngine to get tone-matched messages.
 */

import { getPHNow, toPHDate } from './timezone';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n) {
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysLeftInMonth() {
  const now  = getPHNow();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate();
}

function dayOfMonth() {
  return getPHNow().getDate();
}

function monthLabel(monthIdx) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][monthIdx];
}

// ── Personality message overrides per insight ─────────────────────────────────

const P = {
  // balance low
  balanceLow: {
    supportive: (b) => `You have ${fmt(b)} left. It's okay — just pause any non-essentials and breathe. Your next income will reset this! 💛`,
    strict:     (b) => `Balance: ${fmt(b)}. Halt all discretionary spending now. No exceptions until income resets the balance.`,
    roast:      (b) => `${fmt(b)} left. Your wallet is on life support. Shopee and GrabFood are officially blocked. 😅`,
    analyst:    (b) => `Remaining liquidity: ${fmt(b)}. Recommend immediate suspension of discretionary spend to preserve minimum buffer.`,
    anime:      (b) => `Only ${fmt(b)} remains! Your HP is critical! Activate EMERGENCY SAVE MODE and hold the line!`,
    minimal:    (b) => `${fmt(b)} left. Pause spending.`,
  },
  // in the red
  inRed: {
    supportive: (b) => `Your balance is ${fmt(b)}. It happens — you noticed it, and that's already powerful. Let's make a recovery plan together. 🌱`,
    strict:     (b) => `Balance negative at ${fmt(b)}. This is a financial emergency. Stop all non-essential transactions immediately and audit every category.`,
    roast:      (b) => `${fmt(b)}. You're not just in the red — you moved in and redecorated. Time for the ultimate comeback arc. 💀`,
    analyst:    (b) => `Negative cash position: ${fmt(b)}. Immediate corrective action required. Propose emergency budget reallocation and income acceleration.`,
    anime:      (b) => `${fmt(b)}!! You've entered the NEGATIVE ZONE! Only IRON DISCIPLINE can rescue you now! Begin the comeback arc IMMEDIATELY!`,
    minimal:    (b) => `Balance: ${fmt(b)}. Stop spending now.`,
  },
  // top spend category
  topSpend: {
    supportive: (cat, amt) => `You've put the most into ${cat} this month — ${fmt(amt)} so far. Is this aligned with what matters most to you? No judgment, just awareness! 💡`,
    strict:     (cat, amt) => `${cat} is your top spend at ${fmt(amt)}. Justify this allocation. If it's not a priority, cut it next month.`,
    roast:      (cat, amt) => `${fmt(amt)} on ${cat}. Your ${cat} habit called — it says you're its best customer. 🏆`,
    analyst:    (cat, amt) => `${cat} leads spend allocation at ${fmt(amt)} this period. Evaluate cost-to-value ratio and determine if reallocation is warranted.`,
    anime:      (cat, amt) => `${cat} DOMINATES your spending at ${fmt(amt)}! Is this your battle priority, or is it consuming resources you need elsewhere?!`,
    minimal:    (cat, amt) => `Top: ${cat} at ${fmt(amt)}.`,
  },
  // spending up
  spendUp: {
    supportive: (pct, prev, cur) => `Spending up ${pct}% vs last month (${fmt(cur)} vs ${fmt(prev)}). No worries — one category review is all it takes to course-correct! 🙌`,
    strict:     (pct, prev, cur) => `Spending increased ${pct}% vs last month (${fmt(cur)} vs ${fmt(prev)}). Identify the source and eliminate it. Results, not excuses.`,
    roast:      (pct, prev, cur) => `Up ${pct}% from last month. You went from ${fmt(prev)} to ${fmt(cur)}. Your bank account is writing a sad memoir. 📖`,
    analyst:    (pct, prev, cur) => `Spend variance: +${pct}% MoM. Current: ${fmt(cur)}, Prior: ${fmt(prev)}. Root cause analysis recommended before EOD.`,
    anime:      (pct, prev, cur) => `SPENDING POWER LEVEL UP ${pct}%! But this is the WRONG kind of power! Correct this trajectory NOW!`,
    minimal:    (pct, prev, cur) => `+${pct}% vs last month. Trim one category.`,
  },
  // spending down
  spendDown: {
    supportive: (pct, saved) => `Spending down ${pct}% vs last month! You've saved ${fmt(saved)} more. That's real, tangible progress — celebrate this! 🎉`,
    strict:     (pct, saved) => `Spend reduced by ${pct}%. ${fmt(saved)} preserved. Acceptable. Maintain or improve next cycle.`,
    roast:      (pct, saved) => `Down ${pct}%? You actually did it! You saved ${fmt(saved)} compared to last month. Your future self is giving you a standing ovation. 👏`,
    analyst:    (pct, saved) => `Spend declined ${pct}% MoM — ${fmt(saved)} in efficiency gains. Positive variance. Sustain current allocation discipline.`,
    anime:      (pct, saved) => `SPENDING REDUCED BY ${pct}%! You saved ${fmt(saved)} more than last month! YOUR DISCIPLINE IS LEGENDARY!`,
    minimal:    (pct, saved) => `-${pct}% vs last month. ${fmt(saved)} saved. Well done.`,
  },
  // projected to overspend vs budget
  projectedOverBudget: {
    supportive: (daily, proj, over) => `You're averaging ${fmt(daily)}/day. By month-end you might spend ${fmt(proj)} — about ${fmt(over)} over budget. Let's trim just a bit and stay on track! You can do it! 💪`,
    strict:     (daily, proj, over) => `At ${fmt(daily)}/day, projected month-end: ${fmt(proj)} — ${fmt(over)} over budget. Immediate spend reduction required. Enforce category limits today.`,
    roast:      (daily, proj, over) => `At ${fmt(daily)}/day, you'll blow your budget by ${fmt(over)} by month-end. Your budget is drafting a cease-and-desist letter. 😂`,
    analyst:    (daily, proj, over) => `Daily burn rate ${fmt(daily)} projects ${fmt(proj)} by period end — ${fmt(over)} variance over budget. Course correction recommended within 48 hours.`,
    anime:      (daily, proj, over) => `DANGER! At ${fmt(daily)}/day you'll EXCEED budget by ${fmt(over)}! The budget barrier must NOT be shattered! SLOW DOWN NOW!`,
    minimal:    (daily, proj, over) => `On pace to overspend by ${fmt(over)}. Slow down.`,
  },
  // projected nearing income
  projectedNearIncome: {
    supportive: (daily, proj, income) => `Averaging ${fmt(daily)}/day — you'll likely spend ${fmt(proj)} by month-end. That's close to your income of ${fmt(income)}. A small pause can help! 🙏`,
    strict:     (daily, proj, income) => `Daily rate ${fmt(daily)} projects ${fmt(proj)} vs income ${fmt(income)}. No margin for error. Reduce spend immediately.`,
    roast:      (daily, proj, income) => `You're averaging ${fmt(daily)}/day. By month end: ${fmt(proj)}. Your income is ${fmt(income)}. This is not the math we want to be doing. 😬`,
    analyst:    (daily, proj, income) => `Projected spend ${fmt(proj)} approaching income threshold ${fmt(income)}. Savings rate risk elevated. Recommend spend reduction of 15–20%.`,
    anime:      (daily, proj, income) => `${fmt(proj)} projected vs ${fmt(income)} income! You're approaching the SPENDING LIMIT EVENT HORIZON! Activate savings shields!`,
    minimal:    (daily, proj, income) => `Projected spend ${fmt(proj)} vs income ${fmt(income)}. Watch out.`,
  },
  // last week of month safe-to-spend
  lastWeek: {
    supportive: (daysLeft, safe, perDay) => `Only ${daysLeft} days left this month! You have ${fmt(safe)} safe to spend — that's about ${fmt(perDay)}/day. You're in the home stretch! 🏁`,
    strict:     (daysLeft, safe, perDay) => `${daysLeft} days remaining. Safe-to-spend: ${fmt(safe)} (${fmt(perDay)}/day). Do not exceed this. Discipline through month-end.`,
    roast:      (daysLeft, safe, perDay) => `${daysLeft} days left. You've got ${fmt(safe)} before the month resets. That's ${fmt(perDay)}/day. Choose wisely (for once). 😏`,
    analyst:    (daysLeft, safe, perDay) => `${daysLeft} days remaining. Residual budget: ${fmt(safe)}. Daily limit: ${fmt(perDay)}. Monitor against actuals to close period in positive position.`,
    anime:      (daysLeft, safe, perDay) => `${daysLeft} DAYS UNTIL MONTH RESET! ${fmt(safe)} remains — ${fmt(perDay)}/day! DO NOT WASTE THIS POWER!`,
    minimal:    (daysLeft, safe, perDay) => `${daysLeft} days, ${fmt(safe)} left. ${fmt(perDay)}/day.`,
  },
  // budget blown
  budgetBlown: {
    supportive: (cat, spent, limit, over) => `Your ${cat} budget is over by ${fmt(over)} (${fmt(spent)} vs ${fmt(limit)} limit). It happens! Let's learn from this and plan better next month. 💛`,
    strict:     (cat, spent, limit, over) => `${cat} budget EXCEEDED by ${fmt(over)} (${fmt(spent)} / ${fmt(limit)}). This is a discipline failure. Audit and eliminate overspend immediately.`,
    roast:      (cat, spent, limit, over) => `${cat} budget: demolished. You spent ${fmt(spent)} against a ${fmt(limit)} limit. ${fmt(over)} over. The budget is crying in a corner. 😭`,
    analyst:    (cat, spent, limit, over) => `${cat} overspend detected: ${fmt(spent)} vs budget ${fmt(limit)} — ${fmt(over)} adverse variance. Immediate reallocation audit required.`,
    anime:      (cat, spent, limit, over) => `${cat} BUDGET BARRIER SHATTERED! ${fmt(over)} over the limit! A true warrior doesn't abandon the plan! COURSE CORRECT NOW!`,
    minimal:    (cat, spent, limit, over) => `${cat} over by ${fmt(over)}. Review.`,
  },
  // budget near limit
  budgetNear: {
    supportive: (cat, pct, daysLeft, rem) => `${cat} is at ${pct}% of budget with ${daysLeft} days left. You have ${fmt(rem)} remaining — you've got this, just stay mindful! 💪`,
    strict:     (cat, pct, daysLeft, rem) => `${cat} at ${pct}% utilization. ${fmt(rem)} remaining over ${daysLeft} days. Enforce strict limits — no discretionary spend in this category.`,
    roast:      (cat, pct, daysLeft, rem) => `${cat} is at ${pct}% and there are ${daysLeft} days left. You have ${fmt(rem)} until the budget files a police report. 👀`,
    analyst:    (cat, pct, daysLeft, rem) => `${cat} budget utilization: ${pct}%. Residual: ${fmt(rem)} over ${daysLeft} days. Monitor daily spend to avoid overrun.`,
    anime:      (cat, pct, daysLeft, rem) => `${cat} at ${pct}%! ${fmt(rem)} remains! ${daysLeft} days until month-end! THE BUDGET WALL IS CLOSE — DO NOT BREACH IT!`,
    minimal:    (cat, pct, daysLeft, rem) => `${cat}: ${pct}% used. ${fmt(rem)} left.`,
  },
  // goal deadline near
  goalDeadlineNear: {
    supportive: (title, rem) => `Your "${title}" goal deadline is almost here and you still need ${fmt(rem)}. Consider a small boost or a deadline extension — either way, you've made progress! 🌟`,
    strict:     (title, rem) => `"${title}" deadline imminent. ${fmt(rem)} still outstanding. Boost contributions now or revise timeline. No excuses.`,
    roast:      (title, rem) => `"${title}" deadline is coming fast and you still need ${fmt(rem)}. Your goal is giving you the side-eye. Time to hustle. 😤`,
    analyst:    (title, rem) => `"${title}" deadline approaching. Outstanding balance: ${fmt(rem)}. Recommend immediate contribution increase or deadline extension to avoid objective failure.`,
    anime:      (title, rem) => `FINAL BOSS DEADLINE APPROACHING! "${title}" — ${fmt(rem)} still needed! THIS IS YOUR CLIMAX MOMENT! GIVE EVERYTHING!`,
    minimal:    (title, rem) => `"${title}" deadline near. ${fmt(rem)} left.`,
  },
  // goal progress
  goalProgress: {
    supportive: (title, target, months, monthly, saved) => `To hit "${title}" (${fmt(target)}) in ${months} months, save ${fmt(monthly)}/month. You've already got ${fmt(saved)} in — keep that momentum! 🎯`,
    strict:     (title, target, months, monthly, saved) => `"${title}": ${fmt(target)} target, ${months} months. Required: ${fmt(monthly)}/month. Current: ${fmt(saved)}. Adhere to contribution schedule. No deviation.`,
    roast:      (title, target, months, monthly, saved) => `"${title}" needs ${fmt(monthly)}/month for ${months} months. You have ${fmt(saved)} saved. Basically, stop buying things you'll regret. 😅`,
    analyst:    (title, target, months, monthly, saved) => `"${title}" KPI: ${fmt(target)} target, ${months}mo horizon. Required monthly contribution: ${fmt(monthly)}. Current position: ${fmt(saved)}.`,
    anime:      (title, target, months, monthly, saved) => `TRAINING OBJECTIVE: "${title}"! ${fmt(monthly)}/month for ${months} months! You have ${fmt(saved)} — the journey has begun! KEEP TRAINING!`,
    minimal:    (title, target, months, monthly, saved) => `"${title}": ${fmt(monthly)}/mo for ${months} months.`,
  },
  // saving this month
  savingThisMonth: {
    supportive: (rate, saved) => `You're spending less than you earn this month! ${fmt(saved)} saved — a ${rate}% savings rate. Keep this going and watch the momentum build! 🚀`,
    strict:     (rate, saved) => `Positive month: ${fmt(saved)} saved (${rate}% rate). Maintain or improve. Consider increasing savings allocation by 5%.`,
    roast:      (rate, saved) => `You're actually saving money?? ${fmt(saved)} — a ${rate}% savings rate. This is character development. I'm proud and suspicious. 👀`,
    analyst:    (rate, saved) => `Period savings: ${fmt(saved)} at ${rate}% rate. Favorable position. Recommend maintaining spend discipline and evaluating investment of surplus.`,
    anime:      (rate, saved) => `SAVINGS POWER: ${rate}%! ${fmt(saved)} secured! YOUR FINANCIAL LEVEL IS RISING! THE FINAL BOSS OF DEBT TREMBLES!`,
    minimal:    (rate, saved) => `${rate}% saved this month. ${fmt(saved)}.`,
  },
  // no expenses logged
  noExpenses: {
    supportive: (month) => `No expenses logged yet for ${month}. Don't forget to track even small purchases — awareness is your superpower! You've got this! 📝`,
    strict:     (month) => `Zero expenses logged for ${month}. This is either excellent discipline or poor tracking. Log everything — you cannot manage what you don't measure.`,
    roast:      (month) => `No expenses for ${month}? Either you're living off air or you're avoiding the truth. Log your transactions. Face the music. 🎵`,
    analyst:    (month) => `${month} expense dataset is empty. Data gap creates blind spots in budget analysis. Begin logging transactions immediately.`,
    anime:      (month) => `No expenses tracked for ${month}?! A warrior MUST know their expenditures! LOG EVERY BATTLE COST NOW!`,
    minimal:    (month) => `No expenses yet for ${month}. Log something.`,
  },
  // latte effect
  latteEffect: {
    supportive: (count, total) => `You've made ${count} small purchases under ₱100 totaling ${fmt(total)} this month. These add up — but awareness alone can change the pattern! 🌱`,
    strict:     (count, total) => `${count} micro-purchases totaling ${fmt(total)}. The latte effect is real and costly. Eliminate at least 50% of these next month.`,
    roast:      (count, total) => `${count} purchases under ₱100 = ${fmt(total)} vanished. You're not broke from one big purchase. You're broke from 47 "small" ones. Rough math. ☕`,
    analyst:    (count, total) => `${count} sub-₱100 transactions totaling ${fmt(total)}. Micro-spend leakage identified. Recommend 30-day reduction target of 40%.`,
    anime:      (count, total) => `${count} SMALL ATTACKS totaling ${fmt(total)}! Death by a thousand cuts! Each small purchase chips away your power! RESIST THE MICRO-SPEND!`,
    minimal:    (count, total) => `${count} small buys = ${fmt(total)}. Reduce.`,
  },
};

function getMsg(map, personality, ...args) {
  const fn = map[personality] ?? map.supportive;
  return fn(...args);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export const generateInsights = ({
  transactions = [],
  budgets = [],
  goals = [],
  summary = {},
  personality = 'supportive',
}) => {
  const insights = [];

  const now          = getPHNow();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();
  const daysLeft     = daysLeftInMonth();
  const dayNum       = dayOfMonth();

  // ── Filter this month's expenses ─────────────────────────────────────────
  const thisMonthExpenses = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const thisMonthIncome = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return t.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalSpentThisMonth  = thisMonthExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalIncomeThisMonth = thisMonthIncome.reduce((s, t) => s + Number(t.amount), 0);

  // ── Build per-category expense map ───────────────────────────────────────
  const expenseMap = {};
  thisMonthExpenses.forEach((t) => {
    expenseMap[t.category] = (expenseMap[t.category] || 0) + Number(t.amount);
  });
  const sortedCategories = Object.entries(expenseMap).sort((a, b) => b[1] - a[1]);

  // ── Previous month data (for comparison) ─────────────────────────────────
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear  = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthExpenses = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return t.type === 'expense' && d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });
  const totalPrevMonth = prevMonthExpenses.reduce((s, t) => s + Number(t.amount), 0);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Highest spending category
  // ─────────────────────────────────────────────────────────────────────────
  if (sortedCategories.length > 0) {
    const [cat, amount] = sortedCategories[0];
    insights.push({
      type: 'info',
      icon: '🏆',
      title: `Top spend: ${cat}`,
      message: getMsg(P.topSpend, personality, cat, amount),
      priority: 3,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Month-over-month comparison
  // ─────────────────────────────────────────────────────────────────────────
  if (totalPrevMonth > 0 && totalSpentThisMonth > 0) {
    const diff    = totalSpentThisMonth - totalPrevMonth;
    const pctDiff = Math.abs((diff / totalPrevMonth) * 100).toFixed(0);
    if (diff > 0) {
      insights.push({
        type: 'warning',
        icon: '📈',
        title: 'Spending up vs last month',
        message: getMsg(P.spendUp, personality, pctDiff, totalPrevMonth, totalSpentThisMonth),
        priority: 2,
      });
    } else if (diff < -0.01) {
      insights.push({
        type: 'success',
        icon: '📉',
        title: 'Spending down — nice work!',
        message: getMsg(P.spendDown, personality, pctDiff, Math.abs(diff)),
        priority: 2,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Low balance warning
  // ─────────────────────────────────────────────────────────────────────────
  const balance = summary.balance ?? 0;
  if (balance < 0) {
    insights.push({
      type: 'danger',
      icon: '🚨',
      title: "You're in the red",
      message: getMsg(P.inRed, personality, balance),
      priority: 1,
    });
  } else if (balance < 1000) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Balance running low',
      message: getMsg(P.balanceLow, personality, balance),
      priority: 1,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Overspending Prediction
  // ─────────────────────────────────────────────────────────────────────────
  if (dayNum >= 3 && totalSpentThisMonth > 0) {
    const dailyAvg        = totalSpentThisMonth / dayNum;
    const projectedTotal  = dailyAvg * (dayNum + daysLeft);

    const totalBudgetLimit = budgets.reduce((s, b) => s + Number(b.monthly_limit), 0);

    if (totalBudgetLimit > 0 && projectedTotal > totalBudgetLimit) {
      const overshoot = projectedTotal - totalBudgetLimit;
      insights.push({
        type: 'prediction',
        icon: '🔮',
        title: 'On track to overspend',
        message: getMsg(P.projectedOverBudget, personality, dailyAvg, projectedTotal, overshoot),
        priority: 1,
      });
    } else if (totalIncomeThisMonth > 0 && projectedTotal > totalIncomeThisMonth * 0.9) {
      insights.push({
        type: 'prediction',
        icon: '🔮',
        title: 'Projected spend nearing income',
        message: getMsg(P.projectedNearIncome, personality, dailyAvg, projectedTotal, totalIncomeThisMonth),
        priority: 2,
      });
    } else if (daysLeft <= 7 && totalSpentThisMonth > 0) {
      const safeToSpend = Math.max(0, (totalIncomeThisMonth || balance) - totalSpentThisMonth);
      insights.push({
        type: 'tip',
        icon: '📅',
        title: `${daysLeft} days left this month`,
        message: getMsg(P.lastWeek, personality, daysLeft, safeToSpend, safeToSpend / Math.max(daysLeft, 1)),
        priority: 3,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Budget alerts (near limit or over limit)
  // ─────────────────────────────────────────────────────────────────────────
  budgets.forEach((budget) => {
    const spent = thisMonthExpenses
      .filter((t) => t.category === budget.category)
      .reduce((total, t) => total + Number(t.amount), 0);
    const limit = Number(budget.monthly_limit);
    if (limit <= 0) return;
    const pct = (spent / limit) * 100;

    if (pct >= 100) {
      insights.push({
        type: 'danger',
        icon: '🛑',
        title: `${budget.category} budget blown`,
        message: getMsg(P.budgetBlown, personality, budget.category, spent, limit, spent - limit),
        priority: 1,
      });
    } else if (pct >= 85) {
      insights.push({
        type: 'warning',
        icon: '⚡',
        title: `${budget.category} almost maxed`,
        message: getMsg(P.budgetNear, personality, budget.category, pct.toFixed(0), daysLeft, limit - spent),
        priority: 2,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Savings goal coaching
  // ─────────────────────────────────────────────────────────────────────────
  goals.forEach((goal) => {
    const remaining = Number(goal.target_amount) - Number(goal.current_amount);
    if (remaining <= 0) return;

    if (goal.deadline) {
      const deadline       = new Date(goal.deadline);
      const rawMonths      = (deadline - getPHNow()) / (1000 * 60 * 60 * 24 * 30);
      const monthsLeft     = Math.max(parseFloat(rawMonths.toFixed(1)), 0.5);
      const neededPerMonth = remaining / monthsLeft;

      if (monthsLeft < 1) {
        insights.push({
          type: 'warning',
          icon: '⏰',
          title: `"${goal.title}" deadline soon!`,
          message: getMsg(P.goalDeadlineNear, personality, goal.title, remaining),
          priority: 2,
        });
      } else {
        insights.push({
          type: 'goal',
          icon: '🎯',
          title: `Save ${fmt(neededPerMonth)}/mo for "${goal.title}"`,
          message: getMsg(P.goalProgress, personality, goal.title, goal.target_amount, monthsLeft.toFixed(0), neededPerMonth, goal.current_amount),
          priority: 3,
        });
      }
    } else {
      const pct = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
      if (pct < 25) {
        insights.push({
          type: 'goal',
          icon: '🌱',
          title: `Start building "${goal.title}"`,
          message: getMsg(P.goalProgress, personality, goal.title, goal.target_amount, '—', '—', goal.current_amount),
          priority: 4,
        });
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Positive month (income > expenses)
  // ─────────────────────────────────────────────────────────────────────────
  if (totalIncomeThisMonth > 0 && totalSpentThisMonth > 0 && totalIncomeThisMonth > totalSpentThisMonth) {
    const saved = totalIncomeThisMonth - totalSpentThisMonth;
    const savingsRate = ((saved / totalIncomeThisMonth) * 100).toFixed(0);
    insights.push({
      type: 'success',
      icon: '💚',
      title: `Saving ${savingsRate}% this month!`,
      message: getMsg(P.savingThisMonth, personality, savingsRate, saved),
      priority: 4,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. No spending logged yet this month
  // ─────────────────────────────────────────────────────────────────────────
  if (thisMonthExpenses.length === 0 && transactions.length > 0 && dayNum >= 3) {
    insights.push({
      type: 'tip',
      icon: '📝',
      title: 'No expenses logged yet',
      message: getMsg(P.noExpenses, personality, monthLabel(currentMonth)),
      priority: 5,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Frequent small purchases tip
  // ─────────────────────────────────────────────────────────────────────────
  if (thisMonthExpenses.length >= 10) {
    const smallTx    = thisMonthExpenses.filter((t) => Number(t.amount) < 100);
    const smallTotal = smallTx.reduce((s, t) => s + Number(t.amount), 0);
    if (smallTx.length >= 5 && smallTotal > 500) {
      insights.push({
        type: 'tip',
        icon: '☕',
        title: 'Death by small purchases',
        message: getMsg(P.latteEffect, personality, smallTx.length, smallTotal),
        priority: 4,
      });
    }
  }

  // Sort by priority (lower = shown first), cap at 8 insights
  return insights
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8);
};
