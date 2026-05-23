import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@spendie_achievement_timestamps';

/** Load { [achievementId]: ISODateString } from storage */
export async function loadTimestamps() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Merge new IDs into timestamps and persist. Returns updated timestamps. */
export async function recordNewUnlocks(newIds, existing) {
  try {
    const now = new Date().toISOString();
    const updated = { ...existing };
    for (const id of newIds) {
      if (!updated[id]) updated[id] = now;
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return existing;
  }
}

/** Format an ISO date string → "May 23, 2026" */
export function formatUnlockDate(isoString) {
  if (!isoString) return null;
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}
