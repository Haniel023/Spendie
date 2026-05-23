/**
 * Premium Bottom Navigation
 *
 * Features:
 *   - Animated pill/blob active indicator
 *   - Glass-style background
 *   - Smooth label transitions
 *   - Active glow effect
 */

import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { NAV_TABS } from '../../lib/constants';
import { useTheme } from '../../lib/ThemeContext';

function NavTab({ tab, active, onPress, colors }) {
  const scale = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(active ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: active ? 1.1 : 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
      Animated.timing(labelOpacity, {
        toValue: active ? 1 : 0.55,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active]);

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={tab.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      {/* Active background pill */}
      {active && (
        <Animated.View
          style={[
            styles.activePill,
            { backgroundColor: colors.primaryLight },
            { transform: [{ scale }] },
          ]}
        />
      )}

      {/* Icon */}
      <Animated.Text style={[styles.icon, { transform: [{ scale }] }]}>
        {tab.icon}
      </Animated.Text>

      {/* Label */}
      <Animated.Text
        style={[
          styles.label,
          { color: active ? colors.primary : colors.textMuted },
          { opacity: labelOpacity },
          active && styles.activeLabel,
        ]}
      >
        {tab.mobileLabel}
      </Animated.Text>

      {/* Active dot */}
      {active && (
        <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

export default function BottomNavigation({ activeTab, setActiveTab }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.nav,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          shadowColor: colors.primary,
        },
      ]}
    >
      {NAV_TABS.map((tab) => (
        <NavTab
          key={tab.id}
          tab={tab}
          active={activeTab === tab.id}
          onPress={() => setActiveTab(tab.id)}
          colors={colors}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 8,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
    position: 'relative',
    minHeight: 52,
  },
  activePill: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    bottom: 0,
    borderRadius: 14,
  },
  icon: {
    fontSize: 22,
    lineHeight: 28,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  activeLabel: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
});
