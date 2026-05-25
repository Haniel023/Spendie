import { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet } from 'lucide-react-native';
import { colors, typography } from '../../lib/theme';

export default function AppLoader() {
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse,        { toValue: 1.22, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse,        { toValue: 1,    duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0,    duration: 900, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.6,  duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Pulsing ring */}
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: pulse }], opacity: pulseOpacity },
          ]}
        />

        {/* Gradient icon circle */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Wallet size={28} color="#ffffff" strokeWidth={2} />
        </LinearGradient>
      </View>

      <Text style={styles.title}>Spendie</Text>
      <Text style={styles.subtitle}>Preparing your budget space…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  title:    { ...typography.h1, color: colors.primary, letterSpacing: -0.5 },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
