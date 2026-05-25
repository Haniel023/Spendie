/**
 * BalanceCard — card-centric hero
 *
 * The active card in the carousel drives what the home screen shows.
 * Month navigation has been removed; filtering is now per-card.
 */

import { View, StyleSheet } from 'react-native';
import CardCarousel from './CardCarousel';

export default function BalanceCard({
  cards = [], transactions = [], onAddCard, onEditCard, onCardChange, onViewAllCards, selectedCardId,
  // legacy props accepted but unused (summary, monthSummary, selectedMonth, selectedYear, onMonthChange)
}) {
  return (
    <View style={styles.heroWrap}>
      <CardCarousel
        cards={cards}
        transactions={transactions}
        onAdd={onAddCard}
        onEdit={onEditCard}
        onCardChange={onCardChange}
        onViewAll={onViewAllCards}
        selectedCardId={selectedCardId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
});
