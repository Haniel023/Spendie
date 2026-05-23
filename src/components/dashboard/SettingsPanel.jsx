/**
 * Settings Panel — In-app user preferences
 *
 * Embedded in the Profile tab. Controls:
 *   - AI Coach personality
 *   - Roast Mode toggle
 *   - Focus Mode toggle
 *   - Payday celebration toggle
 *   - Seasonal themes auto-switch
 *   - Memory cards toggle
 *   - Regret tracker toggle
 *   - Theme picker (re-uses existing ThemePicker)
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView,
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useSettings } from '../../lib/SettingsContext';
import { COACH_PERSONALITIES, PERSONALITY_ORDER } from '../../lib/coachEngine';
import ThemePicker from '../common/ThemePicker';

// ── Toggle Row ────────────────────────────────────────────────────────────────

function SettingToggle({ icon, label, description, value, onToggle, accentColor }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleIcon}>{icon}</Text>
      <View style={styles.toggleInfo}>
        <Text style={[styles.toggleLabel, { color: '#1f2937' }]}>{label}</Text>
        {description ? (
          <Text style={[styles.toggleDesc, { color: '#6b7280' }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#e5e7eb', true: accentColor + '60' }}
        thumbColor={value ? accentColor : '#9ca3af'}
      />
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ title, colors }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textMuted, borderBottomColor: colors.border }]}>
      {title}
    </Text>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SettingsPanel() {
  const { colors, spacing, allThemes, themeId, selectTheme } = useTheme();
  const settings = useSettings();
  const [expanded, setExpanded] = useState(false);

  const {
    coachPersonality,
    focusMode,
    roastEnabled,
    paydayCelebrationEnabled,
    seasonalThemeAuto,
    memoryCardsEnabled,
    regretTrackerEnabled,
    updateSetting,
  } = settings;

  const currentPersonality = COACH_PERSONALITIES[coachPersonality] ?? COACH_PERSONALITIES.supportive;

  return (
    <View style={[styles.wrapper, { marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
      {/* Header / Toggle */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>PREFERENCES</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>⚙️ App Settings</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.content, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* ── Appearance ──────────────────────────────────────────────── */}
          <SectionHeader title="🎨  APPEARANCE" colors={colors} />

          <View style={styles.themeSection}>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Theme</Text>
            <ThemePicker />
          </View>

          <SettingToggle
            icon="🍂"
            label="Seasonal Auto-Theme"
            description="Automatically switch to seasonal themes (Christmas, Halloween, etc.)"
            value={seasonalThemeAuto}
            onToggle={(v) => updateSetting('seasonalThemeAuto', v)}
            accentColor={colors.primary}
          />

          <SettingToggle
            icon="🌫️"
            label="Focus Mode"
            description="Blur sensitive balance amounts for financial privacy or reduced anxiety"
            value={focusMode}
            onToggle={(v) => updateSetting('focusMode', v)}
            accentColor={colors.primary}
          />

          {/* ── AI Coach ────────────────────────────────────────────────── */}
          <SectionHeader title="🤖  AI COACH" colors={colors} />

          <View style={styles.coachSection}>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Active Personality</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.personalityScroll}
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
                    <Text style={styles.personalityChipEmoji}>{p.emoji}</Text>
                    <Text style={[styles.personalityChipName, { color: isActive ? colors.primary : colors.textSecondary }]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={[styles.activePersonalityCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
              <Text style={[styles.activePersonalityName, { color: colors.primary }]}>
                {currentPersonality.emoji} {currentPersonality.name}
              </Text>
              <Text style={[styles.activePersonalityDesc, { color: colors.textSecondary }]}>
                {currentPersonality.description}
              </Text>
            </View>
          </View>

          <SettingToggle
            icon="🎤"
            label="Roast Mode"
            description="Get funny (non-toxic) spending commentary from your AI coach"
            value={roastEnabled}
            onToggle={(v) => updateSetting('roastEnabled', v)}
            accentColor={colors.primary}
          />

          {/* ── Notifications & Celebrations ─────────────────────────── */}
          <SectionHeader title="🎉  CELEBRATIONS" colors={colors} />

          <SettingToggle
            icon="💸"
            label="Payday Celebration"
            description="Show confetti animation when a salary/income transaction is added"
            value={paydayCelebrationEnabled}
            onToggle={(v) => updateSetting('paydayCelebrationEnabled', v)}
            accentColor={colors.primary}
          />

          {/* ── Insights ────────────────────────────────────────────────── */}
          <SectionHeader title="💡  INSIGHTS" colors={colors} />

          <SettingToggle
            icon="📸"
            label="Memory Cards"
            description="Show nostalgic financial flashbacks from your past spending"
            value={memoryCardsEnabled}
            onToggle={(v) => updateSetting('memoryCardsEnabled', v)}
            accentColor={colors.primary}
          />

          <SettingToggle
            icon="😬"
            label="Regret Tracker"
            description="Rate purchases as 'Worth It', 'Neutral', or 'Regret' for self-awareness"
            value={regretTrackerEnabled}
            onToggle={(v) => updateSetting('regretTrackerEnabled', v)}
            accentColor={colors.primary}
          />

          {/* Footer note */}
          <Text style={[styles.footerNote, { color: colors.textMuted }]}>
            All settings are saved locally on your device. 🔒
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '800' },
  chevron: { fontSize: 12, fontWeight: '700' },

  content: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 8,
  },

  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
    color: '#9ca3af',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  toggleIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleDesc: { fontSize: 11, marginTop: 2, lineHeight: 16 },

  themeSection: { paddingHorizontal: 16, paddingVertical: 12 },
  subLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },

  coachSection: { paddingHorizontal: 16, paddingTop: 12 },
  personalityScroll: { gap: 8, paddingBottom: 12 },
  personalityChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  personalityChipEmoji: { fontSize: 22 },
  personalityChipName: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  activePersonalityCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  activePersonalityName: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  activePersonalityDesc: { fontSize: 12, lineHeight: 18 },

  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
});
