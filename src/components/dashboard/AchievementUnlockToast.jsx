import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal } from 'react-native';
import { colors, spacing, radius } from '../../lib/theme';

/**
 * Animated pop-up that appears when a new achievement is unlocked.
 * Auto-dismisses after 3 seconds. Tap anywhere or the button to dismiss early.
 *
 * Props:
 *   achievement  — { id, title, description, emoji } or null
 *   onDismiss    — called when the toast should be hidden
 */
export default function AchievementUnlockToast({ achievement, onDismiss }) {
  const scaleAnim  = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const emojiScale  = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!achievement) return;

    // Reset
    scaleAnim.setValue(0.3);
    opacityAnim.setValue(0);
    emojiScale.setValue(0);
    shimmerAnim.setValue(0);

    // Card entrance — spring bounce
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 55,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    // Emoji pops in slightly after card
    setTimeout(() => {
      Animated.spring(emojiScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 5,
      }).start();
    }, 160);

    // Subtle shimmer loop on background
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    // Auto-dismiss after 3.5 s
    const timer = setTimeout(handleDismiss, 3500);
    return () => clearTimeout(timer);
  }, [achievement]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim,   { toValue: 0.85, duration: 180, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0,    duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  if (!achievement) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleDismiss}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        {/* Tap backdrop to dismiss */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleDismiss} />

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Sparkle decorations */}
          <Text style={[styles.sparkle, styles.sparkleTL]}>✨</Text>
          <Text style={[styles.sparkle, styles.sparkleTR]}>🌟</Text>
          <Text style={[styles.sparkle, styles.sparkleBL]}>⭐</Text>
          <Text style={[styles.sparkle, styles.sparkleBR]}>✨</Text>

          {/* Header label */}
          <View style={styles.labelRow}>
            <View style={styles.unlockLabel}>
              <Text style={styles.unlockLabelText}>🎉  Achievement Unlocked!</Text>
            </View>
          </View>

          {/* Big emoji */}
          <Animated.Text style={[styles.emoji, { transform: [{ scale: emojiScale }] }]}>
            {achievement.emoji}
          </Animated.Text>

          {/* Title */}
          <Text style={styles.title}>{achievement.title}</Text>

          {/* Description */}
          <Text style={styles.desc}>{achievement.description}</Text>

          {/* Dismiss button */}
          <TouchableOpacity style={styles.btn} onPress={handleDismiss} activeOpacity={0.85}>
            <Animated.Text style={[styles.btnText, { opacity: shimmerOpacity }]}>
              Awesome! 🎊
            </Animated.Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    marginHorizontal: spacing.xxl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.warning,
    overflow: 'hidden',
    // Glow shadow
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 18,
    opacity: 0.7,
  },
  sparkleTL: { top: 12, left: 12 },
  sparkleTR: { top: 12, right: 12 },
  sparkleBL: { bottom: 56, left: 16 },
  sparkleBR: { bottom: 56, right: 16 },
  labelRow: {
    marginBottom: spacing.lg,
  },
  unlockLabel: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  unlockLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
  },
  emoji: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: colors.warning,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm + 2,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
