/**
 * ThemePicker
 *
 * Two modes:
 *   • inline={false} (default) — bottom-sheet Modal (used from the old header flow)
 *   • inline={true}            — renders the grid directly inside a parent scroll
 *                                (used inside SettingsModal)
 *
 * Bug fix: active state now uses `effectiveThemeId` so the checkmark always
 * reflects what the app is actually showing (seasonal or user-chosen).
 */

import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';

// ── Theme Grid ─────────────────────────────────────────────────────────────────

function ThemeGrid({ onSelect, colors, effectiveThemeId, seasonalEnabled, allThemes }) {
  return (
    <View style={styles.grid}>
      {allThemes.map((theme) => {
        const isActive = theme.id === effectiveThemeId;
        const isSeasonal = theme.seasonal && seasonalEnabled && isActive;
        const tc = theme.colors;

        return (
          <TouchableOpacity
            key={theme.id}
            style={[
              styles.themeCard,
              { backgroundColor: tc.card, borderColor: isActive ? tc.primary : colors.border },
              isActive && styles.activeCard,
            ]}
            onPress={() => onSelect(theme.id)}
            activeOpacity={0.8}
          >
            {/* Mini preview */}
            <View style={[styles.swatch, { backgroundColor: tc.background }]}>
              <View style={[styles.swatchBar, { backgroundColor: tc.primary }]} />
              <View style={styles.swatchRow}>
                <View style={[styles.swatchBlock, { backgroundColor: tc.income }]} />
                <View style={[styles.swatchBlock, { backgroundColor: tc.expense }]} />
                <View style={[styles.swatchBlock, { backgroundColor: tc.info }]} />
              </View>
              <View style={[styles.swatchCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                <View style={[styles.swatchLine, { backgroundColor: tc.textPrimary }]} />
                <View style={[styles.swatchLine, { backgroundColor: tc.textMuted, width: '60%' }]} />
              </View>
            </View>

            {/* Label row */}
            <View style={styles.themeLabel}>
              <Text style={styles.themeEmoji}>{theme.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {theme.name}
                </Text>
                {isSeasonal && (
                  <Text style={[styles.seasonalTag, { color: tc.primary }]}>🍂 Auto-active</Text>
                )}
              </View>
            </View>

            {/* Active badge */}
            {isActive && (
              <View style={[styles.activeBadge, { backgroundColor: tc.primary }]}>
                <Check size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ThemePicker({ visible, onClose, inline = false }) {
  const { colors, effectiveThemeId, seasonalEnabled, selectTheme, allThemes } = useTheme();

  const handleSelect = (id) => {
    selectTheme(id);
    if (onClose) onClose();
  };

  // ── Inline mode (used inside SettingsModal) ────────────────────────────────
  if (inline) {
    return (
      <View style={styles.inlineWrapper}>
        <ThemeGrid
          onSelect={handleSelect}
          colors={colors}
          effectiveThemeId={effectiveThemeId}
          seasonalEnabled={seasonalEnabled}
          allThemes={allThemes}
        />
      </View>
    );
  }

  // ── Modal mode (bottom sheet) ──────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>🎨 Choose Theme</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.primaryLight }]}
            >
              <X size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Pick a visual style for your app
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemeGrid
              onSelect={handleSelect}
              colors={colors}
              effectiveThemeId={effectiveThemeId}
              seasonalEnabled={seasonalEnabled}
              allThemes={allThemes}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Modal wrapper
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 13, marginBottom: 16 },

  // Inline wrapper
  inlineWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Shared grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 16,
  },
  themeCard: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  activeCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // Preview swatch
  swatch: {
    padding: 10,
    gap: 6,
  },
  swatchBar: {
    height: 6,
    borderRadius: 3,
    width: '100%',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 4,
  },
  swatchBlock: {
    flex: 1,
    height: 12,
    borderRadius: 4,
  },
  swatchCard: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 6,
    gap: 4,
  },
  swatchLine: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },

  // Label
  themeLabel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  themeEmoji: { fontSize: 16, lineHeight: 20 },
  themeName: { fontSize: 12, fontWeight: '700', lineHeight: 18 },
  seasonalTag: { fontSize: 9, fontWeight: '600', marginTop: 1 },

  // Active badge
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
