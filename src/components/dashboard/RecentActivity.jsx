/**
 * RecentActivity — last 5 transactions with category icon, description, date and amount.
 *
 * Props:
 *   transactions  array   (already filtered to current month by parent)
 *   onViewAll     fn      called when "View All" is tapped (switches to transactions tab)
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Activity, ChevronRight,
  Briefcase, Laptop, TrendingUp, Building2,
  UtensilsCrossed, Bus, ShoppingBag, Pill, Clapperboard, Gamepad2,
  Home, KeyRound, Zap, Wifi, ShieldCheck, Landmark,
  Package, PiggyBank, BookOpen, Plane, Gift, Tag,
} from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { categoryConfig } from '../../lib/categoryConfig';
import { toPHDate, getPHNow, formatPHTime } from '../../lib/timezone';

// ── Icon lookup ───────────────────────────────────────────────────────────────
const ICON_MAP = {
  Briefcase, Laptop, TrendingUp, Building2,
  UtensilsCrossed, Bus, ShoppingBag, Pill, Clapperboard, Gamepad2,
  Home, KeyRound, Zap, Wifi, ShieldCheck, Landmark,
  Package, PiggyBank, BookOpen, Plane, Gift, Tag,
};

// ── Date formatter ────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  try {
    const d   = toPHDate(dateStr);
    const now = getPHNow();

    const dDay  = new Date(d.getFullYear(),   d.getMonth(),   d.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff  = Math.round((today - dDay) / 86400000);

    const hhmm = formatPHTime(dateStr); // always PH timezone regardless of device locale

    if (diff === 0) return `Today, ${hhmm}`;
    if (diff === 1) return `Yesterday, ${hhmm}`;
    if (diff < 7)  return `${d.toLocaleDateString('en-PH', { weekday: 'short' })}, ${hhmm}`;
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ── Category icon circle ──────────────────────────────────────────────────────
function CategoryIcon({ category }) {
  const cfg      = categoryConfig[category];
  const IconComp = cfg ? (ICON_MAP[cfg.iconName] ?? Tag) : Tag;
  const color    = cfg?.color ?? '#6b7280';
  return (
    <View style={[styles.iconWrap, { backgroundColor: color + '1a' }]}>
      <IconComp size={16} color={color} strokeWidth={2} />
    </View>
  );
}

// ── Single row ────────────────────────────────────────────────────────────────
function TransactionRow({ item, colors, isLast }) {
  const isIncome = item.type === 'income';
  const title    = item.description || item.category;
  const subtitle = item.description ? item.category : null;

  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <CategoryIcon category={item.category} />

      <View style={styles.rowMid}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle ? `${subtitle} · ` : ''}{formatDate(item.created_at)}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color: isIncome ? colors.income : colors.expense }]}>
          {isIncome ? '+' : '-'}₱{Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={[styles.typeBadge, { backgroundColor: isIncome ? colors.incomeLight : colors.expenseLight }]}>
          <Text style={[styles.typeBadgeText, { color: isIncome ? colors.income : colors.expense }]}>
            {isIncome ? 'Income' : 'Expense'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ colors }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
        <Activity size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No activity yet</Text>
      <Text style={[styles.emptySub, { color: colors.textMuted }]}>Your latest transactions will appear here.</Text>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RecentActivity({ transactions = [], onViewAll }) {
  const { colors } = useTheme();
  const recent = transactions.slice(0, 5);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Recent Activity</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Latest money movement</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity
            onPress={onViewAll}
            activeOpacity={0.75}
            style={[styles.viewAllBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            <ChevronRight size={12} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* Rows or empty */}
      {recent.length === 0 ? (
        <EmptyState colors={colors} />
      ) : (
        <View>
          {recent.map((item, index) => (
            <TransactionRow
              key={item.id}
              item={item}
              colors={colors}
              isLast={index === recent.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowMid: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 11,
    fontWeight: '400',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  rowAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
