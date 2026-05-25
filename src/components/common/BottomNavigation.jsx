/**
 * BottomNavigation — floating glass pill with a raised center FAB
 *
 * Layout:
 *   [Home] [Log]  [ + FAB ]  [Plan] [Trends]
 *
 * Active indicator: primary-colored icon + small dot underneath (no text label).
 * Center FAB: raised above the bar, theme-colored circle, context-aware action.
 */

import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Receipt, Target, TrendingUp, Plus } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import GlassView from './GlassView';

const LEFT_TABS  = [
  { id: 'overview',     iconName: 'Home',       Icon: Home     },
  { id: 'transactions', iconName: 'Receipt',    Icon: Receipt  },
];
const RIGHT_TABS = [
  { id: 'planning',     iconName: 'Target',     Icon: Target   },
  { id: 'analytics',   iconName: 'TrendingUp', Icon: TrendingUp },
];

/** Detect whether a hex color is dark (luminance < 0.25) */
function isHexDark(hex = '#ffffff') {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.25;
}

function NavTab({ tab, active, onPress, colors }) {
  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={tab.id}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <tab.Icon
        size={22}
        color={active ? colors.primary : colors.textMuted}
        strokeWidth={active ? 2.5 : 1.8}
      />
      {/* Active dot indicator */}
      <View style={[styles.dot, { backgroundColor: active ? colors.primary : 'transparent' }]} />
    </TouchableOpacity>
  );
}

export default function BottomNavigation({ activeTab, setActiveTab, onFloatingPress }) {
  const { colors } = useTheme();
  const isDark = isHexDark(colors.background);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Glass pill bar */}
      <GlassView
        tint={isDark ? 'dark' : 'light'}
        intensity={85}
        showBorder
        style={[
          styles.bar,
          {
            borderColor: isDark
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.6)',
            shadowColor: isDark ? '#000' : colors.primary,
          },
        ]}
      >
        {/* Left tabs */}
        {LEFT_TABS.map((tab) => (
          <NavTab
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onPress={() => setActiveTab(tab.id)}
            colors={colors}
          />
        ))}

        {/* Center placeholder so the FAB doesn't overlap tab icons */}
        <View style={styles.fabGap} />

        {/* Right tabs */}
        {RIGHT_TABS.map((tab) => (
          <NavTab
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onPress={() => setActiveTab(tab.id)}
            colors={colors}
          />
        ))}
      </GlassView>

      {/* Raised center FAB — floats above the bar */}
      <TouchableOpacity
        onPress={onFloatingPress}
        activeOpacity={0.85}
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
        accessibilityLabel="Add"
        accessibilityRole="button"
      >
        <Plus size={26} color="#ffffff" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',   // centers the FAB horizontally
    zIndex: 100,
  },

  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 16,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Empty space in bar where the FAB sits
  fabGap: {
    width: 64,
  },

  // Raised FAB — sits above the bar center
  fab: {
    position: 'absolute',
    bottom: 14,           // lifted above bar center
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
});
