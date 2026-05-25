/**
 * Memory Cards — Nostalgic Financial Memories
 *
 * Shows time-based financial flashbacks:
 * "One year ago today...", "Your best month was...", etc.
 *
 * Tone: warm, curious, forward-looking. Never guilt-tripping.
 */

import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BookOpen, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useSettings } from '../../lib/SettingsContext';
import { generateMemoryCards } from '../../lib/memoryEngine';

const TYPE_COLORS = {
  anniversary: '#7c3aed',
  income_anniversary: '#15803d',
  six_months: '#1d4ed8',
  first_anniversary: '#b45309',
  year_comparison: '#0e7490',
  best_month: '#92400e',
};

function MemoryCard({ memory, colors }) {
  const accent = TYPE_COLORS[memory.type] || colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: accent + '12', borderColor: accent + '40' }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{memory.icon}</Text>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: accent }]}>{memory.title}</Text>
          {memory.lookback && (
            <Text style={[styles.cardLookback, { color: colors.textMuted }]}>
              📌 {memory.lookback}
            </Text>
          )}
        </View>
      </View>
      <Text style={[styles.cardMessage, { color: colors.textPrimary }]}>{memory.message}</Text>
      {memory.nudge && (
        <View style={[styles.nudgeRow, { backgroundColor: accent + '18' }]}>
          <Sparkles size={11} color={accent} />
          <Text style={[styles.nudgeText, { color: accent }]}>{memory.nudge}</Text>
        </View>
      )}
    </View>
  );
}

export default function MemoryCards({ transactions }) {
  const { colors, spacing } = useTheme();
  const { memoryCardsEnabled } = useSettings();

  const memories = useMemo(() => generateMemoryCards(transactions), [transactions]);

  if (!memoryCardsEnabled || memories.length === 0) return null;

  return (
    <View style={[styles.wrapper, { marginBottom: spacing.sm }]}>
      {/* Header */}
      <View style={[styles.headerRow, { marginHorizontal: spacing.lg }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>MEMORIES</Text>
        <View style={styles.titleRow}>
          <BookOpen size={15} color={colors.textPrimary} strokeWidth={2.5} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Your Money Story</Text>
        </View>
      </View>

      {/* Cards scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]}
      >
        {memories.map((m, i) => (
          <MemoryCard key={i} memory={m} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  headerRow: { marginBottom: 10 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '800' },

  scrollContent: { gap: 12, paddingBottom: 4 },

  card: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardIcon: { fontSize: 28, marginTop: 2 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  cardLookback: { fontSize: 11, fontStyle: 'italic' },
  cardMessage: { fontSize: 13, lineHeight: 20 },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: 8,
    padding: 10,
  },
  nudgeText: { fontSize: 12, fontWeight: '600', lineHeight: 18, flex: 1 },
});
