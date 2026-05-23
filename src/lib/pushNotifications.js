/**
 * Spendie Push Notification Service
 *
 * Handles:
 *   • Permission request & token registration
 *   • Scheduling local notifications (bills, budget warnings, reminders)
 *   • Cancelling scheduled notifications
 *   • Immediate "insight" notifications
 *
 * Usage:
 *   import { initNotifications, scheduleBillReminder, scheduleInsightNotification } from './pushNotifications';
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// ── Default handler: show notification in foreground ─────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Permission & Init ─────────────────────────────────────────────────────────

/**
 * Request notification permissions and return the permission status.
 * Call this once on app mount (or when user first accesses a notifications feature).
 * @returns {Promise<boolean>} true if permissions granted
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Full init: request permissions and set up Android channel.
 * Call once in App.js / root component.
 */
export async function initNotifications() {
  const granted = await requestNotificationPermissions();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('spendie-reminders', {
      name: 'Spendie Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
      sound: true,
    });

    await Notifications.setNotificationChannelAsync('spendie-insights', {
      name: 'Spendie Insights',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#7C3AED',
    });

    await Notifications.setNotificationChannelAsync('spendie-alerts', {
      name: 'Spendie Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 500, 500],
      lightColor: '#ef4444',
      sound: true,
    });
  }

  return granted;
}

// ── Immediate notification ────────────────────────────────────────────────────

/**
 * Send an immediate local notification.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {'reminders'|'insights'|'alerts'} [opts.channel]
 * @param {object} [opts.data]   extra payload
 */
export async function sendImmediateNotification({ title, body, channel = 'insights', data = {} }) {
  if (Platform.OS === 'web') {
    // Web browser notification fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon.png' });
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: `spendie-${channel}` } : {}),
    },
    trigger: null, // immediate
  });
}

// ── Scheduled notifications ───────────────────────────────────────────────────

/**
 * Schedule a bill due reminder.
 * @param {object} opts
 * @param {string}   opts.billId
 * @param {string}   opts.billName
 * @param {number}   opts.amount
 * @param {string}   opts.dueDate      ISO date string (YYYY-MM-DD)
 * @param {number}   [opts.daysBeforeReminder]  default 3
 * @returns {Promise<string|null>} notification identifier (for cancellation)
 */
export async function scheduleBillReminder({ billId, billName, amount, dueDate, daysBeforeReminder = 3 }) {
  if (Platform.OS === 'web') return null;

  const due = new Date(dueDate);
  const remindAt = new Date(due);
  remindAt.setDate(remindAt.getDate() - daysBeforeReminder);
  remindAt.setHours(9, 0, 0, 0); // 9 AM

  if (remindAt <= new Date()) return null; // already past

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `📅 Bill Due Soon — ${billName}`,
      body: `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} due on ${dueDate}. Don't let this one slip!`,
      data: { type: 'bill_reminder', billId },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'spendie-reminders' } : {}),
    },
    trigger: { date: remindAt },
  });

  return id;
}

/**
 * Schedule a daily logging reminder.
 * @param {number} hour   hour of day (0-23), default 20 (8 PM)
 * @param {number} minute minute, default 0
 * @returns {Promise<string>} notification identifier
 */
export async function scheduleDailyLoggingReminder(hour = 20, minute = 0) {
  if (Platform.OS === 'web') return null;

  // Cancel existing daily reminder first
  await cancelNotificationsByTag('daily_logging');

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💸 Did you log today's expenses?`,
      body: `Keep your tracker up to date — every peso counts! Tap to log now.`,
      data: { type: 'daily_logging', tag: 'daily_logging' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'spendie-reminders' } : {}),
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });

  return id;
}

/**
 * Schedule a weekly budget review reminder (every Sunday 10 AM).
 * @returns {Promise<string>} notification identifier
 */
export async function scheduleWeeklyBudgetReminder() {
  if (Platform.OS === 'web') return null;

  await cancelNotificationsByTag('weekly_budget');

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `📊 Weekly Budget Check-In`,
      body: `How's your spending this week? Open Spendie and see where you stand!`,
      data: { type: 'weekly_budget', tag: 'weekly_budget' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'spendie-reminders' } : {}),
    },
    trigger: {
      weekday: 1, // Sunday (1 = Sunday in Expo)
      hour: 10,
      minute: 0,
      repeats: true,
    },
  });

  return id;
}

// ── Insight-based alerts ──────────────────────────────────────────────────────

/**
 * Send a budget exceeded notification immediately.
 * @param {string} category
 * @param {number} spent
 * @param {number} limit
 */
export async function notifyBudgetExceeded(category, spent, limit) {
  const over = spent - limit;
  await sendImmediateNotification({
    title: `🛑 ${category} Budget Exceeded!`,
    body: `You've gone ₱${over.toLocaleString('en-PH', { minimumFractionDigits: 2 })} over your ${category} budget. Time to pump the brakes!`,
    channel: 'alerts',
    data: { type: 'budget_exceeded', category },
  });
}

/**
 * Send a low balance warning immediately.
 * @param {number} balance
 */
export async function notifyLowBalance(balance) {
  await sendImmediateNotification({
    title: `⚠️ Balance Running Low`,
    body: `You only have ₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })} left. Consider pausing discretionary spend.`,
    channel: 'alerts',
    data: { type: 'low_balance' },
  });
}

/**
 * Send a spending milestone notification (e.g., saved X% this month).
 * @param {string} title
 * @param {string} message
 */
export async function notifySpendingMilestone(title, message) {
  await sendImmediateNotification({
    title,
    body: message,
    channel: 'insights',
    data: { type: 'milestone' },
  });
}

/**
 * Send a payday / income logged notification.
 * @param {number} amount
 */
export async function notifyPayday(amount) {
  await sendImmediateNotification({
    title: `💸 Payday! ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} logged`,
    body: `Quick — allocate some to savings before discretionary spending takes over! 🚀`,
    channel: 'insights',
    data: { type: 'payday' },
  });
}

// ── Cancel helpers ────────────────────────────────────────────────────────────

/**
 * Cancel a specific scheduled notification by its ID.
 */
export async function cancelNotification(notificationId) {
  if (!notificationId || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all notifications matching a tag in their data payload.
 * (Iterates through scheduled notifications to find matches.)
 */
export async function cancelNotificationsByTag(tag) {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.tag === tag) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Cancel ALL scheduled notifications for Spendie.
 */
export async function cancelAllNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Notification received listener ───────────────────────────────────────────

/**
 * Register a listener for received notifications (foreground).
 * Returns an unsubscribe function.
 * @param {function} handler  – receives the notification object
 */
export function addNotificationReceivedListener(handler) {
  const subscription = Notifications.addNotificationReceivedListener(handler);
  return () => subscription.remove();
}

/**
 * Register a listener for notification response (user tapped the notification).
 * Returns an unsubscribe function.
 * @param {function} handler  – receives the notification response
 */
export function addNotificationResponseListener(handler) {
  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  return () => subscription.remove();
}
