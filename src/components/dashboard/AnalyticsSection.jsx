import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import AnalyticsSummary from './AnalyticsSummary';
import TopCategories from './TopCategories';
import CategoryTrends from './CategoryTrends';
import { useTheme } from '../../lib/ThemeContext';

// Card: marginHorizontal 20 (= 40 total) + padding 16 (= 32 total) = 72px removed from screen
// Subtract a further 2px so the chart never bleeds to the card edge.
const CHART_WIDTH = Dimensions.get('window').width - 20 * 2 - 16 * 2 - 2;

export default function AnalyticsSection({
  transactions,
  expenseByCategory,
  incomeExpenseData,
  activeSpace,
  selectedMonth,
  selectedYear,
}) {
  const { colors, shadow } = useTheme();

  // Chart config derived from theme so it works on all 14 themes
  const chartConfig = {
    backgroundColor:         colors.card,
    backgroundGradientFrom:  colors.card,
    backgroundGradientTo:    colors.card,
    color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${hexToRgb(colors.textSecondary)}, ${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
  };

  const pieData = expenseByCategory.map((e) => ({
    name: e.name,
    population: e.value,
    color: e.color,
    legendFontColor: colors.textSecondary,
    legendFontSize: 12,
  }));

  const barData = {
    labels: incomeExpenseData.map((d) => d.name),
    datasets: [{ data: incomeExpenseData.map((d) => d.amount) }],
  };

  return (
    <>
      <View style={[s.card, { backgroundColor: colors.card }, shadow.card]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.textPrimary }]}>Analytics</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>
            Spending overview for {activeSpace?.name}
          </Text>
        </View>

        {transactions.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No analytics yet</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              Add transactions to generate charts.
            </Text>
          </View>
        ) : (
          <>
            <AnalyticsSummary transactions={transactions} />
            <TopCategories transactions={transactions} />

            {expenseByCategory.length > 0 && (
              <View style={s.chartSection}>
                <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Expense Breakdown</Text>
                <View style={s.chartClip}>
                  <PieChart
                    data={pieData}
                    width={CHART_WIDTH}
                    height={180}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    center={[0, 0]}
                    absolute={false}
                  />
                </View>
              </View>
            )}

            <View style={s.chartSection}>
              <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Income vs Expenses</Text>
              <View style={s.chartClip}>
                <BarChart
                  data={barData}
                  width={CHART_WIDTH}
                  height={180}
                  chartConfig={{
                    ...chartConfig,
                    // Per-bar colours: Income = green, Expense = red
                    color: (opacity = 1, index) =>
                      index === 0
                        ? `rgba(34, 197, 94, ${opacity})`
                        : `rgba(239, 68, 68, ${opacity})`,
                  }}
                  style={{ borderRadius: 12 }}
                  showValuesOnTopOfBars
                  fromZero
                />
              </View>
            </View>
          </>
        )}
      </View>

      {/* Category Trends — always show when there's history */}
      {transactions.length > 0 && (
        <CategoryTrends
          transactions={transactions}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Convert a CSS hex colour to "r, g, b" string for rgba() */
function hexToRgb(hex) {
  if (!hex) return '107, 114, 128'; // grey fallback
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',   // clip any chart that tries to bleed past the card edge
  },
  header:    { marginBottom: 12 },
  title:     { fontSize: 15, fontWeight: '700' },
  subtitle:  { fontSize: 11, marginTop: 2 },
  empty:     { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: 12, textAlign: 'center' },
  chartSection: { marginTop: 16 },
  chartTitle:   { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  // Wrapper that clips SVG overflow from react-native-chart-kit
  chartClip: { overflow: 'hidden', borderRadius: 12 },
});
