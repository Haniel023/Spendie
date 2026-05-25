/**
 * GlassView — platform-aware frosted glass surface
 *
 * - Web / PWA:  uses CSS `backdropFilter: 'blur(20px)'` via react-native-web
 * - Native iOS/Android: uses expo-blur BlurView
 *
 * Always clips to borderRadius via overflow:'hidden'.
 * Pass tint='light' for light themes, 'dark' for dark themes (amoled, cyberpunk, etc.)
 */

import { Platform, View } from 'react-native';

let BlurView = null;
if (Platform.OS !== 'web') {
  try { BlurView = require('expo-blur').BlurView; } catch {}
}

const GLASS_BG = {
  light: 'rgba(255, 255, 255, 0.72)',
  dark:  'rgba(18, 18, 28, 0.72)',
};
const GLASS_BORDER = {
  light: 'rgba(255, 255, 255, 0.55)',
  dark:  'rgba(255, 255, 255, 0.12)',
};

export default function GlassView({
  style,
  tint = 'light',
  intensity = 80,
  showBorder = false,
  children,
}) {
  const borderStyle = showBorder
    ? { borderWidth: 1, borderColor: GLASS_BORDER[tint] ?? GLASS_BORDER.light }
    : {};

  // ── Web path ──────────────────────────────────────────────────────────────
  if (Platform.OS === 'web' || !BlurView) {
    return (
      <View
        style={[
          { overflow: 'hidden' },
          borderStyle,
          style,
          {
            backdropFilter: `blur(${intensity * 0.25}px)`,
            WebkitBackdropFilter: `blur(${intensity * 0.25}px)`,
            backgroundColor: GLASS_BG[tint] ?? GLASS_BG.light,
          },
        ]}
      >
        {children}
      </View>
    );
  }

  // ── Native path ───────────────────────────────────────────────────────────
  return (
    <BlurView
      tint={tint}
      intensity={intensity}
      style={[{ overflow: 'hidden' }, borderStyle, style]}
    >
      {children}
    </BlurView>
  );
}
