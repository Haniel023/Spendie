import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';
import { toPHDate } from '../../lib/timezone';

const screenWidth = Dimensions.get('window').width - spacing.lg * 4;

const chartConfig = {
  backgroundColor: colors.white,
  backgroundGradientFrom: colors.white,
  backgroundGradientTo: colors.white,
  color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function MonthlyTrendChart({ transactions }) {
  const grouped = {};

  transactions.forEach((item) => {
    const date = toPHDate(item.created_at);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = MONTHS_SHORT[month] + " '" + String(year).slice(2);
    if (!grouped[key]) grouped[key] = { key, label, income: 0, expenses: 0 };
    if (item.type === 'income') grouped[key].income += Number(item.amount);
    else grouped[key].expenses += Number(item.amount);
  });

  const sorted = Object.keys(grouped).sort().map((k) => grouped[k]);

  if (sorted.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Monthly Trends</Text>
        <Text style={styles.subtitle}>Income vs expense flow</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyText}>Add transactions to see trends.</Text>
        </View>
      </View>
    );
  }

  const chartData = {
    labels: sorted.map((d) => d.label),
    datasets: [
      { data: sorted.map((d) => d.income), color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, strokeWidth: 3 },
      { data: sorted.map((d) => d.expenses), color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, strokeWidth: 3 },
    ],
    legend: ['Income', 'Expenses'],
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Monthly Trends</Text>
      <Text style={styles.subtitle}>Income vs expense flow</Text>
      <LineChart
        data={chartData}
        width={screenWidth}
        height={200}
        chartConfig={chartConfig}
        bezier
        style={{ marginTop: spacing.md, borderRadius: radius.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  title: { ...typography.h3 },
  subtitle: { ...typography.small, marginBottom: spacing.md },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyText: { ...typography.body, textAlign: 'center' },
});
