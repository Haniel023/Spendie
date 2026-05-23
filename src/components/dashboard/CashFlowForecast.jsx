import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';
import { toPHDate } from '../../lib/timezone';

// card: marginHorizontal 16*2 + padding 16*2 = 64px
// chart-kit adds internal right padding (~32px) for last label → subtract extra 32
const screenWidth = Dimensions.get('window').width - spacing.lg * 4 - 32;

/**
 * Projects balance for the next N months using:
 *  - Current running balance
 *  - Monthly recurring income/expense patterns
 *  - Upcoming bills (summed per month)
 *  - Spending trend (average monthly change over last 3 months)
 */
function buildForecast({ summary, transactions, recurringTransactions = [], bills = [], months = 4 }) {
  const now = new Date();

  // ── Historical monthly averages (last 3 months) ────────────────────────
  const monthlyData = {};
  transactions.forEach((t) => {
    const d = toPHDate(t.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 };
    if (t.type === 'income') monthlyData[key].income += Number(t.amount);
    else monthlyData[key].expense += Number(t.amount);
  });

  const sortedMonths = Object.keys(monthlyData).sort().slice(-3);
  const avgIncome = sortedMonths.length
    ? sortedMonths.reduce((s, k) => s + monthlyData[k].income, 0) / sortedMonths.length
    : 0;
  const avgExpense = sortedMonths.length
    ? sortedMonths.reduce((s, k) => s + monthlyData[k].expense, 0) / sortedMonths.length
    : 0;

  // ── Recurring monthly net (from recurring transactions) ────────────────
  const recurringMonthlyNet = recurringTransactions.reduce((net, r) => {
    const amt = Number(r.amount);
    let monthly = 0;
    if (r.frequency === 'monthly') monthly = amt;
    else if (r.frequency === 'daily') monthly = amt * 30;
    else if (r.frequency === 'weekly') monthly = amt * 4;
    else if (r.frequency === 'semi_monthly') monthly = amt * 2;
    return net + (r.type === 'income' ? monthly : -monthly);
  }, 0);

  // ── Project N months forward ───────────────────────────────────────────
  const forecast = [];
  let runningBalance = summary.balance;

  // Current month label
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i <= months; i++) {
    const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = MONTHS_SHORT[projDate.getMonth()] + (projDate.getFullYear() !== now.getFullYear() ? ` '${String(projDate.getFullYear()).slice(2)}` : '');

    if (i === 0) {
      forecast.push({ label, balance: runningBalance, projected: false });
      continue;
    }

    // Bills due in this projected month
    const billsThisMonth = bills.filter((b) => {
      if (b.is_paid) return false;
      const due = new Date(b.due_date);
      return due.getMonth() === projDate.getMonth() && due.getFullYear() === projDate.getFullYear();
    }).reduce((s, b) => s + Number(b.amount), 0);

    // Use actual spend trend if we have it, fallback to average
    const projectedIncome = avgIncome > 0 ? avgIncome : 0;
    const projectedExpense = (avgExpense > 0 ? avgExpense : 0) + billsThisMonth;
    const monthlyDelta = projectedIncome - projectedExpense + recurringMonthlyNet;

    runningBalance += monthlyDelta;
    forecast.push({ label, balance: runningBalance, projected: true });
  }

  return forecast;
}

export default function CashFlowForecast({ summary, transactions, recurringTransactions, bills }) {
  const forecast = buildForecast({ summary, transactions, recurringTransactions, bills, months: 4 });

  if (forecast.length < 2) return null;

  const labels = forecast.map((f) => f.label);
  const balances = forecast.map((f) => Math.max(0, f.balance)); // don't go below 0 on chart

  const lastBalance = forecast[forecast.length - 1].balance;
  const firstBalance = forecast[0].balance;
  const projectedChange = lastBalance - firstBalance;
  const projectedChangePercent = firstBalance > 0 ? (projectedChange / firstBalance) * 100 : 0;
  const isTrending = projectedChange >= 0;

  const chartData = {
    labels,
    datasets: [
      {
        data: balances,
        color: (opacity = 1) =>
          isTrending ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    color: (opacity = 1) =>
      isTrending ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: isTrending ? colors.income : colors.expense,
    },
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>💡 Cash Flow Forecast</Text>
        <Text style={styles.subtitle}>Projected balance · next 4 months</Text>
      </View>

      {/* Projected trend badge */}
      <View style={[styles.trendBadge, { backgroundColor: isTrending ? colors.incomeLight : colors.expenseLight }]}>
        {isTrending
          ? <TrendingUp size={16} color={colors.income} />
          : <TrendingDown size={16} color={colors.expense} />
        }
        <Text style={[styles.trendText, { color: isTrending ? colors.income : colors.expense }]}>
          {isTrending ? '+' : ''}₱{projectedChange.toFixed(0)} projected ({projectedChangePercent.toFixed(0)}%)
        </Text>
      </View>

      <View style={{ overflow: 'hidden', borderRadius: radius.md, marginTop: spacing.sm }}>
        <LineChart
          data={chartData}
          width={screenWidth}
          height={180}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: radius.md }}
          withDots
          withInnerLines={false}
          withOuterLines
          fromZero={false}
        />
      </View>

      {/* Month breakdown */}
      <View style={styles.breakdown}>
        {forecast.slice(1).map((f) => (
          <View key={f.label} style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>{f.label}</Text>
            <Text style={[
              styles.breakdownValue,
              { color: f.balance >= firstBalance ? colors.income : colors.expense },
            ]}>
              ₱{f.balance >= 1000
                ? (f.balance / 1000).toFixed(1) + 'k'
                : f.balance.toFixed(0)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.disclaimer}>
        * Based on your spending trends, recurring transactions, and upcoming bills.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  header: { marginBottom: spacing.sm },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  trendText: { fontSize: 13, fontWeight: '700' },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  breakdownItem: { alignItems: 'center', gap: 2 },
  breakdownLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  breakdownValue: { fontSize: 13, fontWeight: '700' },
  disclaimer: { fontSize: 10, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
});
