/**
 * App Header — Premium redesign
 *
 * Changes from original:
 *   - Theme emoji button → Settings gear (opens full Settings modal)
 *   - Compact, cleaner layout with better hierarchy
 *   - App name prominently on left, actions on right
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Settings, LogOut } from 'lucide-react-native';
import NotificationBell from './NotificationBell';
import { useTheme } from '../../lib/ThemeContext';

export default function Header({
  displayName,
  notifications,
  showNotifications,
  setShowNotifications,
  markNotificationsAsRead,
  onLogout,
  onSettingsOpen,
}) {
  const { colors, spacing, currentTheme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
        },
      ]}
    >
      {/* Left: branding + greeting */}
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>{currentTheme.emoji}</Text>
          <Text style={styles.brandName}>Spendie</Text>
        </View>
        <Text style={styles.greeting} numberOfLines={1}>
          Hey, {displayName} 👋
        </Text>
      </View>

      {/* Right: action buttons */}
      <View style={styles.actions}>
        {/* Settings */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onSettingsOpen}
          accessibilityLabel="Open settings"
        >
          <Settings size={18} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        {/* Notifications */}
        <NotificationBell
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          markNotificationsAsRead={markNotificationsAsRead}
        />

        {/* Logout */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onLogout}
          accessibilityLabel="Log out"
        >
          <LogOut size={18} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  left: {
    flex: 1,
    marginRight: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  brandEmoji: {
    fontSize: 14,
  },
  brandName: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
