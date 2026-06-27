# Raft v2.0 - Core Feature Enhancements Summary
**Log Date: May 26, 2026**

This document outlines the latest updates, design decisions, and security implementations delivered for the Raft Bitcoin tool.

---

## 1. Mobile BTC Price Visibility
* **Problem Solved**: On screen sizes smaller than `640px` (mobile phones and portrait tablets), the live BTC price and currency selector were hidden to avoid navigation crowding. Mobile users were unable to view current Bitcoin rates.
* **The Solution**: 
  - Restructured the navigation header. On mobile screens, a dedicated, compact secondary sub-header bar is displayed directly beneath the main navigation bar.
  - Places the current CoinGecko live Bitcoin price in a clean monospace font on the right.
  - Adds a pulsing green dot indicator next to the price to visually signal real-time status and freshness of API updates.
  - Moves mobile settings and privacy controls into compact icon buttons to avoid cluttering the brand header.

---

## 2. Dynamic Goal Projection (Monthly Stacking vs. Runway Goal)
* **Problem Solved**: The previous system only supported tracking a monthly satoshi capacity target. It did not project a target completion date or allow users to track fiat buffer runway targets (e.g., 6 months of savings).
* **The Solution**:
  - Re-designed the **Goal Tracker** card and modal. Users can now select their tracking type:
    1. **Stacking sats**: Tracks progress towards a monthly capacity target. Shows a target completion projection date calculated as: `(goalSats - currentTotalSats) / monthlyCapacitySats`.
    2. **Fiat runway**: Tracks fiat savings against a runway target in months (e.g., 3, 6, or 12 months). Shows a projection date for when savings will build the target buffer: `(targetRunwayMonths * totalFiatBills - currentFiat) / netCashflow`.
  - Added smart validation: if expenses exceed income or capacity is zero, the projection date displays: *"No projected date yet; your buffer isn’t growing right now."*
  - Shows progress completion percentages dynamically below the radial tracking ring.

---

## 3. Fiat-First Display Toggle
* **Problem Solved**: Some users think primarily in fiat equivalents when managing assets and entering wallet balances, finding sats-only or BTC-only views abstract.
* **The Solution**:
  - Added a display toggle dropdown ("Show in BTC" and "Show in Fiat") in the main navigation header (synced with localStorage).
  - When **Show in Fiat** is active:
    - Wallet cold, liquid, and mobile balances render as their fiat equivalent (e.g., `≈ $3,250` or `≈ €3,000`).
    - Stacking goals display both sats targets and live fiat equivalents: `2,000,000 sats (≈ $1,300)`.
    - What-If simulator amount fields default to fiat currency inputs ($) for all actions (Buy, Sell, Hold).
    - Generates a real-time reactive conversion preview (e.g., `≈ 0.0150 BTC`) below simulator input fields.
  - When **Show in BTC** is active, balances display in native BTC/sats.

---

## 4. Local Passphrase Security Lock
* **Problem Solved**: Unlocked devices or shared computers exposed sensitive financial dashboards to casual snoopers.
* **The Solution**:
  - Implemented an optional lock screen overlay (`<app-security-lock>`) that intercepts the entire UI when active.
  - Utilizes standard browser **Web Crypto API (SHA-256)** to perform local client-side hashing. The plain text passphrase never leaves the device and is never sent to a server.
  - Added a failed-attempt lockout delay (1.5 seconds) to defend against automated brute-forcing.
  - Features an emergency **"Reset Raft"** bypass option on the lock screen that clears all browser cache memory after double confirmation, ensuring no orphaned data remains.
  - Configurable auto-lock inactivity timer (1m, 5m, 15m, 30m, or Never) synced with document-level user interaction events.

---

## 5. Payday Awareness ("Payday Pulse" Banner)
* **Problem Solved**: Payday is the decision-point where users plan cash allocations. The dashboard previously remained static on paydays, requiring manual calculations.
* **The Solution**:
  - Added a paycheck schedule calendar inside the settings modal. Users select paycheck days of the month (1-31) or "Last day of the month" (99).
  - On configured days, the dashboard renders a prominent gradient **"Payday Pulse ⚡"** banner.
  - The banner synthesizes key cashflow data to guide decision-making without suggesting trades:
    > *Today is payday. Your runway is 3.2 months. After your upcoming bills this month ($1,200), you could safely stack 1.4M sats. You're 60% toward your monthly stacking goal.*
  - The banner is dismissible for that day and will not reappear until the next scheduled paycheck date.

---

## 6. Data Backup Awareness Reminders
* **Problem Solved**: Because Raft is a privacy-focused local-first application, browser cache clearing deletes all stored data.
* **The Solution**:
  - **First-Launch Banner**: Displays a warning alert explaining browser cache behavior and prompts the user to export a backup copy.
  - **Monthly Nudge**: Monitors telemetry and displays a gentle alert if more than 30 days have elapsed since the user last executed a wallet data backup export.
