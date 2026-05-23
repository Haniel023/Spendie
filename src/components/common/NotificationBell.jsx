import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

const ICONS = { danger: '⚠️', warning: '🔔', goal: '🎯', success: '🎉', info: '💡' };

export default function NotificationBell({
  notifications,
  showNotifications,
  setShowNotifications,
  markNotificationsAsRead,
}) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleOpen = async () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) await markNotificationsAsRead();
  };

  return (
    <View>
      <TouchableOpacity style={styles.iconBtn} onPress={handleOpen} accessibilityLabel="Notifications">
        <Bell size={18} color={colors.white} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showNotifications}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowNotifications(false)}>
          <Pressable style={styles.panel} onPress={() => {}}>
            <Text style={styles.panelTitle}>Notifications</Text>

            {notifications.length === 0 ? (
              <Text style={styles.empty}>No notifications yet.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {notifications.map((n) => (
                  <View key={n.id} style={styles.item}>
                    <Text style={styles.notifIcon}>{ICONS[n.type] ?? '💡'}</Text>
                    <View style={styles.notifBody}>
                      <Text style={styles.notifTitle}>{n.title}</Text>
                      <Text style={styles.notifMessage}>{n.message}</Text>
                      <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.expense,
    borderRadius: radius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: spacing.xl,
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: 300,
    maxHeight: 400,
    ...shadow.card,
  },
  panelTitle: { ...typography.h3, marginBottom: spacing.md },
  empty: { ...typography.body, textAlign: 'center', paddingVertical: spacing.lg },
  item: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  notifIcon: { fontSize: 20 },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  notifMessage: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  notifTime: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
