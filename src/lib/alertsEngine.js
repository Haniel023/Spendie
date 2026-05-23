import { getPHNow, toPHDate } from './timezone';

export const generateSmartAlerts = ({ summary, budgets, transactions }) => {
  const generatedAlerts = [];

  if ((summary.balance ?? 0) < 0) {
    generatedAlerts.push({ type: 'danger', message: 'Your balance is negative.' });
  }

  const phNow = getPHNow();
  const currentMonth = phNow.getMonth();
  const currentYear  = phNow.getFullYear();

  const thisMonthExpenses = transactions.filter((item) => {
    const d = toPHDate(item.created_at);
    return (
      item.type === 'expense' &&
      d.getMonth() === currentMonth &&
      d.getFullYear() === currentYear
    );
  });

  budgets.forEach((budget) => {
    const spent = thisMonthExpenses
      .filter((item) => item.category === budget.category)
      .reduce((total, item) => total + Number(item.amount), 0);

    const limit = Number(budget.monthly_limit);
    if (limit <= 0) return;

    const percentage = (spent / limit) * 100;

    if (spent > limit) {
      generatedAlerts.push({
        type: 'danger',
        message: `${budget.category} exceeded budget by ₱${(spent - limit).toFixed(2)} this month`,
      });
    } else if (percentage >= 80) {
      generatedAlerts.push({
        type: 'warning',
        message: `${budget.category} is at ${percentage.toFixed(0)}% of budget this month`,
      });
    }
  });

  return generatedAlerts;
};
