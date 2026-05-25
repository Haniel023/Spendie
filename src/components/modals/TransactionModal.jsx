/**
 * TransactionModal — add / edit a transaction
 *
 * Bottom-sheet modal.  All form state lives in DashboardScreen.
 * Supabase call happens in DashboardScreen handlers.
 *
 * Props:
 *   visible             boolean
 *   editingTransaction  object | null
 *   transactionForm     { type, amount, category, description, card_id }
 *   setTransactionForm  fn
 *   cards               array   — user's card accounts (for card picker)
 *   onSubmit            fn
 *   onClose             fn
 *   onDelete            fn(id)
 */

import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import {
  X, Check, Trash2, TrendingUp, TrendingDown, CreditCard,
  Briefcase, Laptop, Building2,
  UtensilsCrossed, Bus, ShoppingBag, Pill, Clapperboard, Gamepad2,
  Home, KeyRound, Zap, Wifi, ShieldCheck, Landmark,
  Package, PiggyBank, BookOpen, Plane, Gift, Tag,
} from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { categoryConfig } from '../../lib/categoryConfig';

// ── Category icon map ─────────────────────────────────────────────────────────
const ICON_MAP = {
  Briefcase, Laptop, TrendingUp: TrendingUp, Building2,
  UtensilsCrossed, Bus, ShoppingBag, Pill, Clapperboard, Gamepad2,
  Home, KeyRound, Zap, Wifi, ShieldCheck, Landmark,
  Package, PiggyBank, BookOpen, Plane, Gift, Tag,
};

// Split categories by typical use-case
const EXPENSE_CATS = [
  'Food', 'Transportation', 'Shopping', 'Health', 'Entertainment', 'Games',
  'Bills', 'Rent', 'Utilities', 'Internet', 'Insurance', 'Loan',
  'Subscriptions', 'Savings', 'Education', 'Travel', 'Gifts', 'Other',
];
const INCOME_CATS = ['Salary', 'Freelance', 'Investment', 'Business', 'Other'];

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeChip({ label, value, current, onSelect, colors }) {
  const active = current === value;
  const isIncome = value === 'income';
  const activeColor = isIncome ? colors.income : colors.expense;
  const activeBg    = isIncome ? colors.incomeLight : colors.expenseLight;
  return (
    <TouchableOpacity
      onPress={() => onSelect(value)}
      activeOpacity={0.8}
      style={[
        styles.typeChip,
        { borderColor: active ? activeColor : colors.border, backgroundColor: active ? activeBg : colors.background },
      ]}
    >
      {isIncome
        ? <TrendingUp  size={14} color={active ? activeColor : colors.textMuted} strokeWidth={2.5} />
        : <TrendingDown size={14} color={active ? activeColor : colors.textMuted} strokeWidth={2.5} />
      }
      <Text style={[styles.typeChipText, { color: active ? activeColor : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
        {label}
      </Text>
      {active && <View style={[styles.typeChipDot, { backgroundColor: activeColor }]} />}
    </TouchableOpacity>
  );
}

function CategoryChip({ cat, current, onSelect, colors }) {
  const cfg    = categoryConfig[cat];
  const Icon   = cfg ? (ICON_MAP[cfg.iconName] ?? Tag) : Tag;
  const color  = cfg?.color ?? '#6b7280';
  const active = current === cat;
  return (
    <TouchableOpacity
      onPress={() => onSelect(cat)}
      activeOpacity={0.8}
      style={[
        styles.catChip,
        {
          borderColor: active ? color : colors.border,
          backgroundColor: active ? color + '18' : colors.background,
        },
      ]}
    >
      <Icon size={13} color={active ? color : colors.textMuted} strokeWidth={2} />
      <Text style={[styles.catChipText, { color: active ? color : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
        {cat}
      </Text>
    </TouchableOpacity>
  );
}

function CardChip({ card, current, onSelect, colors }) {
  const active = current === (card?.id ?? null);
  return (
    <TouchableOpacity
      onPress={() => onSelect(card?.id ?? null)}
      activeOpacity={0.8}
      style={[
        styles.cardChip,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primaryLight : colors.background,
        },
      ]}
    >
      <CreditCard size={13} color={active ? colors.primary : colors.textMuted} strokeWidth={2} />
      <Text style={[styles.cardChipText, { color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
        {card ? (card.bank_name || card.card_name) : 'No Card'}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function TransactionModal({
  visible, editingTransaction, transactionForm, setTransactionForm,
  cards = [], onSubmit, onClose, onDelete,
}) {
  const { colors } = useTheme();
  const set = (key, val) => setTransactionForm((f) => ({ ...f, [key]: val }));

  const categories = transactionForm.type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kavWrap}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>

            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </Text>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                <X size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

              {/* ── Type ── */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
              <View style={styles.typeRow}>
                <TypeChip label="Expense" value="expense" current={transactionForm.type} onSelect={(v) => { set('type', v); set('category', ''); }} colors={colors} />
                <TypeChip label="Income"  value="income"  current={transactionForm.type} onSelect={(v) => { set('type', v); set('category', ''); }} colors={colors} />
              </View>

              {/* ── Amount ── */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
              <TextInput
                style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="₱0.00"
                placeholderTextColor={colors.textMuted}
                value={transactionForm.amount}
                onChangeText={(v) => set('amount', v)}
                keyboardType="decimal-pad"
              />

              {/* ── Category ── */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
              <View style={styles.chipGrid}>
                {categories.map((cat) => (
                  <CategoryChip
                    key={cat}
                    cat={cat}
                    current={transactionForm.category}
                    onSelect={(v) => set('category', v)}
                    colors={colors}
                  />
                ))}
              </View>

              {/* ── Card ── */}
              {cards.length > 0 && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Card Account</Text>
                  <View style={styles.cardRow}>
                    <CardChip card={null} current={transactionForm.card_id} onSelect={(v) => set('card_id', v)} colors={colors} />
                    {cards.map((c) => (
                      <CardChip key={c.id} card={c} current={transactionForm.card_id} onSelect={(v) => set('card_id', v)} colors={colors} />
                    ))}
                  </View>
                </>
              )}

              {/* ── Description ── */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="What was this for?"
                placeholderTextColor={colors.textMuted}
                value={transactionForm.description}
                onChangeText={(v) => set('description', v)}
              />

              {/* ── Save ── */}
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={onSubmit} activeOpacity={0.85}>
                <Check size={16} color="#fff" strokeWidth={3} />
                <Text style={styles.saveBtnText}>
                  {editingTransaction ? 'Save Changes' : 'Add Transaction'}
                </Text>
              </TouchableOpacity>

              {/* ── Delete (edit only) ── */}
              {editingTransaction && onDelete && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: '#ef4444' }]}
                  onPress={() => onDelete(editingTransaction.id)}
                  activeOpacity={0.8}
                >
                  <Trash2 size={14} color="#ef4444" />
                  <Text style={styles.deleteBtnText}>Delete Transaction</Text>
                </TouchableOpacity>
              )}

            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kavWrap: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },

  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 4 },

  // Type chips
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5,
  },
  typeChipText: { fontSize: 13 },
  typeChipDot: { width: 6, height: 6, borderRadius: 3 },

  // Amount input
  amountInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 20, fontWeight: '700',
    marginBottom: 16,
  },

  // Category chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  catChipText: { fontSize: 12 },

  // Card chips
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  cardChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  cardChipText: { fontSize: 12 },

  // Description
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, marginBottom: 20,
  },

  // Buttons
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
    marginBottom: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 14, borderWidth: 1.5,
    paddingVertical: 12, marginBottom: 8,
  },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
