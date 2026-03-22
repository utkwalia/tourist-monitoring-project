# SafePath - Smart Tourist Safety Application

SafePath is a high-performance, mobile-first web application engineered as a personal safety companion for travelers and tourists. Armed with state-of-the-art geolocation mechanics, encrypted document storage, offline-first capabilities, and instantaneous emergency broadcasting, SafePath guarantees user safety through a beautiful and highly responsive glassmorphism UI.

## 🚀 Key Features

### 📍 Precision Geolocation & Tracking
- **Adaptive Tracking Profiles**: Dynamically adjusts polling rates depending on activity (walking, driving, stationary) to conserve device battery and maintain precise accuracy.
- **Geofencing & Safe Zones**: Users can draw completely custom vector polygons (Safe Zones & Restricted Zones) on the map interface. The app automatically pushes location-breach warnings when wandering out of safe boundaries or stumbling into defined hazardous ones.
- **Offline Tracking Buffer**: If the user goes off the grid or enters a dead zone (e.g. underground metro), GPS tracking continues to log to the `localStorage` queue. Once reconnected to the internet, these logs are automatically batched and pushed natively.

### 🚨 Critical Emergency Systems
- **Slide-to-SOS Interface**: Built natively into the application header to avoid accidental taps—simply slide right to arm standard or silent alarms.
- **Hardware Integrations**: Hooks deeply into iOS and Android's native haptic engines via Capacitor to provide silent, tactile confirmation when alerts are armed.
- **Silent SOS Output**: Allows the user to discreetly dial emergency contacts without flashing the screen or sounding the siren audio.
- **Supabase Realtime Sync**: A host's SOS broadcast leverages extremely low-latency Supabase channels, instantly alerting linked tracking endpoints the precise millisecond an alarm is confirmed (bypassing the traditional loop requirements of hardware GPS coordinate shifts).

### 👥 "Guest Mode" Live Monitoring
- **Live Location Sharing**: The host user can rapidly generate an encrypted `#emergency-share=` token link (validating over customizable time restrictions).
- **Hardened Guest Preemption**: Unauthenticated guests clicking the designated link are fed directly into a purely read-only viewport.
- **Isolated State**: The UI dynamically strips away controls, settings, side panels, and locks the Leaflet drawing interactions. It automatically subscribes to the host's Supabase broadcast channel, tracking their position instantly across global distances.

### 🔒 Secure Vault
- **Row Level Security (RLS)**: Documents, passports, and visas are pushed directly into a fully isolated Supabase Storage bucket. Access is strictly governed by cryptographic UUID isolation.
- **Silent Fail-Safes**: Explicitly crafted to reject and loudly alert users if unauthorized read/delete processes are executed.

### 🌙 Environmental UX
- **Night Vision Mode**: Instantly shifts the entire UI to a deep, low-luminosity red to preserve the user's rod cells/natural night vision.
- **Device Theme Sync**: Full, graceful interoperability handling light/dark preferences.
- **PWA Ready**: Completely standalone architecture ready for Progressive Web Application (PWA) framing.

---

## 🛠 Technologies & Architecture

SafePath is designed to be extraordinarily fast, completely free of bulky component libraries, and natively portable.

### Frontend
* **Vanilla JavaScript (ES6+)**: Delivers blistering speeds and strict execution flow without the massive overhead of React or Angular. 
* **HTML5 / CSS3**: Built with native flexbox/grid architecture enforcing a premium, universally responsive, Frosted-Glass aesthetic suite.
* **Leaflet.js**: Lightweight and massively modular interactive maps.
* **Geoman.js (`leaflet.pm`)**: Enables dynamic polygon map drawing mechanisms for customized Geofencing.

### Backend & Cloud Sync
* **Supabase**: Open-source Firebase alternative serving as the absolute central nervous system.
* **Supabase Auth**: JWT-driven user authentication.
* **Supabase Realtime**: WebSocket-powered live coordinate data broadcasting (bypassing heavy database insert costs).
* **Supabase PostgreSQL**: Database scaling and RLS rule enforcement.
* **Supabase Storage**: Powering the user Secure Vault mechanisms.

### Native Integration Wrapper
* **Capacitor**: While primarily web-facing, the architecture is specifically injected with modular Capacitor logic to leverage hardware-level GPS fallbacks and device Haptics directly if wrapped into an APK or IPA format.

---

## 🏗 Setup & Deployment

1. **Clone the Repository**
2. **Environment Setup**: Define your database URL globally within the Supabase initialization block on `app.js`. Ensure you deploy with your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. **Database Rules**: Active instances require RLS policies specifically granting `INSERT`, `SELECT`, and explicitly `DELETE` targeting the authenticated `auth.uid()`.
4. **Execution**: SafePath natively spins up over standard HTTP web servers (`LiteServer`, `Vite`, `Live Server`).