/**
 * Regret Store — AsyncStorage-based transaction rating system
 *
 * Stores per-transaction ratings: 'worth_it' | 'neutral' | 'regret'
 * Enables emotional spending analytics without DB changes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@spendie_regret_ratings_v1';

/**
 * Load all ratings: { [transactionId]: 'worth_it' | 'neutral' | 'regret' }
 */
export async function loadRatings() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save a rating for a single transaction.
 * @param {string} transactionId
 * @param {'worth_it'|'neutral'|'regret'} rating
 */
export async function saveRating(transactionId, rating) {
  try {
    const current = await loadRatings();
    const next = { ...current, [transactionId]: rating };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    console.error('[RegretStore] Save error', e);
    return {};
  }
}

/**
 * Remove a rating (clear it).
 */
export async function clearRating(transactionId) {
  try {
    const current = await loadRatings();
    const { [transactionId]: _, ...rest } = current;
    await AsyncStorage.setItem(KEY, JSON.stringify(rest));
    return rest;
  } catch {
    return {};
  }
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/**
 * Generate regret analytics from ratings + transactions.
 *
 * @param {object} ratings      - { [id]: rating }
 * @param {Array}  transactions - all transactions
 * @returns {object} analytics report
 */
export function analyzeRegrets(ratings, transactions = []) {
  const rated = transactions.filter((t) => ratings[t.id] && t.type === 'expense');

  if (rated.length === 0) {
    return {
      totalRated: 0,
      regretCount: 0,
      worthItCount: 0,
      neutralCount: 0,
      regretRatio: 0,
      topRegretCategory: null,
      topWorthItCategory: null,
      lateNightRegrets: 0,
      insights: [],
    };
  }

  const regrets = rated.filter((t) => ratings[t.id] === 'regret');
  const worthIt = rated.filter((t) => ratings[t.id] === 'worth_it');
  const neutral = rated.filter((t) => ratings[t.id] === 'neutral');

  const regretRatio = (regrets.length / rated.length) * 100;

  // Category breakdown
  const catRegrets = {};
  const catWorthIt = {};
  regrets.forEach((t) => { catRegrets[t.category] = (catRegrets[t.category] || 0) + 1; });
  worthIt.forEach((t) => { catWorthIt[t.category] = (catWorthIt[t.category] || 0) + 1; });

  const topRegretCat = Object.entries(catRegrets).sort((a, b) => b[1] - a[1])[0];
  const topWorthItCat = Object.entries(catWorthIt).sort((a, b) => b[1] - a[1])[0];

  // Late night regrets (after 10PM)
  const lateNightRegrets = regrets.filter((t) => {
    const h = new Date(t.created_at).getHours();
    return h >= 22 || h < 4;
  }).length;

  // Total regret amount
  const regretAmount = regrets.reduce((s, t) => s + Number(t.amount), 0);
  const worthItAmount = worthIt.reduce((s, t) => s + Number(t.amount), 0);

  // Generate insights
  const insights = [];
  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (regretRatio > 50) {
    insights.push({
      icon: '😬',
      text: `${regretRatio.toFixed(0)}% of your rated purchases were regrets. Consider pausing before non-essential buys.`,
    });
  } else if (regretRatio <= 20 && rated.length >= 5) {
    insights.push({
      icon: '🎯',
      text: `Only ${regretRatio.toFixed(0)}% regret rate — you're making intentional purchases! Keep it up.`,
    });
  }

  if (topRegretCat) {
    insights.push({
      icon: '🔍',
      text: `Your most regretted category is ${topRegretCat[0]} (${topRegretCat[1]} purchase${topRegretCat[1] > 1 ? 's' : ''}). Be extra mindful here.`,
    });
  }

  if (lateNightRegrets >= 2) {
    insights.push({
      icon: '🌙',
      text: `${lateNightRegrets} late-night purchases ended in regret. Night-time shopping is a pattern worth breaking.`,
    });
  }

  if (topWorthItCat) {
    insights.push({
      icon: '💚',
      text: `${topWorthItCat[0]} brings you the most satisfaction. More of this, less of the regrets!`,
    });
  }

  if (regretAmount > 0) {
    insights.push({
      icon: '💸',
      text: `Total regret spending this period: ${fmt(regretAmount)}. That's money that didn't serve you well.`,
    });
  }

  return {
    totalRated: rated.length,
    regretCount: regrets.length,
    worthItCount: worthIt.length,
    neutralCount: neutral.length,
    regretRatio,
    topRegretCategory: topRegretCat ? topRegretCat[0] : null,
    topWorthItCategory: topWorthItCat ? topWorthItCat[0] : null,
    lateNightRegrets,
    regretAmount,
    worthItAmount,
    insights: insights.slice(0, 4),
  };
}
