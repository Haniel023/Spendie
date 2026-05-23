export const categoryConfig = {
  // ── Income ────────────���──────────────────────────────��───────────────────
  Salary:        { icon: '💼', color: '#22c55e' },
  Freelance:     { icon: '🖥️', color: '#10b981' },
  Investment:    { icon: '📈', color: '#14b8a6' },
  Business:      { icon: '🏢', color: '#0891b2' },

  // ── Daily Expenses ─────────────────���──────────────────────────��──────────
  Food:          { icon: '🍔', color: '#f97316' },
  Transportation:{ icon: '🚌', color: '#3b82f6' },
  Shopping:      { icon: '🛍️', color: '#ec4899' },
  Health:        { icon: '💊', color: '#ef4444' },
  Entertainment: { icon: '🎬', color: '#8b5cf6' },
  Games:         { icon: '🎮', color: '#6366f1' },

  // ── Bills & Recurring ────────────────────────────────────────────────────
  Bills:         { icon: '🏠', color: '#8b5cf6' },
  Rent:          { icon: '🏡', color: '#6366f1' },
  Utilities:     { icon: '💡', color: '#f59e0b' },
  Internet:      { icon: '🌐', color: '#0ea5e9' },
  Insurance:     { icon: '🛡️', color: '#64748b' },
  Loan:          { icon: '🏦', color: '#dc2626' },

  // ── Subscriptions ───────────────────────��────────────────────────────��───
  Subscriptions: { icon: '📦', color: '#7c3aed' },

  // ── Financial ────────────────────────��──────────────────────────────────
  Savings:       { icon: '💰', color: '#14b8a6' },
  Investment:    { icon: '📊', color: '#2563eb' },

  // ── Misc ─────────────────────────────��────────────────────────���──────────
  Education:     { icon: '📚', color: '#d97706' },
  Travel:        { icon: '✈️', color: '#0284c7' },
  Gifts:         { icon: '🎁', color: '#db2777' },
  Other:         { icon: '✨', color: '#6b7280' },
};

// ── Known subscription services (for auto-detection) ─────────────────────────
export const KNOWN_SUBSCRIPTIONS = [
  { name: 'Netflix',     emoji: '🎬', amount: null },
  { name: 'Spotify',     emoji: '🎵', amount: null },
  { name: 'YouTube Premium', emoji: '▶️', amount: null },
  { name: 'Disney+',     emoji: '🏰', amount: null },
  { name: 'Amazon Prime', emoji: '📦', amount: null },
  { name: 'Apple Music', emoji: '🎵', amount: null },
  { name: 'HBO Max',     emoji: '🎭', amount: null },
  { name: 'Canva Pro',   emoji: '🎨', amount: null },
  { name: 'Adobe CC',    emoji: '🖌️', amount: null },
  { name: 'Microsoft 365', emoji: '💻', amount: null },
  { name: 'Google One',  emoji: '☁️', amount: null },
  { name: 'iCloud',      emoji: '☁️', amount: null },
  { name: 'Gym',         emoji: '🏋️', amount: null },
  { name: 'Internet',    emoji: '🌐', amount: null },
  { name: 'Phone Plan',  emoji: '📱', amount: null },
];

// ── Bill preset categories ────────────────────────��──────────────────────────���
export const BILL_CATEGORIES = [
  { label: 'Electricity',  emoji: '⚡', category: 'Utilities' },
  { label: 'Water',        emoji: '💧', category: 'Utilities' },
  { label: 'Internet',     emoji: '🌐', category: 'Internet' },
  { label: 'Rent',         emoji: '🏡', category: 'Rent' },
  { label: 'Credit Card',  emoji: '💳', category: 'Bills' },
  { label: 'Loan Payment', emoji: '🏦', category: 'Loan' },
  { label: 'Insurance',    emoji: '🛡️', category: 'Insurance' },
  { label: 'Phone Bill',   emoji: '📱', category: 'Bills' },
  { label: 'Gas',          emoji: '⛽', category: 'Utilities' },
  { label: 'Other',        emoji: '📄', category: 'Bills' },
];
