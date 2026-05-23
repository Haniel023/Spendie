import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * variant: 'light' (white text — use on colored/dark bg, e.g. BalanceCard)
 *          'dark'  (colored text — use on white cards)
 */
export default function MonthNavigator({ month, year, onChange, variant = 'light' }) {
  const { colors, spacing } = useTheme();
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  const textColor = variant === 'light' ? 'rgba(255,255,255,0.9)' : colors.textPrimary;
  const arrowBg  = variant === 'light' ? 'rgba(255,255,255,0.15)' : colors.primaryLight;
  const arrowColor = variant === 'light' ? 'rgba(255,255,255,0.9)' : colors.primary;
  const arrowDisabled = variant === 'light' ? 'rgba(255,255,255,0.3)' : colors.border;
  const badgeBg  = variant === 'light' ? 'rgba(255,255,255,0.2)' : colors.primaryLight;
  const badgeText = variant === 'light' ? 'rgba(255,255,255,0.9)' : colors.primary;

  const goPrev = () => {
    if (month === 0) onChange(11, year - 1);
    else onChange(month - 1, year);
  };

  const goNext = () => {
    if (isCurrentMonth) return;
    if (month === 11) onChange(0, year + 1);
    else onChange(month + 1, year);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goPrev} style={[styles.arrow, { backgroundColor: arrowBg }]}>
        <ChevronLeft size={18} color={arrowColor} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={[styles.monthText, { color: textColor }]}>
          {MONTHS[month]} {year}
        </Text>
        {isCurrentMonth && (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeText }]}>This Month</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={goNext}
        style={[styles.arrow, { backgroundColor: arrowBg }]}
        disabled={isCurrentMonth}
      >
        <ChevronRight size={18} color={isCurrentMonth ? arrowDisabled : arrowColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 4,
    minWidth: 150,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
