export const colors = {
  primary: '#7c3aed',
  primaryLight: '#ede9fe',
  primaryDark: '#5b21b6',
  background: '#f8f5ff',
  card: '#ffffff',
  border: '#e5e7eb',
  textPrimary: '#1e1b4b',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  income: '#22c55e',
  incomeLight: '#dcfce7',
  expense: '#ef4444',
  expenseLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  success: '#22c55e',
  successLight: '#dcfce7',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  goal: '#8b5cf6',
  goalLight: '#ede9fe',
  white: '#ffffff',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  h3: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 14, color: colors.textSecondary },
  small: { fontSize: 12, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
};

export const shadow = {
  card: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
};
