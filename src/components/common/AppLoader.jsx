import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, typography } from '../../lib/theme';

export default function AppLoader() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>💜</Text>
      <Text style={styles.title}>Spendie</Text>
      <Text style={styles.subtitle}>Preparing your budget space...</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logo: { fontSize: 48 },
  title: { ...typography.h1, color: colors.primary },
  subtitle: { ...typography.body, textAlign: 'center' },
  spinner: { marginTop: 16 },
});
