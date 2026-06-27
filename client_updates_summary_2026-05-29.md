# Raft v2.0 - Core Feature Enhancements Summary
**Log Date: May 29, 2026**

This document outlines the latest updates and usability improvements delivered for the Raft Bitcoin tool.

---

## 1. Dashboard Connection (Onboarding → Dashboard)
* **Problem Solved**: The onboarding process ended without presenting a visible dashboard, preventing users from instantly seeing their core metrics (runway, stacking capacity) after providing their financial data.
* **The Solution**:
  - The application is now fully wired so that upon completing or skipping the onboarding flow, all entered data is captured and immediately populated into the Dashboard.
  - The dashboard recalculates on every render and directly presents the Status Card, Liquidity Card, Bills Card, Wallet Sweep, What-If Testing, and Tax Awareness based on the user's initial input.
  - On subsequent visits, if valid user data exists locally, the onboarding flow is bypassed entirely, opening directly to the user's dashboard.

---

## 2. PWA Foundation
* **Problem Solved**: Without a service worker or manifest, Raft could not be installed natively on mobile devices and lacked the ability to send local push notifications when the app was closed.
* **The Solution**:
  - Transformed the app into a fully installable Progressive Web App (PWA) with a `manifest.json`.
  - Created a robust Service Worker (`sw.js`) that handles caching for offline functionality (with live Bitcoin prices degrading gracefully).
  - Designed a local mirror mechanism that safely synchronizes user state into IndexedDB, granting the Service Worker secure access to calculate notifications in the background.

---

## 3. Runway Threshold Alert (Heartbeat)
* **Problem Solved**: Users had no way of knowing if their fiat runway dropped dangerously low without proactively opening the application. 
* **The Solution**:
  - Implemented a background notification system via the Service Worker that periodically checks the user's runway metric.
  - Added a customizable "Runway Alert Threshold" (defaulting to 30 days) in the user preferences.
  - If the runway dips below this threshold, a private browser notification informs the user, e.g., "You have X days of runway. You could sell Y BTC to add Z months," bringing immediate awareness to thin fiat margins.

---

## 4. Bill-Due-Tomorrow Alert (Heartbeat)
* **Problem Solved**: Remembering specific due dates for tracked bills was a manual burden.
* **The Solution**:
  - The Service Worker now runs a daily background check comparing today's date against the `dayOfMonth` value for all registered bills.
  - Generates a simple, private notification summarizing any bills due the next day, such as "Tomorrow: Rent ($1,200) and Internet ($60)."

---

## 5. Payday Pulse
* **Problem Solved**: Payday is a critical moment for financial decision-making, but users lacked a singular, calm summary of their capacity and runway at that exact time.
* **The Solution**:
  - Built an animated "Payday Pulse" card that automatically renders at the top of the dashboard on dates matching the user's active pay frequencies.
  - The card clearly summarizes the user's runway, actionable stacking capacity (in sats), and overall goal progress.
  - Extended this to the Service Worker to also fire a background notification on payday with this exact same summary, ensuring users stay informed without feeling pressured.

---

## 6. QR Code Cross-Device Transfer
* **Problem Solved**: Moving local application state between devices (e.g., desktop to mobile) required manually exporting and importing a JSON file, which felt cumbersome.
* **The Solution**:
  - Integrated `qrcode` and `html5-qrcode` to enable a seamless "Device Transfer" feature in Settings.
  - **Send Mode**: Compresses the current application state into a QR code payload (displayed for a secure 60-second window). If a passphrase lock is enabled, this payload is encrypted.
  - **Receive Mode**: Accesses the device camera to scan the QR code and instantly populates the local state.
  - This guarantees a fast, entirely local, and highly private migration experience without ever relying on an external server or account.
