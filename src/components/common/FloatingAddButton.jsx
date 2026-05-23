import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../../lib/ThemeContext';

export default function FloatingAddButton({ label, onPress }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.btn, {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
      }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Plus size={20} color={colors.white} />
      <Text style={[styles.label, { color: colors.white }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 104,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
    zIndex: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  label: { fontSize: 14, fontWeight: '600' },
});
