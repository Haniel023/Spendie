/**
 * CardPickerModal — bottom-sheet card selector
 *
 * Shows all cards as tappable mini widgets. Tapping one selects it
 * (highlights with a ring + checkmark) and calls onSelect(card).
 * A "+ Add Card" ghost tile sits at the bottom.
 *
 * Props:
 *   visible        boolean
 *   cards          array
 *   selectedCardId string | null
 *   onSelect       fn(card)
 *   onAdd          fn()
 *   onClose        fn()
 */

import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, CreditCard, Plus, Check } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';

const CARD_TYPE_LABELS = {
  visa:       'VISA',
  mastercard: 'MASTERCARD',
  amex:       'AMEX',
  gcash:      'GCASH',
  maya:       'MAYA',
  other:      'CARD',
};

// ── Mini card widget (used only inside picker) ────────────────────────────────
function PickerCard({ card, selected, onPress, computedBalance }) {
  const masked  = card.last_four ? `···· ···· ···· ${card.last_four}` : '···· ···· ···· ····';
  const expiry  = (card.expiry_month && card.expiry_year)
    ? `${String(card.expiry_month).padStart(2, '0')}/${card.expiry_year.slice(-2)}`
    : null;
  const balance = computedBalance !== undefined ? computedBalance : Number(card.current_balance ?? 0);
  const typeLabel = CARD_TYPE_LABELS[card.card_type] ?? 'CARD';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.pickerCardWrap}>
      <LinearGradient
        colors={[card.card_color_from ?? '#1a1a2e', card.card_color_to ?? '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.pickerCard, selected && styles.pickerCardSelected]}
      >
        {/* Selection ring overlay */}
        {selected && (
          <View style={styles.selectedRing} pointerEvents="none" />
        )}

        {/* Checkmark badge */}
        {selected && (
          <View style={styles.checkBadge}>
            <Check size={11} color="#fff" strokeWidth={3} />
          </View>
        )}

        {/* Top row: bank + type */}
        <View style={styles.pcTop}>
          <Text style={styles.pcBank} numberOfLines={1}>
            {card.bank_name || card.card_name}
          </Text>
          <Text style={styles.pcType}>{typeLabel}</Text>
        </View>

        {/* Masked number */}
        <Text style={styles.pcNumber}>{masked}</Text>

        {/* Bottom row: holder + balance + expiry */}
        <View style={styles.pcBottom}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pcHolder} numberOfLines={1}>
              {(card.card_holder_name || card.card_name || '').toUpperCase()}
            </Text>
            {expiry && <Text style={styles.pcExpiry}>{expiry}</Text>}
          </View>
          <View style={styles.pcBalWrap}>
            <Text style={styles.pcBalLabel}>BALANCE</Text>
            <Text style={styles.pcBalance}>
              ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
function computeCardBalance(card, transactions) {
  const opening = Number(card.current_balance ?? 0);
  const net = (transactions || [])
    .filter((t) => t.card_id === card.id)
    .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
  return opening + net;
}

export default function CardPickerModal({ visible, cards = [], transactions = [], selectedCardId, onSelect, onAdd, onClose }) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>

          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <CreditCard size={16} color={colors.primary} strokeWidth={2} />
              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Your Cards</Text>
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                  {cards.length} card{cards.length !== 1 ? 's' : ''} · tap to select
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.background }]}
            >
              <X size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Cards list */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          >
            {cards.map((card) => (
              <PickerCard
                key={card.id}
                card={card}
                selected={card.id === selectedCardId}
                computedBalance={computeCardBalance(card, transactions)}
                onPress={() => {
                  onSelect(card);
                  onClose();
                }}
              />
            ))}

            {/* Add card ghost */}
            <TouchableOpacity
              onPress={() => { onAdd(); onClose(); }}
              activeOpacity={0.75}
              style={[styles.ghostCard, { borderColor: colors.border }]}
            >
              <View style={[styles.ghostIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Plus size={18} color={colors.primary} />
              </View>
              <Text style={[styles.ghostText, { color: colors.textPrimary }]}>Add a new card</Text>
              <Text style={[styles.ghostSub, { color: colors.textMuted }]}>
                Credit, debit, e-wallet
              </Text>
            </TouchableOpacity>
          </ScrollView>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', paddingTop: 12 },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub:   { fontSize: 11, fontWeight: '500', marginTop: 1 },
  closeBtn:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: 20, paddingBottom: 36, gap: 12 },

  // Picker card
  pickerCardWrap: {},
  pickerCard: {
    borderRadius: 16,
    padding: 16,
    height: 140,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  pickerCardSelected: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  selectedRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  pcTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pcBank: {
    fontSize: 13, fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    flex: 1, marginRight: 8,
  },
  pcType: {
    fontSize: 9, fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  pcNumber: {
    fontSize: 13, fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
  },
  pcBottom: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  pcHolder: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
  },
  pcExpiry: {
    fontSize: 10, fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  pcBalWrap:  { alignItems: 'flex-end' },
  pcBalLabel: {
    fontSize: 7, fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
  },
  pcBalance: {
    fontSize: 18, fontWeight: '800',
    color: '#ffffff', letterSpacing: -0.5,
  },

  // Ghost add card
  ghostCard: {
    borderRadius: 16, borderWidth: 1.5,
    borderStyle: 'dashed',
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  ghostIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  ghostText: { fontSize: 14, fontWeight: '700' },
  ghostSub:  { fontSize: 11, fontWeight: '500', marginTop: 2 },
});
