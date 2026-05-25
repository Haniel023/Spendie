/**
 * Header — greeting + settings + notification bell + user avatar
 *
 * The user avatar replaces the bottom-nav profile tab.
 * Tapping the avatar opens the profile tab.
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Settings, Sparkles } from 'lucide-react-native';
import NotificationBell from './NotificationBell';
import { useTheme } from '../../lib/ThemeContext';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(displayName = '') {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getFirstName(displayName = '') {
  return displayName.split(' ')[0] || displayName;
}

export default function Header({
  displayName,
  transparent = false,
  notifications,
  showNotifications,
  setShowNotifications,
  markNotificationsAsRead,
  onSettingsOpen,
  onProfileOpen,
  // onLogout kept for back-compat but no longer shown in header
}) {
  const { colors } = useTheme();

  const textColor = transparent ? '#ffffff'                   : colors.textPrimary;
  const subColor  = transparent ? 'rgba(255,255,255,0.75)'   : colors.textSecondary;
  const iconColor = transparent ? 'rgba(255,255,255,0.9)'    : colors.textSecondary;
  const iconBg    = transparent ? 'rgba(255,255,255,0.18)'   : colors.primaryLight;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: transparent ? 'transparent' : colors.card,
          borderBottomWidth: transparent ? 0 : 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Left: brand + greeting */}
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <Sparkles size={11} color={subColor} strokeWidth={2.5} />
          <Text style={[styles.brandName, { color: subColor }]}>SPENDIE</Text>
        </View>
        <Text style={[styles.greeting, { color: textColor }]} numberOfLines={1}>
          {getGreeting()}, {getFirstName(displayName)}!
        </Text>
      </View>

      {/* Right: settings + bell + avatar */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: iconBg }]}
          onPress={onSettingsOpen}
          accessibilityLabel="Open settings"
        >
          <Settings size={17} color={iconColor} strokeWidth={2} />
        </TouchableOpacity>

        <NotificationBell
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          markNotificationsAsRead={markNotificationsAsRead}
          iconColor={iconColor}
          iconBg={iconBg}
        />

        {/* User avatar — tapping opens profile tab */}
        <TouchableOpacity
          onPress={onProfileOpen}
          activeOpacity={0.8}
          style={[styles.avatar, { backgroundColor: colors.primary }]}
          accessibilityLabel="Open profile"
        >
          <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  brandName: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  greeting: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
