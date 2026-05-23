/**
 * Payday Celebration 💸
 *
 * Lightweight confetti animation that fires once when a payday/income
 * transaction is detected. Uses only React Native's built-in Animated API —
 * no external dependencies.
 *
 * Props:
 *   visible    {boolean}  - trigger the animation
 *   amount     {number}   - payday amount to display
 *   onDismiss  {function} - called when animation ends
 */

import { useEffect, useRef, memo } from 'react';
import {
  View, Text, Animated, StyleSheet, Dimensions, TouchableOpacity,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const COIN_EMOJIS = ['💰', '💸', '✨', '🎉', '⭐', '💎', '🪙', '🎊'];
const COIN_COLORS = ['#f59e0b', '#fbbf24', '#22c55e', '#3b82f6', '#a78bfa', '#ec4899', '#f97316', '#14b8a6'];
const PARTICLE_COUNT = 24;

// Pre-compute random configs so they don't re-randomize on each render
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  emoji: COIN_EMOJIS[i % COIN_EMOJIS.length],
  color: COIN_COLORS[i % COIN_COLORS.length],
  x: 40 + Math.random() * (W - 80),
  size: 14 + Math.random() * 18,
  delay: Math.random() * 600,
  duration: 1400 + Math.random() * 800,
  driftX: (Math.random() - 0.5) * 120,
  rotations: Math.random() > 0.5 ? 2 : -2,
}));

// ── Single Particle ────────────────────────────────────────────────────────────

const Particle = memo(({ config, run }) => {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!run) {
      y.setValue(0);
      x.setValue(0);
      opacity.setValue(0);
      rotate.setValue(0);
      scale.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.delay(config.delay),
      Animated.parallel([
        Animated.timing(y, {
          toValue: H * 0.75,
          duration: config.duration,
          useNativeDriver: true,
        }),
        Animated.timing(x, {
          toValue: config.driftX,
          duration: config.duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80 }),
          Animated.timing(scale, { toValue: 0, duration: 400, delay: config.duration - 500, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 500, delay: config.duration - 600, useNativeDriver: true }),
        ]),
        Animated.timing(rotate, {
          toValue: config.rotations,
          duration: config.duration,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [run]);

  const spin = rotate.interpolate({
    inputRange: [-3, 3],
    outputRange: ['-1080deg', '1080deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: -30,
        left: config.x,
        opacity,
        transform: [{ translateY: y }, { translateX: x }, { rotate: spin }, { scale }],
        pointerEvents: 'none',
      }}
    >
      <Text style={{ fontSize: config.size }}>{config.emoji}</Text>
    </Animated.View>
  );
});

// ── Label Banner ───────────────────────────────────────────────────────────────

function PaydayBanner({ visible, amount, onDismiss }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.3);
      opacity.setValue(0);
      translateY.setValue(30);
      return;
    }

    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 60 }),
      ]),
      Animated.delay(2200),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => onDismiss?.());
  }, [visible]);

  const fmt = (n) =>
    `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Animated.View
      style={[
        styles.banner,
        { opacity, transform: [{ scale }, { translateY }] },
      ]}
    >
      <Text style={styles.bannerEmoji}>💸</Text>
      <Text style={styles.bannerTitle}>Payday Unlocked!</Text>
      {amount > 0 && (
        <Text style={styles.bannerAmount}>{fmt(amount)}</Text>
      )}
      <Text style={styles.bannerSub}>Your wallet just got heavier 💪</Text>
      <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.8}>
        <Text style={styles.dismissText}>Awesome!</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PaydayCelebration({ visible, amount = 0, onDismiss }) {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Particles */}
      {PARTICLES.map((p) => (
        <Particle key={p.id} config={p} run={visible} />
      ))}

      {/* Glow overlay */}
      <Animated.View style={styles.glow} />

      {/* Banner */}
      <PaydayBanner visible={visible} amount={amount} onDismiss={onDismiss} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  banner: {
    backgroundColor: '#1e1b4b',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.5)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 24,
    zIndex: 10000,
  },
  bannerEmoji: { fontSize: 56, marginBottom: 8 },
  bannerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  bannerAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4ade80',
    marginBottom: 6,
    textAlign: 'center',
  },
  bannerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  dismissBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 50,
  },
  dismissText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
