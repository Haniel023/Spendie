/**
 * CardCarousel — stacked bank card widgets
 *
 * Layout:
 *   Header row: "YOUR CARDS" label + "+ Add Card" button
 *   Stacked cards: active card on top, back cards peek below
 *   Info panel: balance, expiry, holder name of the active card
 *   Dots: navigation indicator (only when >1 card)
 *
 * Exports CARD_COLOR_PRESETS for use in CardModal.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditCard, Plus } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';

const CARD_HEIGHT = 210;
const PEEK_TOP    = 44;   // px of the back card's top row that peeks above the active card

export const CARD_COLOR_PRESETS = [
  { id: 'midnight', label: 'Midnight', from: '#1a1a2e', to: '#16213e' },
  { id: 'ocean',    label: 'Ocean',    from: '#0c4a6e', to: '#0369a1' },
  { id: 'forest',   label: 'Forest',   from: '#14532d', to: '#166534' },
  { id: 'rose',     label: 'Rose',     from: '#881337', to: '#be123c' },
  { id: 'violet',   label: 'Violet',   from: '#4c1d95', to: '#5b21b6' },
  { id: 'gold',     label: 'Gold',     from: '#78350f', to: '#b45309' },
];

const CARD_TYPE_LABELS = {
  visa:       'VISA',
  mastercard: 'MASTERCARD',
  amex:       'AMEX',
  gcash:      'GCASH',
  maya:       'MAYA',
  other:      'CARD',
};

// ── Single card widget ────────────────────────────────────────────────────────
export function CardWidget({ card, onPress, width, computedBalance }) {
  const maskedNumber = card.last_four
    ? `···· ···· ···· ${card.last_four}`
    : '···· ···· ···· ····';

  const expiry = (card.expiry_month && card.expiry_year)
    ? `${String(card.expiry_month).padStart(2, '0')}/${card.expiry_year.slice(-2)}`
    : null;

  // Use computed live balance if provided, otherwise fall back to stored value
  const balance   = computedBalance !== undefined ? computedBalance : Number(card.current_balance ?? 0);
  const typeLabel = CARD_TYPE_LABELS[card.card_type] ?? 'CARD';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={{ width }}>
      <LinearGradient
        colors={[card.card_color_from ?? '#1a1a2e', card.card_color_to ?? '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardWidget, { width, height: CARD_HEIGHT }]}
      >
        <View style={styles.cardRing} pointerEvents="none" />

        {/* Top: bank name + card type */}
        <View style={styles.cardTop}>
          <Text style={styles.cardBank} numberOfLines={1}>
            {card.bank_name || card.card_name}
          </Text>
          <Text style={styles.cardType}>{typeLabel}</Text>
        </View>

        {/* Masked number */}
        <Text style={styles.cardNumber}>{maskedNumber}</Text>

        {/* Balance */}
        <View>
          <Text style={styles.cardBalLabel}>BALANCE</Text>
          <Text style={styles.cardBalance}>
            {`₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Text>
        </View>

        {/* Bottom: holder name + expiry + icon */}
        <View style={styles.cardBottom}>
          <Text style={styles.cardHolder} numberOfLines={1}>
            {(card.card_holder_name || card.card_name || '').toUpperCase()}
          </Text>
          <View style={styles.cardBottomRight}>
            {expiry && <Text style={styles.cardExpiry}>{expiry}</Text>}
            <CreditCard size={18} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Empty-state ghost card ────────────────────────────────────────────────────
function EmptyCard({ onPress, colors, width }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.ghostCard, { width, height: CARD_HEIGHT, borderColor: colors.border }]}
    >
      <View style={[styles.ghostIconWrap, { backgroundColor: colors.primaryLight }]}>
        <Plus size={18} color={colors.primary} />
      </View>
      <Text style={[styles.ghostTitle, { color: colors.textPrimary }]}>Add your first card</Text>
      <Text style={[styles.ghostSub, { color: colors.textMuted }]}>Track credit, debit & e-wallets</Text>
    </TouchableOpacity>
  );
}

// ── Carousel ──────────────────────────────────────────────────────────────────
/** Compute live balance for a card: opening balance + income txns − expense txns */
function computeCardBalance(card, transactions) {
  const opening = Number(card.current_balance ?? 0);
  const net = (transactions || [])
    .filter((t) => t.card_id === card.id)
    .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
  return opening + net;
}

export default function CardCarousel({ cards = [], transactions = [], onAdd, onEdit, onCardChange, onViewAll, selectedCardId }) {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  // ── Fully controlled: derive activeIndex from selectedCardId ──────────────
  // No internal state for activeIndex — eliminates the circular useEffect loop.
  const activeIndex = useMemo(() => {
    if (cards.length === 0) return 0;
    const idx = cards.findIndex((c) => c.id === selectedCardId);
    return idx !== -1 ? idx : 0;
  }, [selectedCardId, cards]);

  // Notify parent once when cards first load and no card is selected yet
  const initialNotified = useRef(false);
  useEffect(() => {
    if (cards.length > 0 && !initialNotified.current && onCardChange) {
      initialNotified.current = true;
      onCardChange(cards[activeIndex] ?? null);
    }
  }, [cards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch card: call parent directly — no setState, no effect cascade
  const switchCard = (idx) => {
    if (onCardChange) onCardChange(cards[idx] ?? null);
  };

  const cardWidth   = containerWidth > 0 ? containerWidth : 300;
  const hasBack     = cards.length > 1;
  const backIdx     = (activeIndex + 1) % cards.length;
  const stackHeight = hasBack ? PEEK_TOP + CARD_HEIGHT : CARD_HEIGHT;

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={styles.wrapper}
    >
      {/* Header: label + view-all + add button */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>YOUR CARDS</Text>
        <View style={styles.headerBtns}>
          {cards.length > 0 && onViewAll && (
            <TouchableOpacity
              style={[styles.viewAllBtn, { borderColor: colors.border }]}
              onPress={onViewAll}
              activeOpacity={0.75}
            >
              <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>
                View All ({cards.length})
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
            onPress={onAdd}
            activeOpacity={0.75}
          >
            <Plus size={12} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {containerWidth > 0 && (
        cards.length === 0 ? (
          <EmptyCard onPress={onAdd} colors={colors} width={cardWidth} />
        ) : (
          <>
            {/* ── Stacked cards ── */}
            {/*
              Back card sits at top=0. Active card sits at top=PEEK_TOP, covering
              all of the back card except its top PEEK_TOP px (bank name + type row).
              overflow:hidden clips anything below PEEK_TOP + CARD_HEIGHT.
            */}
            <View style={{ height: stackHeight, overflow: 'hidden' }}>
              {/* Back card — top row (bank name + type) peeks above the active card */}
              {hasBack && (
                <View style={[styles.stackedCard, { top: 0, zIndex: 1 }]}>
                  <CardWidget
                    card={cards[backIdx]}
                    width={cardWidth}
                    computedBalance={computeCardBalance(cards[backIdx], transactions)}
                    onPress={() => switchCard(backIdx)}
                  />
                </View>
              )}

              {/* Active card — slides down by PEEK_TOP, fully visible below the peek row */}
              <View style={[styles.stackedCard, { top: hasBack ? PEEK_TOP : 0, zIndex: 10 }]}>
                <CardWidget
                  card={cards[activeIndex]}
                  width={cardWidth}
                  computedBalance={computeCardBalance(cards[activeIndex], transactions)}
                  onPress={() => onEdit(cards[activeIndex])}
                />
              </View>
            </View>

            {/* ── Dots navigation ── */}
            {cards.length > 1 && (
              <View style={styles.dotsRow}>
                {cards.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => switchCard(i)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  >
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: i === activeIndex ? colors.primary : colors.border,
                          width: i === activeIndex ? 18 : 6,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {},

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Stacked card positioning
  stackedCard: {
    position: 'absolute',
    left: 0,
    right: 0,
  },

  // Real card
  cardWidget: {
    borderRadius: 18,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  cardRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    top: -65,
    right: -45,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBank: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    marginRight: 8,
  },
  cardType: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2.5,
  },
  cardBalLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    marginBottom: 1,
  },
  cardBalance: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
    lineHeight: 34,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHolder: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.8,
    flex: 1,
    marginRight: 8,
  },
  cardBottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardExpiry: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
  },

  // Navigation dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // Ghost empty card
  ghostCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghostIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  ghostTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  ghostSub: {
    fontSize: 11,
    fontWeight: '500',
  },
});
