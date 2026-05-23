import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';
import { toPHDate } from '../../lib/timezone';

function getCategorySpendingForMonth(transactions, month, year) {
  const map = {};
  transactions
    .filter((t) => {
      const d = toPHDate(t.created_at);
      return t.type === 'expense' && d.getMonth() === month && d.getFullYear() === year;
    })
    .forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
  return map;
}

export default function CategoryTrends({ transactions, selectedMonth, selectedYear }) {
  const now = new Date();

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  const thisMap = getCategorySpendingForMonth(transactions, selectedMonth, selectedYear);
  const prevMap = getCategorySpendingForMonth(transactions, prevMonth, prevYear);

  // Merge all categories that appear in either month
  const allCategories = Array.from(
    new Set([...Object.keys(thisMap), ...Object.keys(prevMap)])
  );

  if (allCategories.length === 0) {
    return null;
  }

  const trends = allCategories
    .map((cat) => {
      const thisAmt = thisMap[cat] || 0;
      const prevAmt = prevMap[cat] || 0;
      let changePercent = null;
      let direction = 'same';

      if (prevAmt > 0) {
        changePercent = ((thisAmt - prevAmt) / prevAmt) * 100;
        if (changePercent > 5) direction = 'up';
        else if (changePercent < -5) direction = 'down';
      } else if (thisAmt > 0) {
        direction = 'new';
        changePercent = null;
      }

      return { cat, thisAmt, prevAmt, changePercent, direction };
    })
    .sort((a, b) => b.thisAmt - a.thisAmt);

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Category Trends</Text>
        <Text style={styles.subtitle}>
          {MONTHS_SHORT[selectedMonth]} vs {MONTHS_SHORT[prevMonth]}
        </Text>
      </View>

      {trends.map(({ cat, thisAmt, prevAmt, changePercent, direction }) => {
        const catIcon = categoryConfig[cat]?.icon || '✨';
        const catColor = categoryConfig[cat]?.color || colors.textMuted;

        const trendColor =
          direction === 'down' ? colors.success
          : direction === 'up' ? colors.expense
          : colors.textMuted;

        const TrendIcon =
          direction === 'up' ? TrendingUp
          : direction === 'down' ? TrendingDown
          : Minus;

        return (
          <View key={cat} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: catColor + '22' }]}>
              <Text style={styles.catIcon}>{catIcon}</Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.catName}>{cat}</Text>
              <Text style={styles.prevAmt}>
                {prevAmt > 0 ? `Prev: ₱${prevAmt.toFixed(0)}` : 'New this month'}
              </Text>
            </View>

            <View style={styles.right}>
              <Text style={[styles.thisAmt, { color: catColor }]}>
                ₱{thisAmt.toFixed(0)}
              </Text>
              {changePercent !== null && (
                <View style={styles.trendBadge}>
                  <TrendIcon size={11} color={trendColor} />
                  <Text style={[styles.trendText, { color: trendColor }]}>
                    {Math.abs(changePercent).toFixed(0)}%
                  </Text>
                </View>
              )}
              {direction === 'new' && (
                <View style={[styles.trendBadge, { backgroundColor: colors.infoLight }]}>
                  <Text style={[styles.trendText, { color: colors.info }]}>New</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
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
  header: { marginBottom: spacing.md },
  title: { ...typography.h3 },
  subtitle: { ...typography.small },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIcon: { fontSize: 18 },
  info: { flex: 1 },
  catName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  prevAmt: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 3 },
  thisAmt: { fontSize: 15, fontWeight: '700' },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  trendText: { fontSize: 11, fontWeight: '600' },
});
