import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';
import { useTheme } from '../../lib/ThemeContext';
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

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function CategoryTrends({ transactions, selectedMonth, selectedYear }) {
  const { colors, shadow } = useTheme();

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear  = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  const thisMap = getCategorySpendingForMonth(transactions, selectedMonth, selectedYear);
  const prevMap = getCategorySpendingForMonth(transactions, prevMonth, prevYear);

  const allCategories = Array.from(new Set([...Object.keys(thisMap), ...Object.keys(prevMap)]));
  if (allCategories.length === 0) return null;

  const trends = allCategories
    .map((cat) => {
      const thisAmt = thisMap[cat] || 0;
      const prevAmt = prevMap[cat] || 0;
      let changePercent = null;
      let direction = 'same';
      if (prevAmt > 0) {
        changePercent = ((thisAmt - prevAmt) / prevAmt) * 100;
        if (changePercent > 5)        direction = 'up';
        else if (changePercent < -5)  direction = 'down';
      } else if (thisAmt > 0) {
        direction = 'new';
      }
      return { cat, thisAmt, prevAmt, changePercent, direction };
    })
    .sort((a, b) => b.thisAmt - a.thisAmt);

  return (
    <View style={[s.card, { backgroundColor: colors.card, marginHorizontal: 20, marginBottom: 8 }, shadow.card]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>Category Trends</Text>
        <Text style={[s.subtitle, { color: colors.textMuted }]}>
          {MONTHS_SHORT[selectedMonth]} vs {MONTHS_SHORT[prevMonth]}
        </Text>
      </View>

      {trends.map(({ cat, thisAmt, prevAmt, changePercent, direction }) => {
        const catIcon  = categoryConfig[cat]?.icon  || '✨';
        const catColor = categoryConfig[cat]?.color || colors.textMuted;

        const trendColor =
          direction === 'down' ? colors.income
          : direction === 'up' ? colors.expense
          : colors.textMuted;

        const TrendIcon =
          direction === 'up'   ? TrendingUp
          : direction === 'down' ? TrendingDown
          : Minus;

        return (
          <View key={cat} style={[s.row, { borderBottomColor: colors.border }]}>
            <View style={[s.iconWrap, { backgroundColor: catColor + '22' }]}>
              <Text style={s.catIcon}>{catIcon}</Text>
            </View>

            <View style={s.info}>
              <Text style={[s.catName, { color: colors.textPrimary }]}>{cat}</Text>
              <Text style={[s.prevAmt, { color: colors.textMuted }]}>
                {prevAmt > 0 ? `Prev: ₱${prevAmt.toFixed(0)}` : 'New this month'}
              </Text>
            </View>

            <View style={s.right}>
              <Text style={[s.thisAmt, { color: catColor }]}>₱{thisAmt.toFixed(0)}</Text>
              {changePercent !== null && (
                <View style={[s.trendBadge, { backgroundColor: trendColor + '18' }]}>
                  <TrendIcon size={11} color={trendColor} />
                  <Text style={[s.trendText, { color: trendColor }]}>
                    {Math.abs(changePercent).toFixed(0)}%
                  </Text>
                </View>
              )}
              {direction === 'new' && (
                <View style={[s.trendBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[s.trendText, { color: colors.primary }]}>New</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card:      { borderRadius: 16, padding: 16 },
  header:    { marginBottom: 12 },
  title:     { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  subtitle:  { fontSize: 11 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  iconWrap:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catIcon:   { fontSize: 18 },
  info:      { flex: 1 },
  catName:   { fontSize: 14, fontWeight: '600' },
  prevAmt:   { fontSize: 11, marginTop: 1 },
  right:     { alignItems: 'flex-end', gap: 3 },
  thisAmt:   { fontSize: 15, fontWeight: '700' },
  trendBadge:{
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  trendText: { fontSize: 11, fontWeight: '600' },
});
