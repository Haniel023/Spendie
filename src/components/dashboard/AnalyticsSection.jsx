import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import AnalyticsSummary from './AnalyticsSummary';
import TopCategories from './TopCategories';
import CategoryTrends from './CategoryTrends';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

const screenWidth = Dimensions.get('window').width - spacing.lg * 2 - spacing.lg * 2;

const chartConfig = {
  backgroundColor: colors.white,
  backgroundGradientFrom: colors.white,
  backgroundGradientTo: colors.white,
  color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
};

export default function AnalyticsSection({
  transactions,
  expenseByCategory,
  incomeExpenseData,
  activeSpace,
  selectedMonth,
  selectedYear,
}) {
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
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Spending overview for {activeSpace?.name}</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No analytics yet</Text>
            <Text style={styles.emptyText}>Add transactions to generate charts.</Text>
          </View>
        ) : (
          <>
            <AnalyticsSummary transactions={transactions} />
            <TopCategories transactions={transactions} />

            {expenseByCategory.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>Expense Breakdown</Text>
                <PieChart
                  data={pieData}
                  width={screenWidth}
                  height={180}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  center={[0, 0]}
                  absolute={false}
                />
              </View>
            )}

            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Income vs Expenses</Text>
              <BarChart
                data={barData}
                width={screenWidth}
                height={180}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1, index) =>
                    index === 0
                      ? `rgba(34, 197, 94, ${opacity})`
                      : `rgba(239, 68, 68, ${opacity})`,
                }}
                style={{ borderRadius: radius.md }}
                showValuesOnTopOfBars
                fromZero
              />
            </View>
          </>
        )}
      </View>

      {/* Category Trends card — always show if we have transaction history */}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  header: { marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center' },
  chartSection: { marginTop: spacing.lg },
  chartTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
});
