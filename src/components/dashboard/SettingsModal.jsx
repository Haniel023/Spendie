/**
 * Settings Modal — Full bottom-sheet settings hub
 *
 * Replaces the embedded SettingsPanel in the Profile tab.
 * Accessible from the ⚙️ button in the Header anywhere in the app.
 *
 * Sections:
 *   🎨  Appearance  (theme picker + seasonal auto + focus mode)
 *   🤖  AI Coach    (personality picker)
 *   🎉  Celebrations (payday celebration)
 *   💡  Insights    (memory cards + regret tracker)
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Modal,
  ScrollView, Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useSettings } from '../../lib/SettingsContext';
import { COACH_PERSONALITIES, PERSONALITY_ORDER } from '../../lib/coachEngine';
import ThemePicker from '../common/ThemePicker';
import { scheduleDailyLoggingReminder, scheduleWeeklyBudgetReminder, cancelNotificationsByTag, requestNotificationPermissions } from '../../lib/pushNotifications';

// ── Section Label ──────────────────────────────────────────────────────────────

function SectionLabel({ title }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionLabelRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionLabelText, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

// ── Toggle Row ─────────────────────────────────────────────────────────────────

function ToggleRow({ icon, label, description, value, onToggle, isLast = false }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.toggleRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border + '60' },
      ]}
    >
      <View style={[styles.toggleIconWrap, { backgroundColor: colors.primaryLight }]}>
        <Text style={styles.toggleIcon}>{icon}</Text>
      </View>
      <View style={styles.toggleInfo}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
        {description ? (
          <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary + '55' }}
        thumbColor={value ? colors.primary : '#9ca3af'}
      />
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SettingsModal({ visible, onClose }) {
  const { colors, spacing, seasonalEnabled, toggleSeasonalTheme } = useTheme();
  const {
    coachPersonality,
    focusMode,
    paydayCelebrationEnabled,
    memoryCardsEnabled,
    regretTrackerEnabled,
    dailyReminderEnabled,
    weeklyBudgetReminderEnabled,
    updateSetting,
  } = useSettings();

  const handleDailyReminderToggle = async (v) => {
    updateSetting('dailyReminderEnabled', v);
    if (v) {
      const granted = await requestNotificationPermissions();
      if (granted) scheduleDailyLoggingReminder(20, 0).catch(() => {});
    } else {
      cancelNotificationsByTag('daily_logging').catch(() => {});
    }
  };

  const handleWeeklyReminderToggle = async (v) => {
    updateSetting('weeklyBudgetReminderEnabled', v);
    if (v) {
      const granted = await requestNotificationPermissions();
      if (granted) scheduleWeeklyBudgetReminder().catch(() => {});
    } else {
      cancelNotificationsByTag('weekly_budget').catch(() => {});
    }
  };

  const currentPersonality =
    COACH_PERSONALITIES[coachPersonality] ?? COACH_PERSONALITIES.supportive;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Stop touch propagation so sheet stays open when tapped inside */}
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>

          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Settings</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                Personalize your Spendie experience
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.primaryLight }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <X size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >

            {/* ── Appearance ───────────────────────────────────────────── */}
            <SectionLabel title="🎨  APPEARANCE" />

            <View style={[styles.themeBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.themeBlockLabel, { color: colors.textSecondary }]}>
                Theme
              </Text>
              <ThemePicker inline />
            </View>

            <View style={[styles.toggleGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ToggleRow
                icon="🍂"
                label="Seasonal Auto-Theme"
                description="Switch themes automatically by season (Christmas, Summer…)"
                value={seasonalEnabled}
                onToggle={toggleSeasonalTheme}
              />
              <ToggleRow
                icon="🌫️"
                label="Focus Mode"
                description="Blur balance amounts for privacy or reduced anxiety"
                value={focusMode}
                onToggle={(v) => updateSetting('focusMode', v)}
                isLast
              />
            </View>

            {/* ── AI Coach ─────────────────────────────────────────────── */}
            <SectionLabel title="🤖  AI COACH" />

            <View style={[styles.coachBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Personality</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.personalityRow}
              >
                {PERSONALITY_ORDER.map((id) => {
                  const p = COACH_PERSONALITIES[id];
                  const isActive = id === coachPersonality;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.personalityChip,
                        { borderColor: isActive ? colors.primary : colors.border },
                        isActive && { backgroundColor: colors.primaryLight },
                      ]}
                      onPress={() => updateSetting('coachPersonality', id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.personalityEmoji}>{p.emoji}</Text>
                      <Text
                        style={[
                          styles.personalityName,
                          { color: isActive ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Active personality preview */}
              <View
                style={[
                  styles.activePersonalityCard,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary + '30',
                  },
                ]}
              >
                <Text style={[styles.activePersonalityName, { color: colors.primary }]}>
                  {currentPersonality.emoji}  {currentPersonality.name}
                </Text>
                <Text style={[styles.activePersonalityDesc, { color: colors.textSecondary }]}>
                  {currentPersonality.description}
                </Text>
              </View>
            </View>

            {/* ── Celebrations ─────────────────────────────────────────── */}
            <SectionLabel title="🎉  CELEBRATIONS" />

            <View style={[styles.toggleGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ToggleRow
                icon="💸"
                label="Payday Celebration"
                description="Show confetti animation when income is logged"
                value={paydayCelebrationEnabled}
                onToggle={(v) => updateSetting('paydayCelebrationEnabled', v)}
                isLast
              />
            </View>

            {/* ── Insights ─────────────────────────────────────────────── */}
            <SectionLabel title="💡  INSIGHTS" />

            <View style={[styles.toggleGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ToggleRow
                icon="📸"
                label="Memory Cards"
                description="Nostalgic flashbacks from your past spending"
                value={memoryCardsEnabled}
                onToggle={(v) => updateSetting('memoryCardsEnabled', v)}
              />
              <ToggleRow
                icon="😬"
                label="Regret Tracker"
                description="Rate purchases as Worth It, Neutral, or Regret"
                value={regretTrackerEnabled}
                onToggle={(v) => updateSetting('regretTrackerEnabled', v)}
                isLast
              />
            </View>

            {/* ── Notifications ─────────────────────────────────────── */}
            <SectionLabel title="🔔  NOTIFICATIONS" />

            <View style={[styles.toggleGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ToggleRow
                icon="📅"
                label="Daily Logging Reminder"
                description="Remind you at 8 PM every day to log your expenses"
                value={!!dailyReminderEnabled}
                onToggle={handleDailyReminderToggle}
              />
              <ToggleRow
                icon="📊"
                label="Weekly Budget Check-In"
                description="Get a Sunday reminder to review your spending"
                value={!!weeklyBudgetReminderEnabled}
                onToggle={handleWeeklyReminderToggle}
                isLast
              />
            </View>

            {/* Footer */}
            <Text style={[styles.footerNote, { color: colors.textMuted }]}>
              All settings are saved locally on your device 🔒
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontSize: 13,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // Section label
  sectionLabelRow: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  sectionLabelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  // Toggle group card
  toggleGroup: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  toggleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIcon: { fontSize: 18 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  toggleDesc: { fontSize: 11, lineHeight: 15 },

  // Theme block
  themeBlock: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 14,
    paddingBottom: 4,
  },
  themeBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  // Sub-label
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // Coach block
  coachBlock: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingBottom: 14,
  },
  personalityRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  personalityChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
    minWidth: 76,
  },
  personalityEmoji: { fontSize: 22 },
  personalityName: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  activePersonalityCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  activePersonalityName: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  activePersonalityDesc: { fontSize: 12, lineHeight: 18 },

  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
});
