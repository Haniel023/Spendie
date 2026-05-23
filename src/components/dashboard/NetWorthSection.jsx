import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { TrendingUp, TrendingDown, Plus, X } from 'lucide-react-native';
import { colors, spacing, radius, shadow, typography } from '../../lib/theme';

const screenWidth = Dimensions.get('window').width - spacing.lg * 4;

const chartConfig = {
  backgroundColor: colors.white,
  backgroundGradientFrom: colors.white,
  backgroundGradientTo: colors.white,
  color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: '5', strokeWidth: '2', stroke: colors.primary },
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function NetWorthSection({ entries = [], onSaveEntry }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ cash: '', savings: '', investments: '', debts: '', notes: '' });

  const sorted = [...entries].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const calcNetWorth = (e) =>
    (Number(e?.cash ?? 0) + Number(e?.savings ?? 0) + Number(e?.investments ?? 0)) - Number(e?.debts ?? 0);

  const latestNW = calcNetWorth(latest);
  const previousNW = calcNetWorth(previous);
  const change = latestNW - previousNW;
  const changePercent = previousNW !== 0 ? (change / Math.abs(previousNW)) * 100 : null;

  const handleSave = () => {
    onSaveEntry({
      cash: Number(form.cash) || 0,
      savings: Number(form.savings) || 0,
      investments: Number(form.investments) || 0,
      debts: Number(form.debts) || 0,
      notes: form.notes,
      snapshot_date: new Date().toISOString().split('T')[0],
    });
    setForm({ cash: '', savings: '', investments: '', debts: '', notes: '' });
    setShowModal(false);
  };

  // Chart data
  const chartEntries = sorted.slice(-6); // last 6 snapshots
  const chartData = chartEntries.length >= 2
    ? {
        labels: chartEntries.map((e) => {
          const d = new Date(e.snapshot_date);
          return MONTHS_SHORT[d.getMonth()];
        }),
        datasets: [{ data: chartEntries.map(calcNetWorth), strokeWidth: 3 }],
      }
    : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💎 Net Worth</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus size={14} color={colors.primary} />
          <Text style={styles.addBtnText}>Update</Text>
        </TouchableOpacity>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>Track your net worth</Text>
          <Text style={styles.emptyText}>
            Log your cash, savings, investments and debts to see your total net worth grow over time.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.startBtnText}>Add First Snapshot</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Current net worth */}
          <View style={styles.nwBanner}>
            <View>
              <Text style={styles.nwLabel}>Total Net Worth</Text>
              <Text style={[styles.nwValue, { color: latestNW >= 0 ? colors.income : colors.expense }]}>
                {latestNW >= 0 ? '' : '-'}₱{Math.abs(latestNW).toLocaleString()}
              </Text>
            </View>
            {changePercent !== null && (
              <View style={[styles.changeBadge, { backgroundColor: change >= 0 ? colors.incomeLight : colors.expenseLight }]}>
                {change >= 0 ? <TrendingUp size={14} color={colors.income} /> : <TrendingDown size={14} color={colors.expense} />}
                <Text style={[styles.changeText, { color: change >= 0 ? colors.income : colors.expense }]}>
                  {change >= 0 ? '+' : ''}₱{Math.abs(change).toLocaleString()} ({changePercent?.toFixed(1)}%)
                </Text>
              </View>
            )}
          </View>

          {/* Breakdown */}
          {latest && (
            <View style={styles.breakdown}>
              {[
                { label: 'Cash', value: latest.cash, icon: '💵', color: colors.income },
                { label: 'Savings', value: latest.savings, icon: '🏦', color: colors.info },
                { label: 'Investments', value: latest.investments, icon: '📈', color: colors.primary },
                { label: 'Debts', value: latest.debts, icon: '💸', color: colors.expense },
              ].map((item) => (
                <View key={item.label} style={styles.breakdownItem}>
                  <Text style={styles.breakdownIcon}>{item.icon}</Text>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <Text style={[styles.breakdownValue, { color: item.color }]}>
                    ₱{Number(item.value ?? 0).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Chart */}
          {chartData && (
            <View style={styles.chartWrap}>
              <Text style={styles.chartTitle}>Net Worth History</Text>
              <LineChart
                data={chartData}
                width={screenWidth}
                height={160}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: radius.md }}
                withDots
                withInnerLines={false}
                fromZero={false}
              />
            </View>
          )}
        </>
      )}

      {/* Update Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Update Net Worth</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {[
                { key: 'cash', label: 'Cash on Hand', icon: '💵', placeholder: 'e.g. 5000' },
                { key: 'savings', label: 'Savings / Bank', icon: '🏦', placeholder: 'e.g. 50000' },
                { key: 'investments', label: 'Investments', icon: '📈', placeholder: 'e.g. 0' },
                { key: 'debts', label: 'Total Debts / Loans', icon: '💸', placeholder: 'e.g. 10000' },
              ].map((field) => (
                <View key={field.key} style={styles.fieldRow}>
                  <Text style={styles.fieldIcon}>{field.icon}</Text>
                  <View style={styles.fieldBody}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textMuted}
                      value={form[field.key]}
                      onChangeText={(v) => setForm({ ...form, [field.key]: v })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ))}
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.fieldInput, { marginHorizontal: 0, marginBottom: spacing.md }]}
                placeholder="Any notes about this snapshot…"
                placeholderTextColor={colors.textMuted}
                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
              />

              {/* Live preview */}
              <View style={[styles.preview, {
                backgroundColor: (
                  (Number(form.cash) || 0) + (Number(form.savings) || 0) + (Number(form.investments) || 0) - (Number(form.debts) || 0)
                ) >= 0 ? colors.incomeLight : colors.expenseLight,
              }]}>
                <Text style={styles.previewLabel}>Net Worth Preview</Text>
                <Text style={[styles.previewValue, {
                  color: (
                    (Number(form.cash) || 0) + (Number(form.savings) || 0) + (Number(form.investments) || 0) - (Number(form.debts) || 0)
                  ) >= 0 ? colors.income : colors.expense,
                }]}>
                  ₱{(
                    (Number(form.cash) || 0) + (Number(form.savings) || 0) + (Number(form.investments) || 0) - (Number(form.debts) || 0)
                  ).toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>💾 Save Snapshot</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { ...typography.h3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyText: { ...typography.body, textAlign: 'center', marginBottom: spacing.md },
  startBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.full },
  startBtnText: { color: colors.white, fontWeight: '700' },
  nwBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  nwLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  nwValue: { fontSize: 28, fontWeight: '800' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm },
  changeText: { fontSize: 12, fontWeight: '700' },
  breakdown: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  breakdownItem: { flex: 1, alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.sm, gap: 2 },
  breakdownIcon: { fontSize: 18 },
  breakdownLabel: { fontSize: 10, color: colors.textMuted },
  breakdownValue: { fontSize: 12, fontWeight: '700' },
  chartWrap: { marginTop: spacing.xs },
  chartTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40, maxHeight: '85%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, backgroundColor: colors.background },
  fieldIcon: { fontSize: 22 },
  fieldBody: { flex: 1 },
  fieldLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  fieldInput: { fontSize: 15, color: colors.textPrimary, borderWidth: 0, padding: 0 },
  preview: { borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  previewLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  previewValue: { fontSize: 24, fontWeight: '800' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
