<div align="center">
  <h1>🛡️ SafePath</h1>
  <p><strong>Smart Tourist Safety & Monitoring Ecosystem</strong></p>
  <p>Explore freely. Return safely. A beautifully crafted, cross-platform safety application designed to protect travelers with real-time intelligence, ambient tracking, and deep system integrations.</p>
</div>

---

## 🌟 Key Features

* **Advanced Mapping Engine** 🗺️
  * Powered by Leaflet.js with CartoDB Voyager and Dark Matter tile layers.
  * Dynamically syncs map layers with the global application theme.
  * Real-time GPS tracking with accuracy mapping and cached-signal fallbacks.

* **Dynamic Glassmorphism UI** 🌔
  * Premium, responsive interface built with pure Vanilla CSS and JavaScript.
  * Seamless light-to-dark mode transitions with real-time UI token swapping.
  * Perfectly adaptive layouts built to feel native on desktop browsers, tablets, and mobile devices (Android/iOS).

* **Threat Intelligence & Safe Zones** 🚨
  * **Risk Overlays**: Automatically generates expanding risk heatmaps based on area reports.
  * **Smart Geofencing**: Drop "Safe Zones" or designate a "Hotel Base". The app automatically prompts logic checks if you leave these zones late at night.
  * **Shadow Track**: High-risk stealth mode that increases background telemetry pacing.
  
* **Emergency & SOS Arsenal** 🚑
  * **Slide-to-SOS**: Physical slider to prevent accidental emergency triggers, featuring critical-action arming and double-tap validations.
  * **Silent SOS**: "Stealth ON" mode that quietly pings your safety circle without triggering visual or auditory alarms to bystanders.
  * **Language Bridge**: Instantly generates localized, phonetically translated help-phrases and text-to-speech audio based on your GPS country detecting.

* **Privacy & Trust Layer** 🔐
  * **Secure Vault**: On-device AES-GCM encrypted document storage (for passports, IDs).
  * **Audit Trail**: Every critical action, geofence breach, or setting toggle is chronologically logged locally.

---

## 🛠️ Technology Stack

SafePath is built with a strictly "vanilla-first" approach for maximum performance and portability, wrapped tightly with native bridging tools.

**Frontend:**
- **HTML5 & CSS3**: Pure, framework-free Glassmorphism design system.
- **Vanilla JavaScript (ES6+)**: Handles all state management, routing, theme switching, and local cryptography natively.
- **Leaflet.js**: Lightweight, high-performance mapping core.

**Native Shell / Mobile:**
- **CapacitorJS**: Wraps the vanilla web application into compiled, native iOS and Android applications. Includes plugins for native Geolocation, Camera, and Push Notifications.

**Backend / Microservices:**
- **Node.js & Express**: A lightweight event API (`simple-server.js`) for logging telemetries and off-device tracking.

---

## 🚀 Running the App

### 1. Web Local Preview
To run the fully-functional web version locally, simply serve the root directory or the `public/` directory using an HTTP server of your choice:
```bash
# Using Node (if installed)
npx serve .

# Using Python
python3 -m http.server 5500
```
Then navigate to `http://localhost:5500/index.html`.

### 2. Running on Android natively
Since the application uses Capacitor, it is equipped to run effortlessly in Android Studio.
```bash
# Sync the latest web assets to the Android project folder
npm install
npx cap sync android

# Open Android Studio 
npx cap open android
```
*(In Android Studio, let Gradle sync complete, select your connected Android device or emulator, and press ▶ Run).*

### 3. Running on iOS natively
```bash
# Sync the latest web assets to the iOS project folder
npm install
npx cap sync ios

# Open Xcode
npx cap open ios
```
*(In Xcode, select your iPhone or iOS Simulator, and press ▶ Play).*

---

## 🎨 Theme & Typography

SafePath heavily utilizes carefully curated gradients and dynamic CSS variables to produce its aesthetic. 
- **Typography:** Uses Google Fonts (`Inter`, `Lexend`, and `Roboto Mono`) to provide distinct textual hierarchy between readable metrics and large dashboard readouts.
- **Micro-interactions:** Every button and container features subtle CSS hover transitions, back-drop filters, and transform animations to produce a premium "alive" sensation.

---
> **Disclaimer:** This application is configured to run in "Demo Mode" by default. Ensure adequate notification infrastructure is wired via Capacitor if deploying into environments requiring live external SMS/Push alerts.