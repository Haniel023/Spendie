import { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';
import { categoryConfig } from '../lib/categoryConfig';
import { generateSmartAlerts } from '../lib/alertsEngine';
import { processRecurringTransactions } from '../lib/recurringEngine';
import { generateInsights } from '../lib/insightsEngine';
import { useTheme } from '../lib/ThemeContext';
import { useSettings } from '../lib/SettingsContext';
import { computeUnlockedAchievements, ACHIEVEMENTS } from '../lib/achievementsEngine';
import { loadTimestamps, recordNewUnlocks } from '../lib/achievementTimestamps';
import { getPHNow, toPHDate, getPHNowISO } from '../lib/timezone';
import { enqueue, syncQueue, getQueuedCount, isOnline } from '../lib/offlineQueue';

import AppLoader from '../components/common/AppLoader';
import Header from '../components/common/Header';
import BottomNavigation from '../components/common/BottomNavigation';
import PaydayCelebration from '../components/common/PaydayCelebration';

import BalanceCard from '../components/dashboard/BalanceCard';
import RecentActivity from '../components/dashboard/RecentActivity';
// InsightsSection removed — insights are now shown inside CoachSection
// AlertSection removed — alerts now fire as push notifications
// TransactionsSection replaced by CalendarTransactionsSection (unified card)
import CalendarTransactionsSection from '../components/dashboard/CalendarTransactionsSection';
import BudgetSection from '../components/dashboard/BudgetSection';
import GoalsSection from '../components/dashboard/GoalsSection';
// MonthlyTrendChart removed — replaced by AnalyticsSection + CashFlowForecast
import AnalyticsSection from '../components/dashboard/AnalyticsSection';
import SpacesSection from '../components/dashboard/SpacesSection';
import MembersSection from '../components/dashboard/MembersSection';
import QuickInfoSection from '../components/dashboard/QuickInfoSection';
import StreakCard from '../components/dashboard/StreakCard';
import BillsSection from '../components/dashboard/BillsSection';
// CalendarView replaced by CalendarTransactionsSection (unified card)
import CashFlowForecast from '../components/dashboard/CashFlowForecast';
import NetWorthSection from '../components/dashboard/NetWorthSection';
import AchievementsSection from '../components/dashboard/AchievementsSection';
import AchievementUnlockToast from '../components/dashboard/AchievementUnlockToast';
import ExpenseFrequency from '../components/dashboard/ExpenseFrequency';
// SpendingPersonality card removed — shown as modal when hero chip is tapped
import MonthlyReview from '../components/dashboard/MonthlyReview';
import CoachSection from '../components/dashboard/CoachSection';
import MemoryCards from '../components/dashboard/MemoryCards';
import RegretSection from '../components/dashboard/RegretSection';
import AnnualWrapped from '../components/dashboard/AnnualWrapped';
import SettingsModal from '../components/dashboard/SettingsModal';

import { generateTransactionComment, generatePlanInsight, generatePlanItemComment, generateCoachComment, generateInactivityMessage } from '../lib/coachEngine';
import { computeSpendingPersonality } from '../lib/spendingPersonality';
import {
  notifyBudgetExceeded,
  notifyLowBalance,
  notifyPayday,
  scheduleBillReminder,
  cancelNotification,
  sendImmediateNotification,
} from '../lib/pushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ConfirmModal from '../components/common/ConfirmModal';
import CardModal from '../components/modals/CardModal';
import CardPickerModal from '../components/modals/CardPickerModal';
import CardBreakdownSection from '../components/dashboard/CardBreakdownSection';
import TransactionModal from '../components/modals/TransactionModal';
import BudgetModal from '../components/modals/BudgetModal';
import GoalModal from '../components/modals/GoalModal';
import SpaceModal from '../components/modals/SpaceModal';
import InviteModal from '../components/modals/InviteModal';
import BillsModal from '../components/modals/BillsModal';
import SubscriptionModal from '../components/modals/SubscriptionModal';

// ── Auto-detect: find an unpaid bill that matches a new expense ───────────────
function findMatchingBill(transaction, bills) {
  if (transaction.type !== 'expense') return null;

  const now      = new Date();
  const nowMonth = now.getMonth();
  const nowYear  = now.getFullYear();

  const txCat  = (transaction.category    || '').toLowerCase().trim();
  const txDesc = (transaction.description || '').toLowerCase().trim();

  let best = null;
  let bestScore = 0;

  bills.forEach((bill) => {
    if (bill.is_paid) return;

    // Only bills due this month or already overdue — skip future months
    const due = new Date(bill.due_date);
    const isCurrent =
      due.getFullYear() < nowYear ||
      (due.getFullYear() === nowYear && due.getMonth() <= nowMonth);
    if (!isCurrent) return;

    const billName = (bill.name     || '').toLowerCase().trim();
    const billCat  = (bill.category || '').toLowerCase().trim();

    let score = 0;

    // Category match
    if (billCat && billCat === txCat)                               score += 3;
    // Bill name found inside transaction description
    if (billName.length >= 3 && txDesc.includes(billName))         score += 5;
    // Transaction description found inside bill name
    if (txDesc.length >= 3 && billName.includes(txDesc))           score += 4;

    // Amount closeness
    const billAmt = Number(bill.amount);
    const txAmt   = Number(transaction.amount);
    if (billAmt > 0 && txAmt > 0) {
      const diff = Math.abs(billAmt - txAmt) / billAmt;
      if (diff < 0.05)       score += 3;
      else if (diff < 0.20)  score += 1;
    }

    if (score >= 3 && score > bestScore) { best = bill; bestScore = score; }
  });

  return best;
}

// ── Auto-detect: find a matching subscription (recurring) for a new expense ───
function findMatchingSubscription(transaction, recurringTransactions) {
  if (transaction.type !== 'expense') return null;

  const txCat  = (transaction.category    || '').toLowerCase().trim();
  const txDesc = (transaction.description || '').toLowerCase().trim();

  let best = null;
  let bestScore = 0;

  recurringTransactions.forEach((sub) => {
    if (sub.type !== 'expense') return;
    if (!sub.is_subscription && sub.category !== 'Subscriptions') return;

    const subName = (
      sub.description || sub.subscription_service || sub.category || ''
    ).toLowerCase().trim();
    const subCat = (sub.category || '').toLowerCase().trim();

    let score = 0;
    if (subCat && subCat === txCat)                              score += 2;
    if (subName.length >= 3 && txDesc.includes(subName))        score += 6;
    if (txDesc.length >= 3 && subName.includes(txDesc))         score += 5;

    const subAmt = Number(sub.amount);
    const txAmt  = Number(transaction.amount);
    if (subAmt > 0 && txAmt > 0) {
      const diff = Math.abs(subAmt - txAmt) / subAmt;
      if (diff < 0.05)       score += 3;
      else if (diff < 0.20)  score += 1;
    }

    if (score >= 4 && score > bestScore) { best = sub; bestScore = score; }
  });

  return best;
}

export default function DashboardScreen() {
  const { colors, spacing, radius } = useTheme();
  const {
    paydayCelebrationEnabled,
    paydayCelebratedIds,
    markPaydayCelebrated,
    coachPersonality,
  } = useSettings();

  // ── Payday celebration state ───────────────────────────────────────────────
  const [paydayVisible, setPaydayVisible] = useState(false);
  const [paydayAmount, setPaydayAmount] = useState(0);

  // ── Auth & spaces ──────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [activeSpace, setActiveSpace] = useState(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState([]);   // ALL transactions (never filtered)
  const [members, setMembers] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [cards, setCards] = useState([]);
  const [netWorthEntries, setNetWorthEntries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0 });

  // ── Month Filter (Philippine Timezone) ────────────────────────────────────
  const phNow = getPHNow();
  const [selectedMonth, setSelectedMonth] = useState(phNow.getMonth());
  const [selectedYear, setSelectedYear] = useState(phNow.getFullYear());

  // Transactions for the selected month only (bucketed by PH local time)
  const monthTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const d = toPHDate(t.created_at);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }),
    [transactions, selectedMonth, selectedYear]
  );

  // Active card — drives transaction filtering throughout the app.
  // When a card is selected, only its transactions are shown in feeds/timelines.
  const [selectedCardId, setSelectedCardId] = useState(null);

  // The selected card object (null = no card / show all)
  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId]
  );

  // Live balance for the selected card (opening balance ± all linked transactions)
  const selectedCardBalance = useMemo(() => {
    if (!selectedCard) return null;
    const net = transactions
      .filter((t) => t.card_id === selectedCard.id)
      .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    return Number(selectedCard.current_balance ?? 0) + net;
  }, [selectedCard, transactions]);

  // Total live balance across ALL cards (used when no specific card is selected)
  const totalCardsBalance = useMemo(() => {
    if (cards.length === 0) return null;
    return cards.reduce((sum, card) => {
      const net = transactions
        .filter((t) => t.card_id === card.id)
        .reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
      return sum + Number(card.current_balance ?? 0) + net;
    }, 0);
  }, [cards, transactions]);

  // Card-filtered transactions: when a card is active, only show its transactions.
  // Keep raw `transactions` for analytics, achievements, budget tracking, etc.
  const filteredTransactions = useMemo(() => {
    if (!selectedCardId) return transactions;
    return transactions.filter((t) => t.card_id === selectedCardId);
  }, [transactions, selectedCardId]);

  // Month-filtered view of the card-filtered set (used in transaction feeds)
  const filteredMonthTransactions = useMemo(
    () =>
      filteredTransactions.filter((t) => {
        const d = toPHDate(t.created_at);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }),
    [filteredTransactions, selectedMonth, selectedYear]
  );

  // Monthly income / expenses / saved
  const monthSummary = useMemo(() => {
    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const expenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    return { income, expenses, balance: income - expenses };
  }, [monthTransactions]);

  // AI Coach insight for Trends tab — card-aware, same logic as home tab CoachSection
  const trendsCoachInsight = useMemo(() => {
    // Card selected but no transactions on it this month → show card-specific no-activity hint
    if (selectedCard && filteredMonthTransactions.length === 0) {
      const name = selectedCard.bank_name || selectedCard.card_name;
      return {
        icon: '💳',
        title: `${name} has no activity this month`,
        text: `No transactions are linked to this card yet in this period. Switch cards or log a transaction to this card to see analytics here.`,
      };
    }
    // Build card-filtered summary when a card is selected
    const effectiveTx = selectedCard ? filteredMonthTransactions : monthTransactions;
    const effectiveSummary = selectedCard
      ? (() => {
          const inc = filteredMonthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
          const exp = filteredMonthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
          return { income: inc, expenses: exp, balance: inc - exp };
        })()
      : monthSummary;
    return generateCoachComment({
      personality:       coachPersonality,
      monthSummary:      effectiveSummary,
      budgets,
      transactions,
      monthTransactions: effectiveTx,
      cardBalance:       selectedCardBalance ?? null,
    });
  }, [coachPersonality, monthSummary, budgets, transactions, monthTransactions, filteredMonthTransactions, selectedCard, selectedCardBalance]);

  // ── Streaks (for achievements — all using Philippine timezone) ────────────
  const loggingStreak = useMemo(() => {
    if (!transactions.length) return 0;
    const today = getPHNow(); today.setHours(0, 0, 0, 0);
    const daySet = new Set(transactions.map((t) => { const d = toPHDate(t.created_at); d.setHours(0, 0, 0, 0); return d.getTime(); }));
    let streak = 0; const cursor = new Date(today);
    if (!daySet.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
    while (daySet.has(cursor.getTime())) { streak++; cursor.setDate(cursor.getDate() - 1); }
    return streak;
  }, [transactions]);

  const noSpendStreak = useMemo(() => {
    const today = getPHNow(); today.setHours(0, 0, 0, 0);
    const spendDays = new Set(transactions.filter((t) => t.type === 'expense').map((t) => { const d = toPHDate(t.created_at); d.setHours(0, 0, 0, 0); return d.getTime(); }));
    let streak = 0; const cursor = new Date(today);
    while (!spendDays.has(cursor.getTime())) { streak++; cursor.setDate(cursor.getDate() - 1); if (streak > 365) break; }
    return streak;
  }, [transactions]);

  const budgetStreak = useMemo(() => {
    if (!budgets.length) return 0;
    const today = getPHNow(); today.setHours(0, 0, 0, 0);
    let streak = 0; const cursor = new Date(today);
    for (let i = 0; i < 30; i++) {
      const dayEnd = new Date(cursor); dayEnd.setHours(23, 59, 59, 999);
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const exceeded = budgets.some((budget) => {
        const spent = transactions.filter((t) => t.type === 'expense' && t.category === budget.category && toPHDate(t.created_at) >= monthStart && toPHDate(t.created_at) <= dayEnd).reduce((s, t) => s + Number(t.amount), 0);
        return spent > Number(budget.monthly_limit);
      });
      if (exceeded) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [transactions, budgets]);

  // ── Achievements ───────────────────────────────────────────────────────────
  const unlockedAchievementIds = useMemo(
    () => computeUnlockedAchievements({ transactions, budgets, goals, bills, recurringTransactions, loggingStreak, noSpendStreak, budgetStreak, monthSummary }),
    [transactions, budgets, goals, bills, recurringTransactions, loggingStreak, noSpendStreak, budgetStreak, monthSummary]
  );

  // Declared early so the achievement detection effect below can read it
  const [pageLoading, setPageLoading] = useState(true);
  // True once the first loadTransactions() call has resolved (real data in state)
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);

  // Timestamps: { [achievementId]: ISODateString }
  const [achievementTimestamps, setAchievementTimestamps] = useState({});
  // True once AsyncStorage has returned (even if empty)
  const [timestampsLoaded, setTimestampsLoaded] = useState(false);
  // Toast queue: array of achievement objects to show one at a time
  const [toastQueue, setToastQueue] = useState([]);
  // The achievement currently shown in the toast
  const toastAchievement = toastQueue[0] ?? null;

  // ── Offline queue ──────────────────────────────────────────────────────────
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // null = not seeded yet; Set = the last known unlocked set
  const prevUnlockedRef = useRef(null);

  // Load persisted timestamps once on mount
  useEffect(() => {
    loadTimestamps().then((ts) => {
      setAchievementTimestamps(ts);
      setTimestampsLoaded(true);
    });
  }, []);

  // Detect newly unlocked achievements and trigger toasts.
  //
  // We wait for THREE conditions before allowing ANY toast:
  //   1. pageLoading=false  (initial Supabase dashboard bootstrap is done)
  //   2. timestampsLoaded   (AsyncStorage has been read — we know prior unlocks)
  //   3. transactionsLoaded (first loadTransactions() resolved — real data is present)
  //
  // This prevents the race where setPageLoading(false) fires before loadTransactions
  // resolves, causing an empty baseline → everything looks "new" when data arrives.
  //
  // Double safety: we also cross-check against achievementTimestamps so that even
  // if AsyncStorage was wiped, achievements already recorded don't toast again.
  useEffect(() => {
    if (pageLoading)          return; // bootstrap not finished
    if (!timestampsLoaded)    return; // AsyncStorage not read yet
    if (!transactionsLoaded)  return; // real data not in state yet

    const currentSet = new Set(unlockedAchievementIds);

    if (prevUnlockedRef.current === null) {
      // First run after a full load — seed baseline silently, no toasts.
      // Record any that aren't yet in timestamps (e.g. AsyncStorage was cleared).
      prevUnlockedRef.current = currentSet;
      const toRecord = unlockedAchievementIds.filter((id) => !achievementTimestamps[id]);
      if (toRecord.length > 0) {
        recordNewUnlocks(toRecord, achievementTimestamps).then(setAchievementTimestamps);
      }
      return;
    }

    // Subsequent runs — diff against the seeded baseline AND timestamps.
    // An achievement is genuinely new only if BOTH:
    //   • it wasn't in prevUnlockedRef (not present at baseline)
    //   • it isn't in achievementTimestamps (not earned in a prior session)
    const newIds = unlockedAchievementIds.filter(
      (id) => !prevUnlockedRef.current.has(id) && !achievementTimestamps[id]
    );
    prevUnlockedRef.current = currentSet;

    if (newIds.length === 0) return;

    recordNewUnlocks(newIds, achievementTimestamps).then(setAchievementTimestamps);

    const newBadges = newIds
      .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
      .filter(Boolean);
    setToastQueue((q) => [...q, ...newBadges]);
  }, [unlockedAchievementIds, pageLoading, timestampsLoaded, transactionsLoaded]);

  // ── UI State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Coach comment shown after logging a transaction / plan item
  const [coachComment, setCoachComment] = useState(null); // { icon, title, text } | null
  // Spending personality detail modal (tapping hero chip)
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [showSubModal,   setShowSubModal]   = useState(false);
  const [editingSub,     setEditingSub]     = useState(null);
  const [showCardModal,  setShowCardModal]  = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [cardForm, setCardForm] = useState({
    card_name: '', card_holder_name: '', last_four: '',
    card_type: 'visa', bank_name: '',
    card_color_from: '#1a1a2e', card_color_to: '#16213e',
    credit_limit: '', current_balance: '0',
    expiry_month: '', expiry_year: '', notes: '',
  });

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingBill, setEditingBill] = useState(null);

  // ── Forms ──────────────────────────────────────────────────────────────────

  const [transactionForm, setTransactionForm] = useState({
    type: 'expense', amount: '', category: '', description: '', card_id: null,
  });
  const [budgetForm, setBudgetForm] = useState({ title: '', category: '', monthly_limit: '' });
  const [goalForm, setGoalForm] = useState({ title: '', target_amount: '', current_amount: '', deadline: '', emoji: '' });
  const [billForm, setBillForm] = useState({
    name: '', amount: '', category: 'Bills', due_date: '', is_recurring: false,
    frequency: 'monthly', emoji: '', notes: '',
  });
  const todayStr = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; };
  const BLANK_SUB_FORM = { description: '', amount: '', category: 'Subscriptions', frequency: 'monthly', next_run: todayStr() };
  const [subForm, setSubForm] = useState(BLANK_SUB_FORM);
  const [spaceName, setSpaceName] = useState('');
  const [spaceEmoji, setSpaceEmoji] = useState('💰');
  const [inviteEmail, setInviteEmail] = useState('');

  // ── Persist selected card across sessions ─────────────────────────────────
  const SELECTED_CARD_KEY = '@spendie_selected_card_id';
  useEffect(() => {
    if (selectedCardId) {
      AsyncStorage.setItem(SELECTED_CARD_KEY, selectedCardId).catch(() => {});
    } else {
      AsyncStorage.removeItem(SELECTED_CARD_KEY).catch(() => {});
    }
  }, [selectedCardId]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { loadDashboard(); }, []);

  // Check pending queue count on mount and sync when online
  useEffect(() => {
    getQueuedCount().then(setPendingSync);
    handleSyncOfflineQueue();
  }, []);

  const handleSyncOfflineQueue = async () => {
    if (isSyncing) return;
    const online = await isOnline();
    if (!online) return;
    const count = await getQueuedCount();
    if (count === 0) return;
    setIsSyncing(true);
    const { synced } = await syncQueue(supabase);
    setIsSyncing(false);
    if (synced > 0 && activeSpace) {
      loadTransactions(activeSpace.id);
      getQueuedCount().then(setPendingSync);
    }
  };

  // Alerts — fire as push notifications; don't repeat the same message in one session
  const sentAlertKeys = useRef(new Set());
  useEffect(() => {
    const currentAlerts = generateSmartAlerts({ summary: monthSummary, budgets, transactions: monthTransactions });
    currentAlerts.forEach((alert) => {
      if (sentAlertKeys.current.has(alert.message)) return;
      sentAlertKeys.current.add(alert.message);
      sendImmediateNotification({
        title: alert.type === 'danger' ? '🛑 Budget Alert' : '⚠️ Spending Warning',
        body: alert.message,
        channel: 'alerts',
      }).catch(() => {});
    });
  }, [monthTransactions, budgets, monthSummary]);

  useEffect(() => {
    // When a card is selected, generate insights from that card's monthly transactions only.
    // This keeps insights card-aware — the same pattern used by CoachSection and trendsCoachInsight.
    const effectiveSummary = selectedCard
      ? (() => {
          const income   = filteredMonthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
          const expenses = filteredMonthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
          return { income, expenses, balance: income - expenses };
        })()
      : monthSummary;
    setInsights(generateInsights({ transactions: filteredMonthTransactions, budgets, goals, summary: effectiveSummary, personality: coachPersonality }));
  }, [filteredMonthTransactions, budgets, goals, monthSummary, coachPersonality, selectedCard]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-user-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        loadNotifications(user.id);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  useEffect(() => {
    if (!activeSpace) return;
    const channel = supabase
      .channel(`transactions-space-${activeSpace.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `space_id=eq.${activeSpace.id}` }, () => {
        loadTransactions(activeSpace.id);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeSpace]);

  useEffect(() => {
    if (!user || budgets.length === 0 || monthTransactions.length === 0) return;
    budgets.forEach(async (budget) => {
      const spent = monthTransactions
        .filter((t) => t.type === 'expense' && t.category === budget.category)
        .reduce((total, t) => total + Number(t.amount), 0);
      const limit = Number(budget.monthly_limit);
      if (spent > limit) {
        await notifyUser({
          title: 'Budget Exceeded',
          message: `${budget.category} exceeded budget by ₱${(spent - limit).toFixed(2)}`,
          type: 'danger',
          dedupeKey: `budget-exceeded-${activeSpace?.id}-${budget.category}-${selectedMonth}-${selectedYear}`,
        });
      }
    });
  }, [budgets, monthTransactions, user, activeSpace]);

  useEffect(() => {
    if (!user) return;
    if (summary.balance > 0 && summary.balance < 1000) {
      notifyUser({
        title: 'Low Balance',
        message: `Your running balance is now ₱${summary.balance.toFixed(2)}.`,
        type: 'warning',
        dedupeKey: `low-balance-${activeSpace?.id}`,
      });
    }
  }, [summary.balance, user, activeSpace]);

  useEffect(() => {
    if (!user || goals.length === 0) return;
    goals.forEach(async (goal) => {
      const percentage = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
      for (const milestone of [25, 50, 75, 100]) {
        if (percentage >= milestone) {
          const message = `${goal.title} reached ${milestone}% completion.`;
          const { data: existing } = await supabase
            .from('notifications').select('*')
            .eq('user_id', user.id).eq('message', message).maybeSingle();
          if (!existing) {
            await notifyUser({ title: 'Goal Milestone', message, type: 'goal' });
          }
        }
      }
      if (percentage >= 100) {
        const completeMessage = `${goal.title} goal completed!`;
        const { data: completedExisting } = await supabase
          .from('notifications').select('*')
          .eq('user_id', user.id).eq('message', completeMessage).maybeSingle();
        if (!completedExisting) {
          await notifyUser({ title: 'Goal Completed 🎉', message: completeMessage, type: 'success' });
        }
      }
    });
  }, [goals, user]);

  // ── Data Loaders ───────────────────────────────────────────────────────────
  const loadDashboard = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setPageLoading(false); return; }
    setUser(authData.user);

    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', authData.user.id).maybeSingle();
    if (!existingProfile) {
      const fullName = authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User';
      await supabase.from('profiles').insert([{ id: authData.user.id, full_name: fullName, email: authData.user.email }]);
    }

    await cleanupOldNotifications(authData.user.id);
    loadNotifications(authData.user.id);

    const { data, error } = await supabase
      .from('space_members')
      .select('space_id, spaces (id, name, type, emoji)')
      .eq('user_id', authData.user.id);

    if (error) { console.error(error); setPageLoading(false); return; }

    let formattedSpaces = data.map((item) => item.spaces);
    let personalSpace = formattedSpaces.find((s) => s.type === 'personal');
    if (!personalSpace) {
      const { data: newPersonal, error: personalError } = await supabase
        .from('spaces')
        .insert([{ name: 'Personal', type: 'personal', owner_id: authData.user.id, emoji: '💰' }])
        .select().single();
      if (!personalError && newPersonal) {
        await supabase.from('space_members').insert([{ space_id: newPersonal.id, user_id: authData.user.id }]);
        personalSpace = newPersonal;
        formattedSpaces = [newPersonal, ...formattedSpaces];
      }
    } else {
      formattedSpaces = [personalSpace, ...formattedSpaces.filter((s) => s.type !== 'personal')];
    }

    setSpaces(formattedSpaces);

    if (formattedSpaces.length > 0) {
      const defaultSpace = personalSpace || formattedSpaces[0];
      setActiveSpace(defaultSpace);
      await processRecurringTransactions({ supabase, spaceId: defaultSpace.id });
      loadTransactions(defaultSpace.id);
      loadMembers(defaultSpace.id);
      loadBudgets(defaultSpace.id);
      loadGoals(defaultSpace.id);
      loadRecurringTransactions(defaultSpace.id);
      loadBills(defaultSpace.id);
      loadNetWorthEntries(authData.user.id);
      loadCards(authData.user.id);
    }
    setPageLoading(false);
  };

  const loadTransactions = async (spaceId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, profiles (full_name, email)')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setTransactions(data);
    // summary = ALL-TIME running balance
    const income = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    setSummary({ income, expenses, balance: income - expenses });
    // Signal that real transaction data is now in state (unlocks achievement detection)
    setTransactionsLoaded(true);

    // ── Payday celebration detection ────────────────────────────────────────
    // Trigger when a recent income transaction hasn't been celebrated yet
    if (paydayCelebrationEnabled && data.length > 0) {
      const phNow = getPHNow();
      const todayStr = `${phNow.getFullYear()}-${phNow.getMonth()}-${phNow.getDate()}`;
      const recentIncome = data.find((t) => {
        if (t.type !== 'income') return false;
        const d = toPHDate(t.created_at);
        const txStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        return txStr === todayStr && !(paydayCelebratedIds || []).includes(t.id);
      });
      if (recentIncome) {
        markPaydayCelebrated(recentIncome.id);
        setTimeout(() => {
          setPaydayAmount(Number(recentIncome.amount));
          setPaydayVisible(true);
        }, 800); // slight delay so UI settles first
      }
    }

    // ── Inactivity nudge ──────────────────────────────────────────────────────
    // Fire a personality-based notification if no transaction logged in 2+ days.
    // Throttled to once per calendar day so it doesn't repeat on every app open.
    if (data.length > 0) {
      const lastTx = data[0]; // already sorted desc
      const lastDate = toPHDate(lastTx.created_at);
      const now = getPHNow();
      const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

      if (diffDays >= 2) {
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const INACTIVITY_KEY = '@spendie_inactivity_notif_date';
        try {
          const lastSent = await AsyncStorage.getItem(INACTIVITY_KEY);
          if (lastSent !== todayKey) {
            const msg = generateInactivityMessage(coachPersonality);
            sendImmediateNotification({
              title: msg.title,
              body: msg.body,
              channel: 'insights',
              data: { type: 'inactivity' },
            }).catch(() => {});
            await AsyncStorage.setItem(INACTIVITY_KEY, todayKey);
          }
        } catch {}
      }
    }
  };

  const loadMembers = async (spaceId) => {
    const { data, error } = await supabase.from('space_members').select('id, profiles (id, full_name, email)').eq('space_id', spaceId);
    if (error) { console.error(error); return; }
    setMembers(data);
  };

  const loadBudgets = async (spaceId) => {
    const { data, error } = await supabase.from('budgets').select('*').eq('space_id', spaceId);
    if (error) { console.error(error); return; }
    setBudgets(data);
  };

  const loadGoals = async (spaceId) => {
    const { data, error } = await supabase.from('goals').select('*').eq('space_id', spaceId).order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setGoals(data);
  };

  const loadRecurringTransactions = async (spaceId) => {
    const { data, error } = await supabase
      .from('recurring_transactions').select('*').eq('space_id', spaceId);
    if (error) { console.error(error); return; }
    setRecurringTransactions(data || []);
  };

  const loadBills = async (spaceId) => {
    const { data, error } = await supabase
      .from('bills').select('*').eq('space_id', spaceId)
      .order('due_date', { ascending: true });
    if (error) {
      if (error.code !== '42P01') console.error(error);
      return;
    }
    setBills(data || []);
  };

  const loadNetWorthEntries = async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('net_worth_entries').select('*').eq('user_id', userId)
      .order('snapshot_date', { ascending: true });
    if (error) {
      if (error.code !== '42P01') console.error(error);
      return;
    }
    setNetWorthEntries(data || []);
  };

  const loadCards = async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('cards').select('*').eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) {
      if (error.code !== '42P01') console.error(error);
      return;
    }
    const cardList = data || [];
    setCards(cardList);
    // Restore the last selected card from the previous session
    try {
      const savedId = await AsyncStorage.getItem('@spendie_selected_card_id');
      if (savedId && cardList.some((c) => c.id === savedId)) {
        setSelectedCardId(savedId);
      }
    } catch {}
  };

  const handleSaveNetWorth = async (entry) => {
    if (!user) return;
    const { error } = await supabase.from('net_worth_entries').upsert(
      [{ ...entry, user_id: user.id }],
      { onConflict: 'user_id,snapshot_date' }
    );
    if (error) { console.error(error); return; }
    loadNetWorthEntries(user.id);
  };

  const loadNotifications = async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setNotifications(data);
  };

  const notifyUser = async ({ title, message, type = 'info', dedupeKey = null }) => {
    if (!user) return;
    const { error } = await supabase.from('notifications').insert([{
      user_id: user.id, title, message, type, dedupe_key: dedupeKey,
    }]);
    if (error) {
      if (error.code !== '23505') console.error(error);
      return;
    }
    loadNotifications(user.id);
  };

  const markNotificationsAsRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    loadNotifications(user.id);
  };

  const cleanupOldNotifications = async (userId) => {
    if (!userId) return;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    await supabase.from('notifications').delete().eq('user_id', userId).lt('created_at', cutoffDate.toISOString());
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLogout = async () => { await supabase.auth.signOut(); };


  const handleAddTransaction = async () => {
    if (!activeSpace || !user) return;
    const newAmount = parseFloat(String(transactionForm.amount).replace(/,/g, '')) || 0;
    if (editingTransaction) {
      // Editing always requires online (we have an ID)
      const { error } = await supabase.from('transactions').update({
        type: transactionForm.type, amount: newAmount,
        category: transactionForm.category, description: transactionForm.description,
        card_id: transactionForm.card_id || null,
      }).eq('id', editingTransaction.id);
      if (error) { console.error(error); return; }
    } else {
      const payload = {
        space_id: activeSpace.id, created_by: user.id,
        type: transactionForm.type, amount: newAmount,
        category: transactionForm.category, description: transactionForm.description,
        card_id: transactionForm.card_id || null,
        created_at: getPHNowISO(), // explicit PH-time ISO timestamp
      };
      const online = await isOnline();
      if (online) {
        const { error } = await supabase.from('transactions').insert([payload]);
        if (error) { console.error(error); return; }
      } else {
        // Queue for later sync
        await enqueue(payload);
        const count = await getQueuedCount();
        setPendingSync(count);
        Alert.alert(
          'Saved Offline',
          'No internet connection. Your transaction has been saved and will sync automatically when you\'re back online.',
          [{ text: 'OK' }]
        );
      }
    }
    // Generate AI coach comment for new transactions (not edits)
    const isNewTransaction = !editingTransaction;
    const savedForm = { ...transactionForm };

    setTransactionForm({ type: 'expense', amount: '', category: '', description: '', card_id: selectedCardId ?? null });
    setEditingTransaction(null);
    setShowModal(false);
    if (await isOnline()) loadTransactions(activeSpace.id);

    if (isNewTransaction) {
      const comment = generateTransactionComment({
        personality: coachPersonality,
        transaction: savedForm,
        monthSummary,
        budgets,
      });
      if (comment) setTimeout(() => setCoachComment(comment), 400);

      // ── Push notification triggers ──────────────────────────────────────
      const txAmount = parseFloat(String(savedForm.amount).replace(/,/g, '')) || 0;
      const isExpense = savedForm.type === 'expense';
      const isIncome  = savedForm.type === 'income';

      // ── Auto-detect matching bill or subscription ───────────────────────
      if (isExpense) {
        const matchedBill = findMatchingBill(savedForm, bills);
        const matchedSub  = !matchedBill ? findMatchingSubscription(savedForm, recurringTransactions) : null;

        if (matchedBill) {
          setTimeout(() => {
            Alert.alert(
              'Bill Detected',
              `This looks like your "${matchedBill.name}" bill (₱${Number(matchedBill.amount).toFixed(2)}). Mark it as paid?`,
              [
                { text: 'Mark Paid', onPress: () => handleMarkBillPaid(matchedBill.id) },
                { text: 'Not Now', style: 'cancel' },
              ]
            );
          }, 500);
        } else if (matchedSub) {
          const subLabel = matchedSub.description || matchedSub.subscription_service || matchedSub.category;
          setTimeout(() => {
            Alert.alert(
              'Subscription Detected',
              `This looks like your "${subLabel}" subscription (₱${Number(matchedSub.amount).toFixed(2)}/mo). Advance the next renewal date so it won't auto-charge again?`,
              [
                { text: 'Yes, advance', onPress: () => advanceSubscriptionNextRun(matchedSub) },
                { text: 'No', style: 'cancel' },
              ]
            );
          }, 500);
        }
      }

      // Notify on payday (income >= ₱5000)
      if (isIncome && txAmount >= 5000) {
        notifyPayday(txAmount).catch(() => {});
      }

      // Check if any budget is now exceeded after this expense
      if (isExpense) {
        const budget = budgets.find((b) => b.category === savedForm.category);
        if (budget) {
          const monthSpend = monthTransactions
            .filter((t) => t.type === 'expense' && t.category === savedForm.category)
            .reduce((s, t) => s + Number(t.amount), 0) + txAmount;
          const limit = Number(budget.monthly_limit);
          if (monthSpend > limit && monthSpend - txAmount <= limit) {
            // Just crossed the limit with this transaction
            notifyBudgetExceeded(savedForm.category, monthSpend, limit).catch(() => {});
          }
        }

        // Warn if balance would drop below ₱1000 after this transaction
        const newBalance = (monthSummary?.balance ?? 0) - txAmount;
        if (newBalance < 1000 && (monthSummary?.balance ?? 0) >= 1000) {
          notifyLowBalance(newBalance).catch(() => {});
        }
      }
    }
  };

  const handleCreateSpace = async () => {
    if (!spaceName.trim() || !user) return;
    const { data: newSpace, error: spaceError } = await supabase
      .from('spaces').insert([{ name: spaceName, type: 'shared', owner_id: user.id, emoji: spaceEmoji }]).select().single();
    if (spaceError) { console.error(spaceError); return; }
    await supabase.from('space_members').insert([{ space_id: newSpace.id, user_id: user.id }]);
    setSpaces([...spaces, newSpace]);
    setActiveSpace(newSpace);
    setTransactions([]);
    setBudgets([]);
    setMembers([]);
    setBills([]);
    setRecurringTransactions([]);
    setSummary({ income: 0, expenses: 0, balance: 0 });
    setSpaceName('');
    setSpaceEmoji('💰');
    setShowSpaceModal(false);
    loadMembers(newSpace.id);
    loadBudgets(newSpace.id);
  };

  const handleInviteMember = async () => {
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('email', inviteEmail).single();
    if (profileError || !profile) { Alert.alert('Error', 'User not found.'); return; }
    const { error } = await supabase.from('space_members').insert([{ space_id: activeSpace.id, user_id: profile.id }]);
    if (error) { Alert.alert('Error', 'Failed to invite member.'); return; }
    setInviteEmail('');
    setShowInviteModal(false);
    loadMembers(activeSpace.id);
  };

  const confirmDelete = (title, message, onConfirm) => {
    setConfirmModal({ visible: true, title, message, onConfirm });
  };

  const handleDeleteTransaction = (transactionId) => {
    confirmDelete('Delete Transaction', 'Are you sure?', async () => {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
      if (error) { Alert.alert('Error', 'Failed to delete transaction.'); return; }
      loadTransactions(activeSpace.id);
    });
  };

  const handleCreateBudget = async () => {
    const payload = { space_id: activeSpace.id, title: budgetForm.title, category: budgetForm.category, monthly_limit: parseFloat(String(budgetForm.monthly_limit).replace(/,/g, '')) || 0 };
    if (editingBudget) {
      const { error } = await supabase.from('budgets').update(payload).eq('id', editingBudget.id);
      if (error) { console.error(error); return; }
    } else {
      const { error } = await supabase.from('budgets').insert([payload]);
      if (error) { console.error(error); return; }
    }
    const savedBudget = { ...budgetForm };
    setBudgetForm({ title: '', category: '', monthly_limit: '' });
    setEditingBudget(null);
    setShowBudgetModal(false);
    loadBudgets(activeSpace.id);
    if (!editingBudget) {
      const comment = generatePlanItemComment({ personality: coachPersonality, type: 'budget', item: savedBudget });
      setTimeout(() => setCoachComment(comment), 400);
    }
  };

  const handleDeleteBudget = (budgetId) => {
    confirmDelete('Delete Budget', 'Are you sure?', async () => {
      const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
      if (error) { Alert.alert('Error', 'Failed to delete budget.'); return; }
      loadBudgets(activeSpace.id);
    });
  };

  const handleCreateGoal = async () => {
    const payload = {
      space_id: activeSpace.id, title: goalForm.title,
      target_amount: parseFloat(String(goalForm.target_amount).replace(/,/g, '')) || 0,
      current_amount: parseFloat(String(goalForm.current_amount || '0').replace(/,/g, '')) || 0,
      deadline: goalForm.deadline || null,
      emoji: goalForm.emoji || null,
    };
    if (editingGoal) {
      const { error } = await supabase.from('goals').update(payload).eq('id', editingGoal.id);
      if (error) { console.error(error); return; }
    } else {
      const { error } = await supabase.from('goals').insert([payload]);
      if (error) { console.error(error); return; }
    }
    const savedGoal = { ...goalForm };
    setGoalForm({ title: '', target_amount: '', current_amount: '', deadline: '', emoji: '' });
    setEditingGoal(null);
    setShowGoalModal(false);
    loadGoals(activeSpace.id);
    if (!editingGoal) {
      const comment = generatePlanItemComment({ personality: coachPersonality, type: 'goal', item: savedGoal });
      setTimeout(() => setCoachComment(comment), 400);
    }
  };

  const handleDeleteGoal = (goalId) => {
    confirmDelete('Delete Goal', 'Are you sure?', async () => {
      const { error } = await supabase.from('goals').delete().eq('id', goalId);
      if (error) { Alert.alert('Error', 'Failed to delete goal.'); return; }
      loadGoals(activeSpace.id);
    });
  };

  const handleCreateBill = async () => {
    if (!billForm.name || !billForm.due_date || !activeSpace || !user) return;
    const payload = {
      space_id: activeSpace.id,
      created_by: user.id,
      name: billForm.name,
      amount: parseFloat(String(billForm.amount).replace(/,/g, '')) || 0,
      category: billForm.category || 'Bills',
      due_date: billForm.due_date,
      is_paid: false,
      is_recurring: billForm.is_recurring,
      frequency: billForm.is_recurring ? billForm.frequency : null,
      emoji: billForm.emoji || null,
      notes: billForm.notes || null,
    };
    if (editingBill) {
      const { error } = await supabase.from('bills').update(payload).eq('id', editingBill.id);
      if (error) { console.error(error); return; }
    } else {
      const { error } = await supabase.from('bills').insert([payload]);
      if (error) { console.error(error); return; }
    }
    const savedBill = { ...billForm };
    setBillForm({ name: '', amount: '', category: 'Bills', due_date: '', is_recurring: false, frequency: 'monthly', emoji: '', notes: '' });
    setEditingBill(null);
    setShowBillsModal(false);
    loadBills(activeSpace.id);
    if (!editingBill) {
      const comment = generatePlanItemComment({ personality: coachPersonality, type: 'bill', item: savedBill });
      setTimeout(() => setCoachComment(comment), 400);
      // Schedule a push reminder 3 days before the bill due date
      scheduleBillReminder({
        billId: 'new',
        billName: savedBill.name,
        amount: Number(savedBill.amount) || 0,
        dueDate: savedBill.due_date,
        daysBeforeReminder: 3,
      }).catch(() => {});
    }
  };

  const handleCreateSubscription = async () => {
    if (!subForm.description || !subForm.amount || !activeSpace || !user) return;
    const nextRun = (subForm.next_run && /^\d{4}-\d{2}-\d{2}$/.test(subForm.next_run))
      ? subForm.next_run
      : new Date().toISOString().split('T')[0];
    const payload = {
      type:            'expense',
      amount:          parseFloat(String(subForm.amount).replace(/,/g, '')) || 0,
      category:        subForm.category || 'Subscriptions',
      description:     subForm.description,
      frequency:       subForm.frequency || 'monthly',
      next_run:        nextRun,
      is_subscription: true,
    };
    if (editingSub) {
      const { error } = await supabase.from('recurring_transactions').update(payload).eq('id', editingSub.id);
      if (error) { console.error(error); return; }
    } else {
      const { error } = await supabase.from('recurring_transactions').insert([{
        ...payload,
        space_id:   activeSpace.id,
        created_by: user.id,
      }]);
      if (error) { console.error(error); return; }
    }
    setSubForm(BLANK_SUB_FORM);
    setEditingSub(null);
    setShowSubModal(false);
    loadRecurringTransactions(activeSpace.id);
  };

  const handleDeleteSubscription = () => {
    confirmDelete('Delete Subscription', 'Remove this subscription?', async () => {
      await supabase.from('recurring_transactions').delete().eq('id', editingSub.id);
      setEditingSub(null);
      setSubForm(BLANK_SUB_FORM);
      setShowSubModal(false);
      loadRecurringTransactions(activeSpace.id);
    });
  };

  const handleDeleteBill = (billId) => {
    confirmDelete('Delete Bill', 'Remove this bill?', async () => {
      await supabase.from('bills').delete().eq('id', billId);
      loadBills(activeSpace.id);
    });
  };

  const handleMarkBillPaid = async (billId) => {
    await supabase.from('bills').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', billId);
    loadBills(activeSpace.id);
  };

  // ── Card Handlers ─────────────────────────────────────────────────────────
  const BLANK_CARD_FORM = {
    card_name: '', card_holder_name: '', last_four: '',
    card_type: 'visa', bank_name: '',
    card_color_from: '#1a1a2e', card_color_to: '#16213e',
    credit_limit: '', current_balance: '0',
    expiry_month: '', expiry_year: '', notes: '',
  };

  const handleCreateCard = async () => {
    if (!cardForm.card_name || !user) return;
    const payload = {
      user_id:          user.id,
      card_name:        cardForm.card_name,
      card_holder_name: cardForm.card_holder_name || null,
      last_four:        cardForm.last_four || null,
      card_type:        cardForm.card_type || 'visa',
      bank_name:        cardForm.bank_name || null,
      card_color_from:  cardForm.card_color_from || '#1a1a2e',
      card_color_to:    cardForm.card_color_to   || '#16213e',
      credit_limit:     parseFloat(String(cardForm.credit_limit).replace(/,/g, '')) || null,
      current_balance:  parseFloat(String(cardForm.current_balance).replace(/,/g, '')) || 0,
      expiry_month:     cardForm.expiry_month || null,
      expiry_year:      cardForm.expiry_year  || null,
      is_default:       cards.length === 0,   // first card is default
      notes:            cardForm.notes || null,
    };
    if (editingCard) {
      const { error } = await supabase.from('cards').update(payload).eq('id', editingCard.id);
      if (error) { console.error(error); return; }
    } else {
      const { error } = await supabase.from('cards').insert([payload]);
      if (error) { console.error(error); return; }
    }
    setCardForm(BLANK_CARD_FORM);
    setEditingCard(null);
    setShowCardModal(false);
    loadCards(user.id);
  };

  const handleDeleteCard = () => {
    confirmDelete('Delete Card', 'Remove this card from your account?', async () => {
      await supabase.from('cards').delete().eq('id', editingCard.id);
      setEditingCard(null);
      setCardForm(BLANK_CARD_FORM);
      setShowCardModal(false);
      loadCards(user.id);
    });
  };

  /** Advance a subscription's next_run by one cycle so the engine won't double-charge */
  const advanceSubscriptionNextRun = async (sub) => {
    if (!sub.next_run) return;
    const cur = new Date(sub.next_run + 'T00:00:00');
    let next;
    switch (sub.frequency) {
      case 'weekly':       next = new Date(cur); next.setDate(cur.getDate() + 7);       break;
      case 'semi_monthly': next = new Date(cur); next.setDate(cur.getDate() + 15);      break;
      case 'annual':       next = new Date(cur.getFullYear() + 1, cur.getMonth(), cur.getDate()); break;
      default:             next = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()); // monthly
    }
    const nextStr = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
    await supabase.from('recurring_transactions').update({ next_run: nextStr }).eq('id', sub.id);
    loadRecurringTransactions(activeSpace.id);
  };

  const handleDeleteSpace = (spaceId) => {
    confirmDelete('Delete Space', 'This will also delete its transactions, budgets, goals, and members.', async () => {
      const { error } = await supabase.from('spaces').delete().eq('id', spaceId).neq('type', 'personal');
      if (error) { Alert.alert('Error', 'Failed to delete space.'); return; }
      const updatedSpaces = spaces.filter((s) => s.id !== spaceId);
      setSpaces(updatedSpaces);
      if (updatedSpaces.length > 0) {
        const nextSpace = updatedSpaces[0];
        setActiveSpace(nextSpace);
        loadTransactions(nextSpace.id);
        loadMembers(nextSpace.id);
        loadBudgets(nextSpace.id);
        loadGoals(nextSpace.id);
      }
    });
  };

  // ── Derived analytics data (all-time for analytics tab) ───────────────────
  const expenseByCategory = Object.values(
    transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = { name: t.category, value: 0, color: categoryConfig[t.category]?.color || '#6b7280' };
        }
        acc[t.category].value += Number(t.amount);
        return acc;
      }, {})
  );

  const incomeExpenseData = [
    { name: 'Income', amount: summary.income },
    { name: 'Expenses', amount: summary.expenses },
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Bestie';

  // Annual Wrapped is only meaningful at end-of-year (December) or
  // the first week of January so users can review the previous year.
  const isWrappedSeason =
    phNow.getMonth() === 11 ||                          // December
    (phNow.getMonth() === 0 && phNow.getDate() <= 7);   // Jan 1-7

  const floatingLabel =
    activeTab === 'transactions' ? 'Transaction'
    : activeTab === 'planning' ? 'Bill'
    : activeTab === 'profile' ? 'Space'
    : 'Transaction';

  const handleFloatingPress = () => {
    if (activeTab === 'planning') setShowBillsModal(true);
    else if (activeTab === 'profile') setShowSpaceModal(true);
    else {
      // Pre-select the currently active card so the user doesn't have to tap it again
      setTransactionForm((f) => ({ ...f, card_id: selectedCardId ?? null }));
      setShowModal(true);
    }
  };

  const handleMonthChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  if (pageLoading) return <AppLoader />;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          displayName={displayName}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          markNotificationsAsRead={markNotificationsAsRead}
          onSettingsOpen={() => setShowSettings(true)}
          onProfileOpen={() => setActiveTab('profile')}
        />

        {/* Offline queue banner */}
        {pendingSync > 0 && (
          <TouchableOpacity
            style={styles.offlineBanner}
            onPress={handleSyncOfflineQueue}
            activeOpacity={0.8}
          >
            <Text style={styles.offlineBannerText}>
              {isSyncing
                ? 'Syncing offline transactions…'
                : `${pendingSync} transaction${pendingSync > 1 ? 's' : ''} queued offline — tap to sync`}
            </Text>
          </TouchableOpacity>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Home Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              {/* 1. Hero balance card */}
              <BalanceCard
                cards={cards}
                transactions={transactions}
                selectedCardId={selectedCardId}
                onAddCard={() => setShowCardModal(true)}
                onViewAllCards={() => setShowCardPicker(true)}
                onCardChange={(card) => setSelectedCardId(card?.id ?? null)}
                onEditCard={(c) => {
                  setEditingCard(c);
                  setCardForm({
                    card_name:        c.card_name        || '',
                    card_holder_name: c.card_holder_name || '',
                    last_four:        c.last_four        || '',
                    card_type:        c.card_type        || 'visa',
                    bank_name:        c.bank_name        || '',
                    card_color_from:  c.card_color_from  || '#1a1a2e',
                    card_color_to:    c.card_color_to    || '#16213e',
                    credit_limit:     c.credit_limit ? String(c.credit_limit) : '',
                    current_balance:  c.current_balance  ? String(c.current_balance) : '0',
                    expiry_month:     c.expiry_month     || '',
                    expiry_year:      c.expiry_year      || '',
                    notes:            c.notes            || '',
                  });
                  setShowCardModal(true);
                }}
              />

              {/* 2. Streak summary (compact) */}
              <StreakCard transactions={transactions} budgets={budgets} />

              {/* 3. Recent activity — shows the active card's transactions (or all if no card) */}
              <RecentActivity
                transactions={filteredTransactions}
                onViewAll={() => setActiveTab('transactions')}
              />

              {/* 4. AI Coach — card-aware: uses selected card's own transactions for coaching */}
              <CoachSection
                monthSummary={monthSummary}
                budgets={budgets}
                transactions={transactions}
                monthTransactions={monthTransactions}
                insights={insights}
                selectedCard={selectedCard}
                selectedCardBalance={selectedCardBalance}
                cardMonthTransactions={filteredMonthTransactions}
              />



              {/* ── Discover section (fun / secondary features) ──── */}
              <MemoryCards transactions={transactions} />
            </>
          )}

          {/* ── Transactions Tab ──────────────────────────────────────────── */}
          {activeTab === 'transactions' && (
            <>
              {/* Card filter banner — only shown when a card is selected */}
              {selectedCard && (
                <View style={[styles.cardFilterBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '33' }]}>
                  <Text style={[styles.cardFilterLabel, { color: colors.primary }]}>
                    💳 Showing: <Text style={{ fontWeight: '800' }}>{selectedCard.bank_name || selectedCard.card_name}</Text>
                    {selectedCard.last_four ? `  ···· ${selectedCard.last_four}` : ''}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedCardId(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cardFilterClear, { color: colors.primary }]}>✕ Show all</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Unified calendar + transaction timeline */}
              <CalendarTransactionsSection
                transactions={filteredTransactions}
                monthTransactions={filteredMonthTransactions}
                bills={bills}
                activeSpace={activeSpace}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                cardBalance={selectedCard ? selectedCardBalance : totalCardsBalance}
                onMonthChange={handleMonthChange}
                onAdd={() => setShowModal(true)}
                onDelete={handleDeleteTransaction}
                onEdit={(item) => {
                  setEditingTransaction(item);
                  setTransactionForm({ type: item.type, amount: String(item.amount), category: item.category, description: item.description || '', card_id: item.card_id ?? null });
                  setShowModal(true);
                }}
              />

              {/* Regret Tracker — uses unfiltered month data for overall spending habits */}
              <RegretSection monthTransactions={monthTransactions} />
            </>
          )}

          {/* ── Plan Tab ──────────────────────────────────────────────────── */}
          {activeTab === 'planning' && (
            <>
              {/* 0. AI Coach Plan Insight — context-aware nudge */}
              {(() => {
                const planInsight = generatePlanInsight({ personality: coachPersonality, budgets, goals, monthSummary });
                return (
                  <View style={[styles.planCoachCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '33', marginHorizontal: spacing.lg }]}>
                    <Text style={styles.planCoachIcon}>{planInsight.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planCoachTitle, { color: colors.primary }]}>{planInsight.title}</Text>
                      <Text style={[styles.planCoachText, { color: colors.primary + 'cc' }]}>{planInsight.text}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* 1. Monthly budgets — most actionable planning tool */}
              <BudgetSection
                budgets={budgets}
                transactions={monthTransactions}
                onCreateBudget={() => setShowBudgetModal(true)}
                onDeleteBudget={handleDeleteBudget}
                onEditBudget={(budget) => {
                  setEditingBudget(budget);
                  setBudgetForm({ title: budget.title || '', category: budget.category, monthly_limit: String(budget.monthly_limit) });
                  setShowBudgetModal(true);
                }}
              />

              {/* 2. Savings goals */}
              <GoalsSection
                goals={goals}
                onCreateGoal={() => setShowGoalModal(true)}
                onDeleteGoal={handleDeleteGoal}
                onEditGoal={(goal) => {
                  setEditingGoal(goal);
                  setGoalForm({ title: goal.title, target_amount: String(goal.target_amount), current_amount: String(goal.current_amount), deadline: goal.deadline || '', emoji: goal.emoji || '' });
                  setShowGoalModal(true);
                }}
              />

              {/* 3. Bills + Subscriptions (merged) */}
              <BillsSection
                bills={bills}
                recurringTransactions={recurringTransactions}
                onAdd={() => setShowBillsModal(true)}
                onAddSub={() => setShowSubModal(true)}
                onEditSub={(sub) => {
                  setEditingSub(sub);
                  setSubForm({
                    description: sub.description || '',
                    amount:      String(sub.amount),
                    category:    sub.category || 'Subscriptions',
                    frequency:   sub.frequency || 'monthly',
                    next_run:    sub.next_run || todayStr(),
                  });
                  setShowSubModal(true);
                }}
                onEdit={(bill) => {
                  setEditingBill(bill);
                  setBillForm({
                    name: bill.name, amount: String(bill.amount), category: bill.category,
                    due_date: bill.due_date, is_recurring: bill.is_recurring,
                    frequency: bill.frequency || 'monthly', emoji: bill.emoji || '', notes: bill.notes || '',
                  });
                  setShowBillsModal(true);
                }}
                onDelete={handleDeleteBill}
                onMarkPaid={handleMarkBillPaid}
              />
            </>
          )}

          {/* ── Trends Tab ────────────────────────────────────────────────── */}
          {activeTab === 'analytics' && (
            <>
              {/* 0. AI Coach Trends Insight */}
              <View style={[styles.planCoachCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '33', marginHorizontal: spacing.lg }]}>
                <Text style={styles.planCoachIcon}>{trendsCoachInsight.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planCoachTitle, { color: colors.primary }]}>{trendsCoachInsight.title}</Text>
                  <Text style={[styles.planCoachText, { color: colors.primary + 'cc' }]}>{trendsCoachInsight.text}</Text>
                </View>
              </View>

              {/* 1. Per-card income / expense / balance — top of analytics for quick overview */}
              {cards.length > 0 && (
                <CardBreakdownSection cards={cards} transactions={transactions} />
              )}

              {/* 2. Category breakdown — where does the money go? */}
              <AnalyticsSection
                transactions={transactions}
                expenseByCategory={expenseByCategory}
                incomeExpenseData={incomeExpenseData}
                activeSpace={activeSpace}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />

              {/* 3. Forward-looking cash flow */}
              <CashFlowForecast
                summary={summary}
                transactions={transactions}
                recurringTransactions={recurringTransactions}
                bills={bills}
              />

              {/* 4. Spending frequency patterns */}
              <ExpenseFrequency transactions={transactions} />
            </>
          )}

          {/* ── Profile Tab ───────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <>
              {/* ── Profile hero card ─────────────────────────────────── */}
              <View
                style={[
                  styles.profileHero,
                  {
                    backgroundColor: colors.primary,
                    marginHorizontal: spacing.lg,
                    marginTop: spacing.lg,
                    borderRadius: radius.xl,
                  },
                ]}
              >
                {(() => {
                  const persona = computeSpendingPersonality({ transactions, budgets, goals });
                  return (
                    <>
                      <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={styles.avatarText}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.heroName}>{displayName}</Text>
                      <Text style={styles.heroEmail}>{user?.email}</Text>
                      {/* Spending personality chip — tap to expand details */}
                      {persona ? (
                        <TouchableOpacity
                          style={styles.heroPersonaChip}
                          onPress={() => setShowPersonalityModal(true)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.heroPersonaEmoji}>{persona.emoji}</Text>
                          <Text style={styles.heroPersonaText}>{persona.name}</Text>
                          <Text style={[styles.heroPersonaText, { opacity: 0.7, fontSize: 10 }]}> ›</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.heroPersonaChip, { opacity: 0.7 }]}>
                          <Text style={styles.heroPersonaEmoji}>🔍</Text>
                          <Text style={styles.heroPersonaText}>Log 5+ expenses to reveal your type</Text>
                        </View>
                      )}
                    </>
                  );
                })()}

                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{transactions.length}</Text>
                    <Text style={styles.heroStatLabel}>Logs</Text>
                  </View>
                  <View style={[styles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>
                      {goals.filter((g) => Number(g.current_amount) >= Number(g.target_amount)).length}
                      <Text style={styles.heroStatSuffix}>/{goals.length}</Text>
                    </Text>
                    <Text style={styles.heroStatLabel}>Goals</Text>
                  </View>
                  <View style={[styles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{unlockedAchievementIds.length}</Text>
                    <Text style={styles.heroStatLabel}>Badges</Text>
                  </View>
                </View>
              </View>

              {/* 1. Achievements */}
              <AchievementsSection
                unlockedIds={unlockedAchievementIds}
                timestamps={achievementTimestamps}
              />

              {/* 2. Net worth tracker */}
              <NetWorthSection
                entries={netWorthEntries}
                onSaveEntry={handleSaveNetWorth}
              />

              {/* 3. Monthly review */}
              <MonthlyReview
                transactions={transactions}
                budgets={budgets}
                goals={goals}
              />

              {/* 4. Annual Wrapped — only in December / first week of January */}
              {isWrappedSeason && (
                <AnnualWrapped
                  transactions={transactions}
                  budgets={budgets}
                  goals={goals}
                />
              )}

              {/* 6. Spaces & Members */}
              <SpacesSection
                spaces={spaces}
                activeSpace={activeSpace}
                onCreateSpace={() => setShowSpaceModal(true)}
                onDeleteSpace={handleDeleteSpace}
                onSelectSpace={async (space) => {
                  setActiveSpace(space);
                  await processRecurringTransactions({ supabase, spaceId: space.id });
                  loadTransactions(space.id);
                  loadMembers(space.id);
                  loadBudgets(space.id);
                  loadGoals(space.id);
                  loadRecurringTransactions(space.id);
                  loadBills(space.id);
                }}
              />
              {activeSpace?.type !== 'personal' && (
                <MembersSection
                  activeSpace={activeSpace}
                  members={members}
                  onInvite={() => setShowInviteModal(true)}
                />
              )}
              <QuickInfoSection activeSpace={activeSpace} />
            </>
          )}

          {/* bottom breathing room for floating nav */}
        </ScrollView>

        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} onFloatingPress={handleFloatingPress} />

        {/* ── Modals ────────────────────────────────────────────────────────── */}
        <ConfirmModal
          visible={confirmModal.visible}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => {
            setConfirmModal({ visible: false, title: '', message: '', onConfirm: null });
            confirmModal.onConfirm?.();
          }}
          onCancel={() => setConfirmModal({ visible: false, title: '', message: '', onConfirm: null })}
        />
        <TransactionModal
          visible={showModal}
          editingTransaction={editingTransaction}
          transactionForm={transactionForm}
          setTransactionForm={setTransactionForm}
          cards={cards}
          onSubmit={handleAddTransaction}
          onDelete={(id) => {
            setShowModal(false);
            setEditingTransaction(null);
            handleDeleteTransaction(id);
          }}
          onClose={() => { setShowModal(false); setEditingTransaction(null); }}
        />
        <BudgetModal
          visible={showBudgetModal}
          editingBudget={editingBudget}
          budgetForm={budgetForm}
          setBudgetForm={setBudgetForm}
          onSubmit={handleCreateBudget}
          onDelete={(id) => {
            setShowBudgetModal(false);
            setEditingBudget(null);
            handleDeleteBudget(id);
          }}
          onClose={() => { setShowBudgetModal(false); setEditingBudget(null); }}
        />
        <GoalModal
          visible={showGoalModal}
          editingGoal={editingGoal}
          goalForm={goalForm}
          setGoalForm={setGoalForm}
          onSubmit={handleCreateGoal}
          onDelete={(id) => {
            setShowGoalModal(false);
            setEditingGoal(null);
            handleDeleteGoal(id);
          }}
          onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
        />
        <SpaceModal
          visible={showSpaceModal}
          spaceName={spaceName}
          setSpaceName={setSpaceName}
          spaceEmoji={spaceEmoji}
          setSpaceEmoji={setSpaceEmoji}
          onSubmit={handleCreateSpace}
          onClose={() => setShowSpaceModal(false)}
        />
        <InviteModal
          visible={showInviteModal}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          onSubmit={handleInviteMember}
          onClose={() => setShowInviteModal(false)}
        />
        <BillsModal
          visible={showBillsModal}
          billForm={billForm}
          setBillForm={setBillForm}
          editingBill={editingBill}
          onSubmit={handleCreateBill}
          onDelete={(id) => {
            setShowBillsModal(false);
            setEditingBill(null);
            handleDeleteBill(id);
          }}
          onClose={() => { setShowBillsModal(false); setEditingBill(null); }}
        />

        {/* ── Subscription Modal ───────────────────────────────────────────── */}
        <SubscriptionModal
          visible={showSubModal}
          subForm={subForm}
          setSubForm={setSubForm}
          editingSub={editingSub}
          onSubmit={handleCreateSubscription}
          onDelete={editingSub ? handleDeleteSubscription : undefined}
          onClose={() => { setShowSubModal(false); setEditingSub(null); setSubForm(BLANK_SUB_FORM); }}
        />

        {/* ── Card Modal ────────────────────────────────────────────────────── */}
        <CardModal
          visible={showCardModal}
          cardForm={cardForm}
          setCardForm={setCardForm}
          editingCard={editingCard}
          onSubmit={handleCreateCard}
          onClose={() => { setShowCardModal(false); setEditingCard(null); }}
          onDelete={handleDeleteCard}
        />

        {/* ── Card Picker Modal ─────────────────────────────────────────────── */}
        <CardPickerModal
          visible={showCardPicker}
          cards={cards}
          transactions={transactions}
          selectedCardId={selectedCardId}
          onSelect={(card) => setSelectedCardId(card.id)}
          onAdd={() => setShowCardModal(true)}
          onClose={() => setShowCardPicker(false)}
        />

        {/* ── Settings Modal ───────────────────────────────────────────────── */}
        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
        />

        {/* ── Spending Personality Detail Modal ────────────────────────────── */}
        <Modal
          visible={showPersonalityModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPersonalityModal(false)}
        >
          <Pressable style={styles.coachCommentOverlay} onPress={() => setShowPersonalityModal(false)}>
            <Pressable
              style={[styles.personalitySheet, { backgroundColor: colors.card }]}
              onPress={() => {}}
            >
              {(() => {
                const persona = computeSpendingPersonality({ transactions, budgets, goals });
                if (!persona) return (
                  <View style={{ alignItems: 'center', padding: 24 }}>
                    <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
                    <Text style={[styles.personalityModalTitle, { color: colors.textPrimary }]}>Not enough data yet</Text>
                    <Text style={[styles.personalityModalSub, { color: colors.textSecondary, textAlign: 'center' }]}>
                      Log at least 5 expenses over 90 days to reveal your spending personality!
                    </Text>
                  </View>
                );
                return (
                  <>
                    <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                    <Text style={[styles.personalityModalTitle, { color: colors.textPrimary }]}>🧬 Spending Personality</Text>
                    <Text style={[styles.personalityModalSub, { color: colors.textSecondary }]}>Based on your last 90 days</Text>

                    <View style={[styles.personalityBadge, { backgroundColor: persona.colorLight, borderColor: persona.color }]}>
                      <Text style={{ fontSize: 42 }}>{persona.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: persona.color, marginBottom: 2 }}>{persona.name}</Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' }}>{persona.tagline}</Text>
                      </View>
                    </View>

                    <Text style={[styles.personalityDesc, { color: colors.textPrimary }]}>{persona.description}</Text>

                    <Text style={[styles.personalityTipsLabel, { color: colors.textMuted }]}>COACHING TIPS</Text>
                    <View style={[styles.personalityTipsContainer, { backgroundColor: colors.background }]}>
                      {persona.tips.map((tip, i) => (
                        <View key={i} style={styles.personalityTipRow}>
                          <Text style={{ color: persona.color, fontSize: 8, marginTop: 5 }}>●</Text>
                          <Text style={{ flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 19 }}>{tip}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={[styles.personalityDisclaimer, { color: colors.textMuted }]}>
                      Personality updates as you log more transactions.
                    </Text>

                    <TouchableOpacity
                      style={[styles.coachCommentBtn, { backgroundColor: colors.primary, alignSelf: 'center', marginTop: 4 }]}
                      onPress={() => setShowPersonalityModal(false)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.coachCommentBtnText}>Got it!</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── AI Coach Post-Transaction Comment ───────────────────────────── */}
        <Modal
          visible={!!coachComment}
          transparent
          animationType="fade"
          onRequestClose={() => setCoachComment(null)}
        >
          <Pressable style={styles.coachCommentOverlay} onPress={() => setCoachComment(null)}>
            <Pressable style={[styles.coachCommentCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
              <Text style={styles.coachCommentEmoji}>{coachComment?.icon}</Text>
              <Text style={[styles.coachCommentTitle, { color: colors.textPrimary }]}>{coachComment?.title}</Text>
              <Text style={[styles.coachCommentText, { color: colors.textSecondary }]}>{coachComment?.text}</Text>
              <TouchableOpacity
                style={[styles.coachCommentBtn, { backgroundColor: colors.primary }]}
                onPress={() => setCoachComment(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.coachCommentBtnText}>Got it! 👍</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>

      {/* ── Payday Celebration ───────────────────────────────────────────── */}
      <PaydayCelebration
        visible={paydayVisible}
        amount={paydayAmount}
        onDismiss={() => { setPaydayVisible(false); setPaydayAmount(0); }}
      />

      {/* ── Achievement Unlock Toast ─────────────────────────────────────── */}
      <AchievementUnlockToast
        achievement={toastAchievement}
        onDismiss={() => setToastQueue((q) => q.slice(1))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 140 },

  offlineBanner: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Profile hero card ─────────────────────────────────────────────────────
  profileHero: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  heroEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 18,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  heroStatSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  heroStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 4,
  },

  // ── Spending personality chip (profile hero) ──────────────────────────────
  heroPersonaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  heroPersonaEmoji: { fontSize: 15 },
  heroPersonaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  // ── Plan tab — AI coach mini-card ─────────────────────────────────────────
  planCoachCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
    marginTop: 12,
  },
  planCoachIcon: { fontSize: 20, marginTop: 1 },
  planCoachTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  planCoachText: { fontSize: 12, lineHeight: 18 },

  // ── Post-transaction coach comment modal ──────────────────────────────────
  coachCommentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  coachCommentCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  coachCommentEmoji: { fontSize: 40, marginBottom: 4 },
  coachCommentTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  coachCommentText: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 8 },
  coachCommentBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 50,
    marginTop: 4,
  },
  coachCommentBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  // ── Spending personality detail sheet ─────────────────────────────────────
  personalitySheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  personalityModalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  personalityModalSub: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  personalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 14,
  },
  personalityDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  personalityTipsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  personalityTipsContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  personalityTipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  personalityDisclaimer: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },

  // ── Card filter banner (transactions tab) ─────────────────────────────────
  cardFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  cardFilterClear: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
  },
});
