/**
 * Spendie Settings Context
 *
 * Central store for all user preferences that don't live in the DB:
 *   - AI Coach personality
 *   - Focus Mode
 *   - Roast Mode
 *   - Sound effects
 *   - Seasonal auto-theme
 *   - Payday celebration tracking
 *   - Challenges joined
 *   - Regret tracker toggle
 *   - Memory cards toggle
 */

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@spendie_settings_v2';

export const DEFAULT_SETTINGS = {
  // AI Coach
  coachPersonality: 'supportive', // supportive | strict | roast | analyst | anime | minimal

  // Focus / calm mode
  focusMode: false,

  // Sound feedback
  soundEnabled: false,

  // Roast mode (funny spending commentary)
  roastEnabled: false,

  // Seasonal theme auto-switching
  seasonalThemeAuto: true,

  // Payday celebration
  paydayCelebrationEnabled: true,
  paydayCelebratedIds: [], // transaction IDs already celebrated

  // Regret Tracker
  regretTrackerEnabled: true,

  // Community Challenges
  joinedChallenges: [],         // array of challenge IDs
  challengeProgress: {},        // { [id]: { joinedAt: ISO, dismissed: bool } }

  // Memory Cards
  memoryCardsEnabled: true,

  // Annual Wrapped
  annualWrappedEnabled: true,

  // Push Notifications
  dailyReminderEnabled: false,
  weeklyBudgetReminderEnabled: false,
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setSettings((prev) => ({ ...prev, ...parsed }));
          } catch (e) {
            console.error('[Settings] Parse error', e);
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const persist = (next) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(console.error);
  };

  /** Update a single setting key */
  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persist(next);
      return next;
    });
  };

  /** Update multiple settings at once */
  const updateSettings = (updates) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      persist(next);
      return next;
    });
  };

  /** Mark a transaction ID as already celebrated (prevent re-triggering) */
  const markPaydayCelebrated = (transactionId) => {
    setSettings((prev) => {
      const ids = Array.from(new Set([...(prev.paydayCelebratedIds || []), transactionId]));
      const next = { ...prev, paydayCelebratedIds: ids };
      persist(next);
      return next;
    });
  };

  /** Join a community challenge */
  const joinChallenge = (challengeId) => {
    setSettings((prev) => {
      if (prev.joinedChallenges.includes(challengeId)) return prev;
      const next = {
        ...prev,
        joinedChallenges: [...prev.joinedChallenges, challengeId],
        challengeProgress: {
          ...prev.challengeProgress,
          [challengeId]: { joinedAt: new Date().toISOString(), dismissed: false },
        },
      };
      persist(next);
      return next;
    });
  };

  /** Leave a community challenge */
  const leaveChallenge = (challengeId) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        joinedChallenges: prev.joinedChallenges.filter((id) => id !== challengeId),
      };
      persist(next);
      return next;
    });
  };

  const value = useMemo(
    () => ({
      ...settings,
      updateSetting,
      updateSettings,
      markPaydayCelebrated,
      joinChallenge,
      leaveChallenge,
      loaded,
    }),
    [settings, loaded]
  );

  if (!loaded) return null;

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
