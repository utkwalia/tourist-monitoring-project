# SafePath - Smart Tourist Safety Application

SafePath is a mobile-first safety dashboard for travelers, built with Vanilla JS + Leaflet + Supabase and packaged for Android/iOS via Capacitor.

## 🚀 Key Features

### 🔐 Auth & Sessions
- **Email/Password + Google OAuth (Supabase v2)**.
- **Redirect-safe auth boot**: on load, the app checks existing session and listens to `onAuthStateChange`.
- **Guest-mode bypass preserved** via `#emergency-share=` links.

### 📍 Map, Tracking & SOS
- Live geolocation marker + map controls.
- Emergency + Silent SOS flows with instant UI/state updates.
- SOS state feeds into safety score in real time.

### 👥 Dynamic Safety Circle (Supabase-backed)
- Safety contacts are **user-specific** (not local-only).
- Contacts are fetched from `safety_contacts` on login/session restore.
- Add contact via **custom themed modal** (dark/light adaptive), remove via per-row action.
- Safety score updates immediately when contacts change.

### 🛡 Dynamic Safe Zones (Supabase-backed)
- Safe zones are **user-specific** and persisted in `safe_zones`.
- Saved zones are fetched and redrawn on map after auth/session load.
- Zone remove action deletes DB row and removes corresponding Leaflet layer.
- “Draw Safe Zone” saves to DB, then refreshes map + list.

### 🧠 Safety Intelligence
- Real-time `calculateSafetyScore()` with deductions for:
  - battery level
  - night hours
  - missing contacts/hotel base
  - active SOS type
  - local hazard toggle
- Score is clamped to `0..100` and rendered as Low/Moderate/High risk.
- Includes console diagnostic breakdown for debugging.

### ⚠️ Hazard Logic (Updated)
- App starts with **no seeded/mock hazards**.
- Hazard penalty is now **user-driven** (Report Nearby Hazard toggle), avoiding startup false negatives.
- Nearby hazard counter resets cleanly before each recalculation.

### 🔒 Secure Vault & Sharing
- Supabase Storage-backed secure vault with user isolation.
- Emergency share flows and guest read-only tracking mode.

### 🌙 Themes & UX
- Dedicated dark/light theme toggles.
- Contact modal adapts instantly to current theme.
- Mobile-safe spacing and responsive behavior for Capacitor WebView.

---

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES modules)
- **Maps**: Leaflet
- **Backend**: Supabase Auth, Postgres, Realtime, Storage
- **Mobile packaging**: Capacitor (Android/iOS)

---

## 🗃 Required Supabase Tables

### `safety_contacts`
- `id` (pk)
- `user_id` (uuid, FK to auth.users.id)
- `first_name` (text)
- `last_name` (text)
- `phone_number` (text)
- `email` (text)
- `company` (text)
- (optional legacy compatibility) `contact_name` (text)

### `safe_zones`
- `id` (pk)
- `user_id` (uuid, FK to auth.users.id)
- `zone_name` (text)
- `zone_data` (json/jsonb)

> RLS should enforce `user_id = auth.uid()` for `SELECT/INSERT/UPDATE/DELETE`.

---

## 🏗 Local Run

1. Install dependencies:
   - `npm install`
2. Start local server:
   - `npm run dev` (or your configured static server)
3. Open app in browser and sign in.

## 📱 Capacitor Run (Android)

1. Sync web assets:
   - `npx cap sync android`
2. Open Android project:
   - `npx cap open android`
3. In Android Studio:
   - wait for Gradle sync
   - select device/emulator
   - run `app`
