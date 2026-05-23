# Spendie — Session 5 Notes

## Overview

This session covered adding emoji pickers to transaction modals, replacing browser-native confirm dialogs with a custom modal, fixing a web-specific delete bug, making the Personal space a default for all accounts, setting up Google OAuth login, pushing the project to GitHub, and fixing a critical Vercel deployment bug caused by `.gitignore` excluding the `.env` file.

---

## Emoji Picker — Transactions & Recurring

### What was added

Both `TransactionModal` and `RecurringModal` now include a 36-emoji scrollable grid picker.

**Emoji list (same in both modals):**
```
💼 💰 💵 🏦 📈 💳
🍔 🍕 🍜 ☕ 🥡 🧃
🚗 🚌 ✈️ 🛵 ⛽ 🚂
🛍️ 👗 💻 📱 🎁 👟
🏠 💡 💧 📺 🌐 🎬
🎮 🎵 🏋️ 💊 🐾 🎉
```

**Behavior:**
- Tapping an emoji selects it (highlighted with primary color border + background)
- Tapping the selected emoji again deselects it (toggle)
- Label shows the selected emoji: `Emoji — 💼 selected` or `Emoji (optional)`
- If no emoji is selected, falls back to the category default icon from `categoryConfig`

### Files changed

- `src/components/modals/TransactionModal.jsx` — added emoji grid, wrapped content in ScrollView, `maxHeight: '90%'` on sheet
- `src/components/modals/RecurringModal.jsx` — same additions
- `src/screens/DashboardScreen.jsx` — added `emoji: ''` to `transactionForm` and `recurringForm` state; added `emoji` to insert/update payloads; loads emoji when opening edit
- `src/components/dashboard/TransactionsSection.jsx` — `{item.emoji || catIcon}` so custom emoji overrides category default
- `src/lib/recurringEngine.js` — copies `emoji` from recurring template when auto-inserting transactions

### Required Supabase SQL

```sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS emoji text;
ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS emoji text;
```

---

## Bug Fix — Delete Button Did Nothing on Web

### Root cause

`Alert.alert` from React Native Web does not fire button callbacks. When the user clicked Delete on any item, the confirmation dialog was called but the `onPress` callback of the "Delete" button never executed — silently doing nothing.

### Fix — Custom `ConfirmModal`

Replaced all four delete handlers with a custom `ConfirmModal` component that works identically on web and native.

**`src/components/common/ConfirmModal.jsx`** — new file:
- Centered modal card with a red `TriangleAlert` icon
- `title`, `message`, Cancel, and Delete buttons
- Used by all four delete handlers: transaction, budget, goal, space

**`src/screens/DashboardScreen.jsx`** changes:
- Added `confirmModal` state: `{ visible, title, message, onConfirm }`
- `confirmDelete(title, message, onConfirm)` helper sets the modal state
- All four `handleDelete*` functions now call `confirmDelete()`
- `<ConfirmModal>` rendered in the JSX alongside other modals
- `Platform` import removed (no longer needed)

---

## Personal Space — Default for All Accounts

### Behavior

- `RegisterScreen` already auto-creates a Personal space on sign-up (was in place from Session 2)
- `loadDashboard` now also provisions it for **existing accounts** that don't have one
- Personal space is always **sorted first** in the spaces pill list
- The default active space on login is always the Personal space
- Delete button is hidden when `activeSpace.type === 'personal'` (handled in `SpacesSection`)
- DB delete query has `.neq('type', 'personal')` as a safety guard

### Logic added to `loadDashboard`

```js
let personalSpace = formattedSpaces.find((s) => s.type === 'personal');
if (!personalSpace) {
  // auto-provision for existing accounts
  const { data: newPersonal } = await supabase
    .from('spaces')
    .insert([{ name: 'Personal', type: 'personal', owner_id: user.id, emoji: '💰' }])
    .select().single();
  await supabase.from('space_members').insert([{ space_id: newPersonal.id, user_id: user.id }]);
  personalSpace = newPersonal;
  formattedSpaces = [newPersonal, ...formattedSpaces];
} else {
  formattedSpaces = [personalSpace, ...formattedSpaces.filter((s) => s.type !== 'personal')];
}
```

### Required Supabase SQL (for existing manually-created Personal spaces)

```sql
UPDATE spaces SET type = 'personal' WHERE name = 'Personal' AND type != 'personal';
```

---

## Google OAuth Login

### What was added

Google sign-in button added to both `LoginScreen` and `RegisterScreen`, below the existing email/password form with an "or continue with" divider.

**Button design:**
- White button with border
- Blue "G" letter (Google brand color `#4285F4`)
- "Continue with Google" text
- Spinner while OAuth redirect is in progress

### How it works (web)

1. User taps "Continue with Google"
2. `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://spendieapp.vercel.app' } })` redirects to Google
3. Google authenticates and redirects back to `https://spendieapp.vercel.app`
4. Supabase JS v2 with `detectSessionInUrl: true` parses the `#access_token` from the URL hash
5. `App.js` `onAuthStateChange` fires → user is routed to Dashboard

