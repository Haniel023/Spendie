/**
 * CardModal — add / edit a card account
 *
 * Bottom-sheet modal. Form state lives in DashboardScreen.
 * Supabase insert/update happens in DashboardScreen handlers.
 *
 * Props:
 *   visible       boolean
 *   cardForm      object   { card_name, card_holder_name, last_four, card_type,
 *                            bank_name, card_color_from, card_color_to,
 *                            credit_limit, current_balance,
 *                            expiry_month, expiry_year, notes }
 *   setCardForm   function
 *   editingCard   object | null
 *   onSubmit      function
 *   onClose       function
 *   onDelete      function
 */

import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { X, CreditCard, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';
import { CardWidget, CARD_COLOR_PRESETS } from '../dashboard/CardCarousel';

const CARD_TYPES = [
  { id: 'visa',       label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'amex',       label: 'Amex' },
  { id: 'gcash',      label: 'GCash' },
  { id: 'maya',       label: 'Maya' },
  { id: 'other',      label: 'Other' },
];

export default function CardModal({ visible, cardForm, setCardForm, editingCard, onSubmit, onClose, onDelete }) {
  const { colors, spacing, radius } = useTheme();

  const set = (key, val) => setCardForm((f) => ({ ...f, [key]: val }));

  // Build preview card from current form values
  const previewCard = {
    card_name:        cardForm.card_name        || 'My Card',
    card_holder_name: cardForm.card_holder_name || '',
    last_four:        cardForm.last_four        || '',
    card_type:        cardForm.card_type        || 'visa',
    bank_name:        cardForm.bank_name        || '',
    card_color_from:  cardForm.card_color_from  || '#1a1a2e',
    card_color_to:    cardForm.card_color_to    || '#16213e',
    expiry_month:     cardForm.expiry_month     || '',
    expiry_year:      cardForm.expiry_year      || '',
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavWrapper}
        >
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <CreditCard size={18} color={colors.primary} />
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  {editingCard ? 'Edit Card' : 'Add Card'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Live preview */}
              <View style={styles.previewWrap}>
                <CardWidget card={previewCard} width={320} onPress={() => {}} />
              </View>

              {/* Card Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Card Nickname *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. BDO Savings, GCash Main"
                  placeholderTextColor={colors.textMuted}
                  value={cardForm.card_name}
                  onChangeText={(v) => set('card_name', v)}
                />
              </View>

              {/* Bank Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Bank / Provider</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. BDO, BPI, GCash"
                  placeholderTextColor={colors.textMuted}
                  value={cardForm.bank_name}
                  onChangeText={(v) => set('bank_name', v)}
                />
              </View>

              {/* Card Type */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Card Type</Text>
                <View style={styles.chipRow}>
                  {CARD_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.chip,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        cardForm.card_type === t.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => set('card_type', t.id)}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: colors.textSecondary },
                        cardForm.card_type === t.id && { color: '#ffffff' },
                      ]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Last 4 digits + Expiry row */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Last 4 Digits</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="1234"
                    placeholderTextColor={colors.textMuted}
                    value={cardForm.last_four}
                    onChangeText={(v) => set('last_four', v.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Expiry (MM / YYYY)</Text>
                  <View style={styles.expiryRow}>
                    <TextInput
                      style={[styles.input, styles.expiryInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="MM"
                      placeholderTextColor={colors.textMuted}
                      value={cardForm.expiry_month}
                      onChangeText={(v) => set('expiry_month', v.replace(/\D/g, '').slice(0, 2))}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={[styles.expirySlash, { color: colors.textMuted }]}>/</Text>
                    <TextInput
                      style={[styles.input, styles.expiryInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="YYYY"
                      placeholderTextColor={colors.textMuted}
                      value={cardForm.expiry_year}
                      onChangeText={(v) => set('expiry_year', v.replace(/\D/g, '').slice(0, 4))}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>

              {/* Card Holder Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Card Holder Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="As printed on card"
                  placeholderTextColor={colors.textMuted}
                  value={cardForm.card_holder_name}
                  onChangeText={(v) => set('card_holder_name', v)}
                  autoCapitalize="characters"
                />
              </View>

              {/* Current Balance + Credit Limit row */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Current Balance</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={cardForm.current_balance}
                    onChangeText={(v) => set('current_balance', v)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Credit Limit (optional)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="e.g. 30000"
                    placeholderTextColor={colors.textMuted}
                    value={cardForm.credit_limit}
                    onChangeText={(v) => set('credit_limit', v)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Card Color */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Card Color</Text>
                <View style={styles.colorRow}>
                  {CARD_COLOR_PRESETS.map((p) => {
                    const selected = cardForm.card_color_from === p.from && cardForm.card_color_to === p.to;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => { set('card_color_from', p.from); set('card_color_to', p.to); }}
                        style={[styles.colorSwatch, selected && styles.colorSwatchSelected]}
                      >
                        <View style={[styles.colorSwatchInner, { backgroundColor: p.from }]} />
                        <Text style={[styles.colorSwatchLabel, { color: colors.textMuted }]}>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Any notes about this card…"
                  placeholderTextColor={colors.textMuted}
                  value={cardForm.notes}
                  onChangeText={(v) => set('notes', v)}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={onSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>
                  {editingCard ? 'Save Changes' : 'Add Card'}
                </Text>
              </TouchableOpacity>

              {/* Delete button (edit only) */}
              {editingCard && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: '#ef4444' }]}
                  onPress={onDelete}
                  activeOpacity={0.8}
                >
                  <Trash2 size={14} color="#ef4444" />
                  <Text style={styles.deleteBtnText}>Delete Card</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kavWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    marginBottom: 16,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Live preview
  previewWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },

  // Form
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  notesInput: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiryInput: { flex: 1, textAlign: 'center' },
  expirySlash: { fontSize: 16, fontWeight: '600' },

  // Card type chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  // Color swatches
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#7c3aed',
  },
  colorSwatchInner: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  colorSwatchLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Save / Delete
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    marginBottom: 8,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
