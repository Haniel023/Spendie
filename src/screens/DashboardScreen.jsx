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
import FloatingAddButton from '../components/common/FloatingAddButton';
import PaydayCelebration from '../components/common/PaydayCelebration';

import BalanceCard from '../components/dashboard/BalanceCard';
import RecentActivity from '../components/dashboard/RecentActivity';
import AlertSection from '../components/dashboard/AlertSection';
// InsightsSection removed — insights are now shown inside CoachSection
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
import SubscriptionSection from '../components/dashboard/SubscriptionSection';
import BillsSection from '../components/dashboard/BillsSection';
// CalendarView replaced by CalendarTransactionsSection (unified card)
import CashFlowForecast from '../components/dashboard/CashFlowForecast';
import NetWorthSection from '../components/dashboard/NetWorthSection';
import AchievementsSection from '../components/dashboard/AchievementsSection';
import AchievementUnlockToast from '../components/dashboard/AchievementUnlockToast';
import RecurringSection from '../components/dashboard/RecurringSection';
import ExpenseFrequency from '../components/dashboard/ExpenseFrequency';
// SpendingPersonality card removed — shown as modal when hero chip is tapped
import MonthlyReview from '../components/dashboard/MonthlyReview';
import CoachSection from '../components/dashboard/CoachSection';
// RoastCard removed — merged into CoachSection as 'roast' personality
import ChallengesSection from '../components/dashboard/ChallengesSection';
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
import TransactionModal from '../components/modals/TransactionModal';
import BudgetModal from '../components/modals/BudgetModal';
import GoalModal from '../components/modals/GoalModal';
import SpaceModal from '../components/modals/SpaceModal';
import InviteModal from '../components/modals/InviteModal';
import RecurringModal from '../components/modals/RecurringModal';
import BillsModal from '../components/modals/BillsModal';

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
  const [netWorthEntries, setNetWorthEntries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
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

  // AI Coach insight for Trends tab
  const trendsCoachInsight = useMemo(
    () => generateCoachComment({ personality: coachPersonality, monthSummary, budgets, transactions, monthTransactions }),
    [coachPersonality, monthSummary, budgets, transactions, monthTransactions]
  );

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
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [editingRecurring, setEditingRecurring] = useState(null);

  // ── Forms ──────────────────────────────────────────────────────────────────
  const [transactionForm, setTransactionForm] = useState({
    type: 'expense', amount: '', category: '', description: '', emoji: '',
  });
  const [budgetForm, setBudgetForm] = useState({ title: '', category: '', monthly_limit: '' });
  const [goalForm, setGoalForm] = useState({ title: '', target_amount: '', current_amount: '', deadline: '', emoji: '' });
  const [recurringForm, setRecurringForm] = useState({
    type: 'expense', amount: '', category: '', description: '', emoji: '',
    frequency: 'monthly', recurring_day_1: '', recurring_day_2: '', is_subscription: false,
  });
  const [billForm, setBillForm] = useState({
    name: '', amount: '', category: 'Bills', due_date: '', is_recurring: false,
    frequency: 'monthly', emoji: '', notes: '',
  });
  const [spaceName, setSpaceName] = useState('');
  const [spaceEmoji, setSpaceEmoji] = useState('💰');
  const [inviteEmail, setInviteEmail] = useState('');

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

  // Alerts use month transactions so budget progress is month-scoped
  useEffect(() => {
    setAlerts(generateSmartAlerts({ summary: monthSummary, budgets, transactions: monthTransactions }));
  }, [monthTransactions, budgets, monthSummary]);

  useEffect(() => {
    setInsights(generateInsights({ transactions: monthTransactions, budgets, goals, summary: monthSummary, personality: coachPersonality }));
  }, [monthTransactions, budgets, goals, monthSummary, coachPersonality]);

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
    if (editingTransaction) {
      // Editing always requires online (we have an ID)
      const { error } = await supabase.from('transactions').update({
        type: transactionForm.type, amount: parseFloat(String(transactionForm.amount).replace(/,/g, '')) || 0,
        category: transactionForm.category, description: transactionForm.description,
        emoji: transactionForm.emoji || null,
      }).eq('id', editingTransaction.id);
      if (error) { console.error(error); return; }
    } else {
      const payload = {
        space_id: activeSpace.id, created_by: user.id,
        type: transactionForm.type, amount: parseFloat(String(transactionForm.amount).replace(/,/g, '')) || 0,
        category: transactionForm.category, description: transactionForm.description,
        emoji: transactionForm.emoji || null,
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
          '📴 Saved Offline',
          'No internet connection. Your transaction has been saved and will sync automatically when you\'re back online.',
          [{ text: 'OK' }]
        );
      }
    }
    // Generate AI coach comment for new transactions (not edits)
    const isNewTransaction = !editingTransaction;
    const savedForm = { ...transactionForm };

    setTransactionForm({ type: 'expense', amount: '', category: '', description: '', emoji: '' });
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
              '✅ Bill Detected',
              `This looks like your "${matchedBill.name}" bill (₱${Number(matchedBill.amount).toFixed(2)}). Mark it as paid?`,
              [
                { text: '✅ Mark Paid', onPress: () => handleMarkBillPaid(matchedBill.id) },
                { text: 'Not Now', style: 'cancel' },
              ]
            );
          }, 500);
        } else if (matchedSub) {
          const subLabel = matchedSub.description || matchedSub.subscription_service || matchedSub.category;
          setTimeout(() => {
            Alert.alert(
              '🔁 Subscription Detected',
              `This looks like your "${subLabel}" subscription (₱${Number(matchedSub.amount).toFixed(2)}/mo). Advance the next renewal date so it won't auto-charge again?`,
              [
                { text: '✅ Yes, advance', onPress: () => advanceSubscriptionNextRun(matchedSub) },
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

  const BLANK_RECURRING_FORM = {
    type: 'expense', amount: '', category: '', description: '', emoji: '',
    frequency: 'monthly',
    recurring_day: '',        // day of month for monthly (1-31)
    recurring_weekday: '',    // day of week for weekly (0=Sun … 6=Sat)
    recurring_day_1: '', recurring_day_2: '', // for semi_monthly
    is_subscription: false,
  };

  /** Compute the next run date from frequency + selected day fields */
  const computeNextRun = (form) => {
    const today = new Date();
    const freq = form.frequency;

    if (freq === 'monthly' && form.recurring_day) {
      const day = Number(form.recurring_day);
      const d = new Date(today.getFullYear(), today.getMonth(), day);
      // If that day already passed this month, schedule for next month
      if (d <= today) d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    }

    if (freq === 'weekly' && form.recurring_weekday !== '') {
      const targetDay = Number(form.recurring_weekday);
      const d = new Date(today);
      const diff = (targetDay - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
      return d.toISOString().split('T')[0];
    }

    return today.toISOString().split('T')[0];
  };

  const handleCreateRecurring = async () => {
    const nextRun = computeNextRun(recurringForm);
    const { error } = await supabase.from('recurring_transactions').insert([{
      space_id: activeSpace.id, created_by: user.id,
      type: recurringForm.type, amount: parseFloat(String(recurringForm.amount).replace(/,/g, '')) || 0,
      category: recurringForm.category, description: recurringForm.description,
      emoji: recurringForm.emoji || null,
      frequency: recurringForm.frequency, next_run: nextRun,
      is_subscription: recurringForm.is_subscription || false,
      recurring_day:   recurringForm.frequency === 'monthly'     ? (Number(recurringForm.recurring_day) || null)   : null,
      recurring_weekday: recurringForm.frequency === 'weekly'    ? (Number(recurringForm.recurring_weekday) ?? null) : null,
      recurring_day_1: recurringForm.frequency === 'semi_monthly' ? Number(recurringForm.recurring_day_1) : null,
      recurring_day_2: recurringForm.frequency === 'semi_monthly' ? Number(recurringForm.recurring_day_2) : null,
    }]);
    if (error) { console.error(error); return; }
    const savedRecurring = { ...recurringForm };
    setRecurringForm(BLANK_RECURRING_FORM);
    setShowRecurringModal(false);
    loadRecurringTransactions(activeSpace.id);
    const comment = generatePlanItemComment({ personality: coachPersonality, type: 'recurring', item: savedRecurring });
    setTimeout(() => setCoachComment(comment), 400);
  };

  /** Open modal pre-filled with an existing recurring transaction for editing */
  const handleEditRecurring = (item) => {
    setEditingRecurring(item);
    setRecurringForm({
      type:               item.type,
      amount:             String(item.amount),
      category:           item.category,
      description:        item.description || '',
      emoji:              item.emoji || '',
      frequency:          item.frequency,
      recurring_day:      item.recurring_day != null ? String(item.recurring_day) : '',
      recurring_weekday:  item.recurring_weekday != null ? String(item.recurring_weekday) : '',
      recurring_day_1:    item.recurring_day_1 ? String(item.recurring_day_1) : '',
      recurring_day_2:    item.recurring_day_2 ? String(item.recurring_day_2) : '',
      is_subscription:    item.is_subscription || false,
    });
    setShowRecurringModal(true);
  };

  /** Save edits to an existing recurring transaction */
  const handleUpdateRecurring = async () => {
    if (!editingRecurring) return;
    const nextRun = computeNextRun(recurringForm);
    const { error } = await supabase
      .from('recurring_transactions')
      .update({
        type:              recurringForm.type,
        amount:            parseFloat(String(recurringForm.amount).replace(/,/g, '')) || 0,
        category:          recurringForm.category,
        description:       recurringForm.description,
        emoji:             recurringForm.emoji || null,
        frequency:         recurringForm.frequency,
        next_run:          nextRun,
        is_subscription:   recurringForm.is_subscription || false,
        recurring_day:     recurringForm.frequency === 'monthly'      ? (Number(recurringForm.recurring_day) || null)    : null,
        recurring_weekday: recurringForm.frequency === 'weekly'       ? (Number(recurringForm.recurring_weekday) ?? null) : null,
        recurring_day_1:   recurringForm.frequency === 'semi_monthly' ? Number(recurringForm.recurring_day_1) : null,
        recurring_day_2:   recurringForm.frequency === 'semi_monthly' ? Number(recurringForm.recurring_day_2) : null,
      })
      .eq('id', editingRecurring.id);
    if (error) { Alert.alert('Error', 'Failed to update recurring transaction.'); return; }
    setEditingRecurring(null);
    setRecurringForm(BLANK_RECURRING_FORM);
    setShowRecurringModal(false);
    loadRecurringTransactions(activeSpace.id);
  };

  /** Delete a recurring transaction with confirmation */
  const handleDeleteRecurring = (recurringId) => {
    confirmDelete(
      'Delete Recurring',
      'This will stop future auto-logs for this item. Are you sure?',
      async () => {
        const { error } = await supabase
          .from('recurring_transactions')
          .delete()
          .eq('id', recurringId);
        if (error) { Alert.alert('Error', 'Failed to delete recurring transaction.'); return; }
        loadRecurringTransactions(activeSpace.id);
      }
    );
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
    else setShowModal(true);
  };

  const handleMonthChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  if (pageLoading) return <AppLoader />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primary }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          displayName={displayName}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          markNotificationsAsRead={markNotificationsAsRead}
          onLogout={handleLogout}
          onSettingsOpen={() => setShowSettings(true)}
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
                ? '⏳ Syncing offline transactions…'
                : `📴 ${pendingSync} transaction${pendingSync > 1 ? 's' : ''} queued offline — tap to sync`}
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
                summary={summary}
                monthSummary={monthSummary}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={handleMonthChange}
              />

              {/* 2. Streak summary (compact) */}
              <StreakCard transactions={transactions} budgets={budgets} />

              {/* 3. AI Coach — insights merged in */}
              <CoachSection
                monthSummary={monthSummary}
                budgets={budgets}
                transactions={transactions}
                monthTransactions={monthTransactions}
                insights={insights}
              />

              {/* 4. Recent activity — what did I spend? */}
              <RecentActivity transactions={monthTransactions} />

              {/* 5. Alerts — only rendered when there's something to say */}
              {alerts.length > 0 && <AlertSection alerts={alerts} />}

              {/* ── Discover section (fun / secondary features) ──── */}
              <MemoryCards transactions={transactions} />

              <ChallengesSection transactions={transactions} budgets={budgets} />
            </>
          )}

          {/* ── Transactions Tab ──────────────────────────────────────────── */}
          {activeTab === 'transactions' && (
            <>
              {/* Unified calendar + transaction timeline */}
              <CalendarTransactionsSection
                transactions={transactions}
                monthTransactions={monthTransactions}
                bills={bills}
                activeSpace={activeSpace}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={handleMonthChange}
                onAdd={() => setShowModal(true)}
                onRecurring={() => setShowRecurringModal(true)}
                onDelete={handleDeleteTransaction}
                onEdit={(item) => {
                  setEditingTransaction(item);
                  setTransactionForm({ type: item.type, amount: String(item.amount), category: item.category, description: item.description || '', emoji: item.emoji || '' });
                  setShowModal(true);
                }}
              />

              {/* Regret Tracker */}
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

              {/* 3. Upcoming bills */}
              <BillsSection
                bills={bills}
                onAdd={() => setShowBillsModal(true)}
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

              {/* 4. Subscriptions */}
              <SubscriptionSection
                recurringTransactions={recurringTransactions}
                onAdd={() => setShowRecurringModal(true)}
              />

              {/* 5. Recurring auto-logs */}
              <RecurringSection
                recurringTransactions={recurringTransactions}
                onAdd={() => {
                  setEditingRecurring(null);
                  setRecurringForm(BLANK_RECURRING_FORM);
                  setShowRecurringModal(true);
                }}
                onEdit={handleEditRecurring}
                onDelete={handleDeleteRecurring}
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

              {/* 1. Category breakdown — where does the money go? */}
              <AnalyticsSection
                transactions={transactions}
                expenseByCategory={expenseByCategory}
                incomeExpenseData={incomeExpenseData}
                activeSpace={activeSpace}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />

              {/* 2. Forward-looking cash flow */}
              <CashFlowForecast
                summary={summary}
                transactions={transactions}
                recurringTransactions={recurringTransactions}
                bills={bills}
              />

              {/* 3. Spending frequency patterns */}
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
                      <TouchableOpacity
                        style={styles.heroPersonaChip}
                        onPress={() => setShowPersonalityModal(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.heroPersonaEmoji}>{persona.emoji}</Text>
                        <Text style={styles.heroPersonaText}>{persona.name}</Text>
                        <Text style={[styles.heroPersonaText, { opacity: 0.7, fontSize: 10 }]}> ›</Text>
                      </TouchableOpacity>
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

          <View style={{ height: 120 }} />
        </ScrollView>

        {activeTab !== 'analytics' && (
          <FloatingAddButton label={floatingLabel} onPress={handleFloatingPress} />
        )}

        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

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
        <RecurringModal
          visible={showRecurringModal}
          recurringForm={recurringForm}
          setRecurringForm={setRecurringForm}
          isEditing={!!editingRecurring}
          onSubmit={editingRecurring ? handleUpdateRecurring : handleCreateRecurring}
          onDelete={() => {
            if (!editingRecurring) return;
            const id = editingRecurring.id;
            setShowRecurringModal(false);
            setEditingRecurring(null);
            setRecurringForm(BLANK_RECURRING_FORM);
            handleDeleteRecurring(id);
          }}
          onClose={() => {
            setShowRecurringModal(false);
            setEditingRecurring(null);
            setRecurringForm(BLANK_RECURRING_FORM);
          }}
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
  scrollContent: { paddingBottom: 16 },

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
});