### First-time OAuth users

OAuth users skip `RegisterScreen` and never get a profile row or Personal space created. Fixed in `loadDashboard`:

```js
const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
if (!existingProfile) {
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  await supabase.from('profiles').insert([{ id: user.id, full_name: fullName, email: user.email }]);
}
// Personal space auto-provisioning already handles the space
```

### Files changed

- `src/screens/LoginScreen.jsx` — Google OAuth button + `handleGoogleLogin`
- `src/screens/RegisterScreen.jsx` — same
- `src/lib/supabaseClient.web.js` — `detectSessionInUrl: false` → `true`
- `src/screens/DashboardScreen.jsx` — profile auto-creation for OAuth users

### Supabase setup required

1. **Supabase Dashboard → Authentication → Providers → Google** — enable, paste Client ID + Client Secret
2. **Authentication → URL Configuration → Redirect URLs** — add `https://spendieapp.vercel.app`

### Google Cloud Console setup required

- Application type: **Web application**
- Authorized JavaScript origins: `https://spendieapp.vercel.app`
- Authorized redirect URIs: `https://beglfgorbbomyjzmgtbi.supabase.co/auth/v1/callback`

### Note on test users

Google OAuth app is in **Testing** mode by default. Only emails added to the test users list can sign in. Either add user emails under **OAuth consent screen → Test users**, or publish the app.

### Apple OAuth

Apple sign-in was added then removed at the user's request. Apple requires a paid Apple Developer account ($99/yr) for OAuth setup.

---

## GitHub Push

### Repo

`https://github.com/Haniel023/Spendie_v2`

### Key decisions

- `.env` is in `.gitignore` — credentials never reach GitHub
- `Co-Authored-By` attribution was removed from the commit via `git commit --amend` + `git push --force`
- Branch: `main`

### `README.md` created

Comprehensive README covering:
- Full feature list
- Tech stack table
- Complete file structure tree
- Full database schema (all tables and columns including `emoji` fields)
- Setup instructions (clone → .env → SQL → run → deploy)
- PWA install instructions (iOS and Android)
- Service worker cache strategy
- Cross-platform notes (Alert, Picker, Charts, session storage)

---

## Bug Fix — White Screen / Missing Supabase Env Vars

### Root cause

Adding `.env` to `.gitignore` caused the Vercel CLI to stop uploading it (CLI respects `.gitignore` by default). Without the `.env` file on Vercel's build server, Metro bundled `undefined` for both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The Supabase client throws on initialization → white screen.

This was masked in earlier sessions because `.env` was not yet gitignored.

### Fix — `.vercelignore`

Created `.vercelignore` at the project root. When this file exists, Vercel CLI uses it instead of `.gitignore`. It excludes everything the same as `.gitignore` **except `.env`**, so:

- `.env` is excluded from git (safe — credentials never in GitHub)
- `.env` is uploaded to Vercel CLI builds (correct — credentials available during Expo export)

### OAuth redirect bug

After Google auth, users were being redirected to `localhost:3000` instead of the app. Cause: `window.location.origin` was used as the `redirectTo` value, which returned `localhost:3000` when tested locally.

**Fix:** Hardcoded `redirectTo: 'https://spendieapp.vercel.app'` — always redirects to production regardless of where the button was clicked.

### Service worker cache bump

Bumped `public/sw.js` cache name from `spendie-v1` → `spendie-v2` to force invalidation of any stale cached JS bundles from broken deployments.

---

## File Changes This Session

```
D:\10_VSC\ReactJS\Spendie_App\
├── .gitignore                          ← added .env entry
├── .vercelignore                       ← NEW: mirrors .gitignore but allows .env
├── README.md                           ← NEW: full project documentation
├── SESSION_5_NOTES.md                  ← NEW: this file
├── public/
│   └── sw.js                          ← cache bumped spendie-v1 → spendie-v2
└── src/
    ├── lib/
    │   ├── recurringEngine.js          ← forwards emoji to auto-inserted transactions
    │   └── supabaseClient.web.js      ← detectSessionInUrl: false → true
    ├── screens/
    │   ├── DashboardScreen.jsx         ← emoji in forms; confirmDelete helper; personal space provisioning; OAuth profile creation
    │   ├── LoginScreen.jsx             ← Google OAuth button
    │   └── RegisterScreen.jsx         ← Google OAuth button
    └── components/
        ├── common/
        │   └── ConfirmModal.jsx        ← NEW: custom delete confirmation modal
        ├── dashboard/
        │   └── TransactionsSection.jsx ← item.emoji || catIcon
        └── modals/
            ├── TransactionModal.jsx    ← emoji picker grid + ScrollView
            └── RecurringModal.jsx      ← emoji picker grid + ScrollView
```
